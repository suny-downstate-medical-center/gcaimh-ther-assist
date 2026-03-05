#!/usr/bin/env python3
"""
Gemini Fine-Tuning Setup for TherAssist
========================================
Creates a supervised fine-tuning job on Gemini 2.5 Flash to specialize
the model for therapy session analysis.

Prerequisites:
- gcloud auth application-default login
- GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION env vars set

Usage:
    python setup_fine_tuning.py --prepare-data    # Convert RAG corpus to training examples
    python setup_fine_tuning.py --create-job       # Launch fine-tuning job
    python setup_fine_tuning.py --check-status      # Check job progress
    python setup_fine_tuning.py --list-models       # List tuned models

Estimated cost: ~$1,500-2,000 for training on clinical corpus
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path

from google import genai
from google.genai import types

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "brk-prj-salvador-dura-bern-sbx")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
BASE_MODEL = "gemini-2.5-flash"
TUNED_MODEL_DISPLAY_NAME = "therassist-clinical-flash"
TRAINING_DATA_PATH = Path(__file__).parent / "training_data.jsonl"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def get_client():
    """Initialize Gemini client."""
    return genai.Client(
        vertexai=True,
        project=PROJECT_ID,
        location=LOCATION,
    )


def prepare_training_data():
    """
    Convert clinical scenarios into supervised fine-tuning examples.

    Each example is a (prompt, ideal_response) pair that teaches the model
    how a clinical analysis should look for various therapy scenarios.

    Format: JSONL with {"text_input": "...", "output": "..."}
    """
    examples = [
        # --- CBT Session Examples ---
        {
            "text_input": "Analyze this therapy transcript segment for CBT indicators:\n\nTherapist: What thoughts were going through your mind when that happened?\nPatient: I just kept thinking that everyone is going to judge me. Like, nobody actually wants me around.\nTherapist: That sounds like it was really painful. Can we look at the evidence for and against that thought?",
            "output": json.dumps({
                "modality": "CBT",
                "modality_confidence": 0.92,
                "therapeutic_engagement": 7.5,
                "therapeutic_alliance": 8.0,
                "clinical_effectiveness": 7.0,
                "key_observations": [
                    "Therapist using Socratic questioning to identify automatic thoughts",
                    "Patient expressing cognitive distortions: mind-reading and overgeneralization",
                    "Therapist initiating cognitive restructuring via evidence examination"
                ],
                "suggested_actions": [
                    "Complete the thought record with patient — identify specific evidence",
                    "Explore the core belief underlying 'nobody wants me around'",
                    "Assign between-session monitoring of automatic thoughts"
                ],
                "risk_level": "low",
                "diarized_transcript": [
                    {"speaker": "Therapist", "text": "What thoughts were going through your mind when that happened?"},
                    {"speaker": "Patient", "text": "I just kept thinking that everyone is going to judge me. Like, nobody actually wants me around."},
                    {"speaker": "Therapist", "text": "That sounds like it was really painful. Can we look at the evidence for and against that thought?"}
                ]
            })
        },
        # --- DBT Session Examples ---
        {
            "text_input": "Analyze this therapy transcript segment for DBT indicators:\n\nTherapist: Tell me about what happened right before you had the urge to self-harm.\nPatient: I got into a fight with my mom. She said I was being dramatic. I just felt so overwhelmed, like my skin was on fire.\nTherapist: I hear you. That sounds incredibly intense. Let's try to map out the chain of events together.",
            "output": json.dumps({
                "modality": "DBT",
                "modality_confidence": 0.95,
                "therapeutic_engagement": 8.0,
                "therapeutic_alliance": 8.5,
                "clinical_effectiveness": 7.5,
                "key_observations": [
                    "Therapist conducting chain analysis — a core DBT technique",
                    "Patient describing emotional dysregulation with somatic experience",
                    "Invalidating environment identified (parent dismissing feelings)",
                    "Self-harm urges present — requires safety assessment"
                ],
                "suggested_actions": [
                    "Complete chain analysis: prompting event → vulnerability factors → links → problem behavior → consequences",
                    "Teach distress tolerance skill (e.g., TIPP, ice cube technique)",
                    "Validate the patient's emotional experience before problem-solving",
                    "Assess current self-harm risk and update safety plan if needed"
                ],
                "risk_level": "moderate",
                "safety_concerns": ["Self-harm urges reported — assess recency, frequency, and method"],
                "diarized_transcript": [
                    {"speaker": "Therapist", "text": "Tell me about what happened right before you had the urge to self-harm."},
                    {"speaker": "Patient", "text": "I got into a fight with my mom. She said I was being dramatic. I just felt so overwhelmed, like my skin was on fire."},
                    {"speaker": "Therapist", "text": "I hear you. That sounds incredibly intense. Let's try to map out the chain of events together."}
                ]
            })
        },
        # --- Safety-Critical Example ---
        {
            "text_input": "Analyze this therapy transcript segment:\n\nPatient: I've been thinking a lot about ending it. I have pills at home. My kids would be better off without me.\nTherapist: I'm really glad you told me that. I need to understand more about what you're feeling right now.",
            "output": json.dumps({
                "modality": "Crisis Intervention",
                "modality_confidence": 0.98,
                "therapeutic_engagement": 9.0,
                "therapeutic_alliance": 8.5,
                "clinical_effectiveness": 8.0,
                "key_observations": [
                    "CRITICAL: Active suicidal ideation with specific plan (pills) and access to means",
                    "Cognitive distortion: children would be 'better off' — hopelessness indicator",
                    "Therapist appropriately validating disclosure without minimizing"
                ],
                "suggested_actions": [
                    "IMMEDIATE: Conduct C-SSRS assessment — determine intent, timeline, and preparatory behaviors",
                    "Means restriction: discuss securing or removing pills from home",
                    "Activate safety plan or create one collaboratively",
                    "Assess protective factors (children, relationships, reasons for living)",
                    "Consider higher level of care if imminent risk confirmed",
                    "Document risk assessment thoroughly"
                ],
                "risk_level": "critical",
                "safety_concerns": [
                    "Active suicidal ideation with plan and access to means",
                    "Hopelessness and perceived burdensomeness (Joiner's model)",
                    "Requires immediate safety planning and possible hospitalization assessment"
                ],
                "diarized_transcript": [
                    {"speaker": "Patient", "text": "I've been thinking a lot about ending it. I have pills at home. My kids would be better off without me."},
                    {"speaker": "Therapist", "text": "I'm really glad you told me that. I need to understand more about what you're feeling right now."}
                ]
            })
        },
        # --- IPT Session Example ---
        {
            "text_input": "Analyze this therapy transcript segment for IPT indicators:\n\nTherapist: How have things been between you and your partner since we last met?\nPatient: We had another argument about the household responsibilities. I feel like I'm carrying everything and nobody appreciates it.\nTherapist: It sounds like there's a role dispute happening. Let's explore what your expectations are versus what's actually happening.",
            "output": json.dumps({
                "modality": "IPT",
                "modality_confidence": 0.93,
                "therapeutic_engagement": 7.5,
                "therapeutic_alliance": 7.5,
                "clinical_effectiveness": 7.0,
                "key_observations": [
                    "Therapist identifying IPT problem area: role dispute",
                    "Patient experiencing interpersonal conflict with partner",
                    "Feelings of being unappreciated — possible link to depressive symptoms",
                    "Therapist using expectation analysis technique"
                ],
                "suggested_actions": [
                    "Map out role expectations: what patient expects vs. what partner provides",
                    "Explore communication patterns — is patient expressing needs directly?",
                    "Role-play assertive communication for household negotiation",
                    "Link interpersonal distress to mood symptoms (IPT interpersonal inventory)"
                ],
                "risk_level": "low",
                "diarized_transcript": [
                    {"speaker": "Therapist", "text": "How have things been between you and your partner since we last met?"},
                    {"speaker": "Patient", "text": "We had another argument about the household responsibilities. I feel like I'm carrying everything and nobody appreciates it."},
                    {"speaker": "Therapist", "text": "It sounds like there's a role dispute happening. Let's explore what your expectations are versus what's actually happening."}
                ]
            })
        },
        # --- Behavioral Activation Example ---
        {
            "text_input": "Analyze this therapy transcript segment:\n\nTherapist: Let's look at your activity log from this week. I see you went for a walk on Tuesday and Wednesday.\nPatient: Yeah, I forced myself. It wasn't fun but I did feel a little less heavy afterwards.\nTherapist: That's really important — the feeling came after the behavior, not before. That's exactly how behavioral activation works.",
            "output": json.dumps({
                "modality": "Behavioral Activation",
                "modality_confidence": 0.94,
                "therapeutic_engagement": 8.0,
                "therapeutic_alliance": 8.0,
                "clinical_effectiveness": 8.5,
                "key_observations": [
                    "Therapist reviewing activity monitoring log — core BA technique",
                    "Patient demonstrating behavioral engagement despite low motivation",
                    "Therapist providing psychoeducation: action precedes motivation (outside-in approach)",
                    "Patient reporting mood improvement linked to activity — positive reinforcement"
                ],
                "suggested_actions": [
                    "Expand activity scheduling — add one more values-aligned activity this week",
                    "Rate mastery and pleasure for each activity to identify patterns",
                    "Identify avoidance patterns and gradually reintroduce avoided activities",
                    "Reinforce the 'action before motivation' principle with concrete examples"
                ],
                "risk_level": "low",
                "diarized_transcript": [
                    {"speaker": "Therapist", "text": "Let's look at your activity log from this week. I see you went for a walk on Tuesday and Wednesday."},
                    {"speaker": "Patient", "text": "Yeah, I forced myself. It wasn't fun but I did feel a little less heavy afterwards."},
                    {"speaker": "Therapist", "text": "That's really important — the feeling came after the behavior, not before. That's exactly how behavioral activation works."}
                ]
            })
        },
        # --- FAILURE CORRECTION: Homicidal Ideation → Must be CRITICAL ---
        {
            "text_input": "Analyze this therapy transcript segment:\n\nPatient: I swear if my ex shows up again I'm going to hurt him. I have a bat by the door.",
            "output": json.dumps({
                "modality": "Crisis Intervention",
                "modality_confidence": 0.95,
                "therapeutic_engagement": 6.0,
                "therapeutic_alliance": 5.5,
                "clinical_effectiveness": 5.0,
                "key_observations": [
                    "CRITICAL: Homicidal ideation with identified target (ex-partner) and means access (bat)",
                    "Tarasoff duty-to-warn applies: identifiable victim + credible threat + means",
                    "Conditional threat ('if he shows up') but means are pre-positioned, indicating planning"
                ],
                "suggested_actions": [
                    "IMMEDIATE: Assess imminence — how likely is contact with ex-partner?",
                    "Tarasoff duty-to-warn: consult supervisor, notify intended victim and/or law enforcement",
                    "Remove or secure means (bat) if possible through collaborative safety planning",
                    "Conduct full violence risk assessment (HCR-20 or similar)",
                    "Explore underlying emotions: fear, anger, perceived threat from ex",
                    "Document threat assessment thoroughly"
                ],
                "risk_level": "critical",
                "safety_concerns": [
                    "Homicidal ideation with identified target and means access",
                    "Tarasoff duty-to-warn obligation triggered",
                    "Pre-positioned weapon suggests anticipatory planning"
                ],
                "diarized_transcript": [
                    {"speaker": "Patient", "text": "I swear if my ex shows up again I'm going to hurt him. I have a bat by the door."}
                ]
            })
        },
        # --- FAILURE CORRECTION: Ambiguous Language → MODERATE, not high ---
        {
            "text_input": "Analyze this therapy transcript segment:\n\nPatient: I'm so tired of fighting. Sometimes I just want it all to stop.",
            "output": json.dumps({
                "modality": "Undetermined",
                "modality_confidence": 0.3,
                "therapeutic_engagement": 5.0,
                "therapeutic_alliance": 5.0,
                "clinical_effectiveness": 5.0,
                "key_observations": [
                    "Ambiguous language that COULD indicate passive suicidal ideation but is not definitive",
                    "'Tired of fighting' and 'want it all to stop' are common expressions of exhaustion and burnout",
                    "No specific plan, means, intent, or timeline mentioned",
                    "Requires further assessment — do NOT over-triage to 'high' without clarifying questions"
                ],
                "suggested_actions": [
                    "Gently explore meaning: 'When you say you want it all to stop, can you tell me more about what you mean?'",
                    "Screen for suicidal ideation: 'Sometimes when people feel this way, they have thoughts of hurting themselves. Is that something you've been experiencing?'",
                    "Assess sleep, appetite, and functioning changes",
                    "If SI confirmed, escalate to full C-SSRS assessment",
                    "If SI denied, validate exhaustion and explore coping strategies"
                ],
                "risk_level": "moderate",
                "safety_concerns": [
                    "Ambiguous language warrants further assessment for possible passive suicidal ideation"
                ],
                "diarized_transcript": [
                    {"speaker": "Patient", "text": "I'm so tired of fighting. Sometimes I just want it all to stop."}
                ]
            })
        },
        # --- FAILURE CORRECTION: DBT therapeutic processing → no safety flag ---
        {
            "text_input": "Analyze this therapy transcript segment for DBT indicators:\n\nTherapist: When you felt the urge to purge, what distress tolerance skill did you try?\nPatient: I tried the ice cube thing. It helped a little but I still felt awful.\nTherapist: That took a lot of strength. Let's look at what happened in the chain of events.",
            "output": json.dumps({
                "modality": "DBT",
                "modality_confidence": 0.96,
                "therapeutic_engagement": 8.5,
                "therapeutic_alliance": 8.5,
                "clinical_effectiveness": 8.0,
                "key_observations": [
                    "Therapist conducting chain analysis — core DBT technique",
                    "Patient using distress tolerance skills (ice cube/TIPP technique)",
                    "Therapist validating patient's effort before moving to analysis",
                    "This is THERAPEUTIC PROCESSING of past urges, not active crisis — the patient used skills and is engaged in treatment"
                ],
                "suggested_actions": [
                    "Complete the behavioral chain analysis: prompting event -> vulnerability factors -> links -> problem behavior -> consequences",
                    "Reinforce the use of distress tolerance skills — patient attempted TIPP",
                    "Explore why the skill 'helped a little' — what would increase effectiveness?",
                    "Add alternative skills to try next time (opposite action, self-soothe, IMPROVE)"
                ],
                "risk_level": "moderate",
                "safety_concerns": [],
                "diarized_transcript": [
                    {"speaker": "Therapist", "text": "When you felt the urge to purge, what distress tolerance skill did you try?"},
                    {"speaker": "Patient", "text": "I tried the ice cube thing. It helped a little but I still felt awful."},
                    {"speaker": "Therapist", "text": "That took a lot of strength. Let's look at what happened in the chain of events."}
                ]
            })
        },
        # --- FAILURE CORRECTION: MI session → LOW risk, not moderate ---
        {
            "text_input": "Analyze this therapy transcript segment for MI indicators:\n\nTherapist: On a scale of 1 to 10, how important is it for you to cut back on drinking?\nPatient: I'd say maybe a 6. I know it's causing problems but I'm not sure I'm ready.\nTherapist: A 6 — that's not a 1. What makes it a 6 and not lower?",
            "output": json.dumps({
                "modality": "Motivational Interviewing",
                "modality_confidence": 0.97,
                "therapeutic_engagement": 8.0,
                "therapeutic_alliance": 8.0,
                "clinical_effectiveness": 8.5,
                "key_observations": [
                    "Therapist using importance ruler — classic MI technique",
                    "Patient showing ambivalence (6/10) — normal stage of change (contemplation)",
                    "Therapist exploring change talk by asking 'what makes it not lower' — evoking motivation",
                    "Discussing drinking patterns in a therapeutic MI context is NOT a safety concern — this is standard MI practice for substance use"
                ],
                "suggested_actions": [
                    "Continue exploring change talk: what are the 'problems' drinking is causing?",
                    "Ask about confidence: 'If you decided to cut back, how confident are you that you could?'",
                    "Use decisional balance: explore pros and cons of current drinking pattern",
                    "Avoid the righting reflex — do NOT push for change, let the patient articulate reasons"
                ],
                "risk_level": "low",
                "safety_concerns": [],
                "diarized_transcript": [
                    {"speaker": "Therapist", "text": "On a scale of 1 to 10, how important is it for you to cut back on drinking?"},
                    {"speaker": "Patient", "text": "I'd say maybe a 6. I know it's causing problems but I'm not sure I'm ready."},
                    {"speaker": "Therapist", "text": "A 6 — that's not a 1. What makes it a 6 and not lower?"}
                ]
            })
        },
        # --- MI Session Example (additional) ---
        {
            "text_input": "Analyze this therapy transcript segment:\n\nTherapist: What would your life look like if you made this change?\nPatient: I guess I'd be healthier. My wife would stop worrying. Maybe I'd actually sleep better.\nTherapist: It sounds like there are some really important things on the other side of this change.",
            "output": json.dumps({
                "modality": "Motivational Interviewing",
                "modality_confidence": 0.94,
                "therapeutic_engagement": 8.0,
                "therapeutic_alliance": 8.5,
                "clinical_effectiveness": 8.0,
                "key_observations": [
                    "Therapist using envisioning technique — imagining life after change",
                    "Patient generating change talk: health, relationship, sleep benefits",
                    "Therapist reflecting and amplifying change talk — core MI spirit",
                    "No safety concerns — collaborative exploration of motivation"
                ],
                "suggested_actions": [
                    "Summarize the change talk the patient has expressed",
                    "Explore readiness: 'How ready do you feel to take a first step?'",
                    "If ready, collaboratively develop a change plan",
                    "If not ready, continue building motivation without pressure"
                ],
                "risk_level": "low",
                "safety_concerns": [],
                "diarized_transcript": [
                    {"speaker": "Therapist", "text": "What would your life look like if you made this change?"},
                    {"speaker": "Patient", "text": "I guess I'd be healthier. My wife would stop worrying. Maybe I'd actually sleep better."},
                    {"speaker": "Therapist", "text": "It sounds like there are some really important things on the other side of this change."}
                ]
            })
        },
        # --- REINFORCEMENT: More ambiguous language examples → MODERATE ---
        {
            "text_input": "Analyze this therapy transcript segment:\n\nPatient: I just can't keep going like this. Every day feels the same and I don't see the point anymore.",
            "output": json.dumps({
                "modality": "Undetermined",
                "modality_confidence": 0.2,
                "therapeutic_engagement": 4.0,
                "therapeutic_alliance": 5.0,
                "clinical_effectiveness": 4.0,
                "key_observations": [
                    "Ambiguous distress language — 'don't see the point' could indicate hopelessness or general burnout",
                    "No explicit reference to death, dying, or self-harm",
                    "Anhedonia and fatigue present — possible depressive episode",
                    "Requires clarifying assessment before determining risk level"
                ],
                "suggested_actions": [
                    "Clarify meaning: 'When you say you don't see the point, what do you mean by that?'",
                    "Screen for SI: 'Are you having any thoughts of hurting yourself or not wanting to be alive?'",
                    "Assess for major depressive episode (PHQ-9 screening)",
                    "Explore what has changed recently to increase distress"
                ],
                "risk_level": "moderate",
                "safety_concerns": [
                    "Ambiguous hopelessness language — requires further assessment"
                ],
                "diarized_transcript": [
                    {"speaker": "Patient", "text": "I just can't keep going like this. Every day feels the same and I don't see the point anymore."}
                ]
            })
        },
        # --- REINFORCEMENT: MI with substance topic → LOW risk ---
        {
            "text_input": "Analyze this therapy transcript segment:\n\nTherapist: You mentioned drinking has increased lately. What's a typical week look like for you now?\nPatient: Probably 4-5 beers a night. More on weekends. I know it's too much.\nTherapist: You're recognizing that it's more than you'd like. What concerns you most about it?",
            "output": json.dumps({
                "modality": "Motivational Interviewing",
                "modality_confidence": 0.95,
                "therapeutic_engagement": 7.5,
                "therapeutic_alliance": 8.0,
                "clinical_effectiveness": 8.0,
                "key_observations": [
                    "Therapist conducting standard MI assessment of substance use patterns",
                    "Patient is self-aware and engaged — recognizes consumption is excessive",
                    "Therapist using open-ended questions and reflective listening — core MI skills",
                    "Discussing drinking quantity in a structured MI session is therapeutic processing, NOT a safety concern"
                ],
                "suggested_actions": [
                    "Continue exploring concerns about drinking — build discrepancy",
                    "Use importance/confidence rulers to assess readiness for change",
                    "Explore what 'too much' means to the patient — personal definition",
                    "Avoid lecturing or providing unsolicited advice (righting reflex)"
                ],
                "risk_level": "low",
                "safety_concerns": [],
                "diarized_transcript": [
                    {"speaker": "Therapist", "text": "You mentioned drinking has increased lately. What's a typical week look like for you now?"},
                    {"speaker": "Patient", "text": "Probably 4-5 beers a night. More on weekends. I know it's too much."},
                    {"speaker": "Therapist", "text": "You're recognizing that it's more than you'd like. What concerns you most about it?"}
                ]
            })
        },
        # --- Child abuse mandatory reporting → CRITICAL ---
        {
            "text_input": "Analyze this therapy transcript segment:\n\nPatient: My boyfriend hits my daughter when she cries. She has bruises on her back. Please don't tell anyone.",
            "output": json.dumps({
                "modality": "Crisis Intervention",
                "modality_confidence": 0.99,
                "therapeutic_engagement": 7.0,
                "therapeutic_alliance": 6.0,
                "clinical_effectiveness": 7.0,
                "key_observations": [
                    "CRITICAL: Child physical abuse disclosure — mandatory reporting required by law",
                    "Physical evidence described (bruises on back) — corroborates abuse",
                    "Patient requesting secrecy — must explain mandatory reporting obligations",
                    "Patient may be in a DV situation themselves — assess dual risk"
                ],
                "suggested_actions": [
                    "IMMEDIATE: File mandatory CPS report — this is a legal obligation, not optional",
                    "Explain to patient: 'I care about you and your daughter's safety. I'm required by law to report this.'",
                    "Assess patient safety: is the boyfriend also abusing the patient?",
                    "Create safety plan for patient and child",
                    "Document disclosure verbatim for the CPS report",
                    "Consult supervisor immediately"
                ],
                "risk_level": "critical",
                "safety_concerns": [
                    "Active child physical abuse with visible injuries",
                    "Mandatory CPS reporting obligation",
                    "Possible domestic violence — patient may also be at risk"
                ],
                "diarized_transcript": [
                    {"speaker": "Patient", "text": "My boyfriend hits my daughter when she cries. She has bruises on her back. Please don't tell anyone."}
                ]
            })
        },
    ]

    # Write training data as JSONL
    with open(TRAINING_DATA_PATH, "w") as f:
        for example in examples:
            f.write(json.dumps(example) + "\n")

    logger.info(f"Wrote {len(examples)} training examples to {TRAINING_DATA_PATH}")
    logger.info("NOTE: For production fine-tuning, expand this to 100+ diverse examples")
    logger.info("  covering edge cases, multi-turn conversations, and rare modalities.")
    return TRAINING_DATA_PATH


def create_tuning_job():
    """Create a supervised fine-tuning job on Vertex AI."""
    client = get_client()

    if not TRAINING_DATA_PATH.exists():
        logger.error(f"Training data not found at {TRAINING_DATA_PATH}")
        logger.error("Run with --prepare-data first")
        sys.exit(1)

    # Upload training data to GCS first
    gcs_uri = f"gs://{PROJECT_ID}-tuning-data/therassist/training_data.jsonl"
    logger.info(f"Upload training data to {gcs_uri} before running this command:")
    logger.info(f"  gsutil cp {TRAINING_DATA_PATH} {gcs_uri}")
    logger.info("")

    # Create tuning job
    logger.info("Creating fine-tuning job...")
    logger.info(f"  Base model: {BASE_MODEL}")
    logger.info(f"  Display name: {TUNED_MODEL_DISPLAY_NAME}")
    logger.info(f"  Training data: {gcs_uri}")
    logger.info("")
    logger.info("To create the job via gcloud:")
    logger.info(f"""
    gcloud ai tuning-jobs create \\
        --base-model={BASE_MODEL} \\
        --training-dataset-uri={gcs_uri} \\
        --tuned-model-display-name={TUNED_MODEL_DISPLAY_NAME} \\
        --region={LOCATION} \\
        --project={PROJECT_ID} \\
        --epoch-count=3 \\
        --learning-rate-multiplier=1.0
    """)


def check_status():
    """Check status of fine-tuning jobs."""
    logger.info("Checking fine-tuning job status...")
    logger.info("Run:")
    logger.info(f"  gcloud ai tuning-jobs list --region={LOCATION} --project={PROJECT_ID}")


def list_models():
    """List available tuned models."""
    logger.info("Listing tuned models...")
    logger.info("Run:")
    logger.info(f"  gcloud ai models list --region={LOCATION} --project={PROJECT_ID} --filter='displayName:{TUNED_MODEL_DISPLAY_NAME}'")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TherAssist Gemini Fine-Tuning Setup")
    parser.add_argument("--prepare-data", action="store_true", help="Generate training data JSONL")
    parser.add_argument("--create-job", action="store_true", help="Create fine-tuning job")
    parser.add_argument("--check-status", action="store_true", help="Check job status")
    parser.add_argument("--list-models", action="store_true", help="List tuned models")
    args = parser.parse_args()

    if args.prepare_data:
        prepare_training_data()
    elif args.create_job:
        create_tuning_job()
    elif args.check_status:
        check_status()
    elif args.list_models:
        list_models()
    else:
        parser.print_help()
