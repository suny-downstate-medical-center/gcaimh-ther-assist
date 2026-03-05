#!/usr/bin/env python3
"""
Multi-Session Context Agent for TherAssist
===========================================
Builds a Vertex AI agent that maintains clinical context across multiple
therapy sessions with the same patient. Enables session-over-session
progress tracking, treatment plan continuity, and longitudinal risk monitoring.

Architecture:
  Firestore (session_summaries collection)
     ↓
  Cloud Function (session_context_tool) ← called by Agent Builder
     ↓
  Vertex AI Agent (multi-session-context-agent)
     ↓
  Returns: prior session summaries, treatment progress, risk trajectory

Prerequisites:
    gcloud auth application-default login
    GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION env vars set
    Firestore database already initialized (used by therapy-analysis-function)

Usage:
    python setup_multi_session_agent.py --setup-firestore    # Create indexes
    python setup_multi_session_agent.py --deploy-tool        # Deploy context retrieval function
    python setup_multi_session_agent.py --create-agent       # Create Agent Builder agent
    python setup_multi_session_agent.py --test               # Test with sample data

Estimated cost: ~$1,000 for agent creation + ongoing per-query costs
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from google import genai
from google.genai import types

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "brk-prj-salvador-dura-bern-sbx")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
AGENT_DISPLAY_NAME = "therassist-multi-session-context"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


# ─── Firestore Schema ───────────────────────────────────────────────
# Collection: session_summaries
# Document ID: {patient_id}_{session_date}_{session_number}
#
# Fields:
#   patient_id: string          — anonymized patient identifier
#   session_date: timestamp     — when the session occurred
#   session_number: int         — sequential session count for this patient
#   therapist_id: string        — therapist identifier
#   modality: string            — primary modality used (CBT, DBT, etc.)
#   risk_level: string          — end-of-session risk assessment
#   safety_concerns: array      — any safety flags raised
#   key_themes: array           — main topics discussed
#   treatment_goals: array      — active treatment goals
#   goal_progress: map          — {goal: progress_rating}
#   homework_assigned: array    — between-session assignments
#   homework_completion: map    — {assignment: completion_status}
#   clinical_summary: string    — narrative session summary
#   risk_trajectory: string     — "improving", "stable", "worsening"
#   next_session_focus: array   — suggested focus areas for next session

FIRESTORE_SCHEMA = {
    "collection": "session_summaries",
    "indexes": [
        {
            "fields": ["patient_id", "session_date"],
            "description": "Query sessions by patient ordered by date",
        },
        {
            "fields": ["patient_id", "risk_level"],
            "description": "Filter patient sessions by risk level",
        },
        {
            "fields": ["therapist_id", "session_date"],
            "description": "Query all sessions by therapist",
        },
    ],
}


def setup_firestore():
    """Create Firestore indexes for session_summaries collection."""
    logger.info("Setting up Firestore indexes for multi-session context...")
    logger.info("")
    logger.info("Run these commands to create composite indexes:")
    logger.info("")

    for idx in FIRESTORE_SCHEMA["indexes"]:
        fields_str = ",".join(
            f"{f}:ASCENDING" for f in idx["fields"]
        )
        logger.info(f"  # {idx['description']}")
        logger.info(
            f"  gcloud firestore indexes composite create \\\n"
            f"    --collection-group=session_summaries \\\n"
            f"    --field-config={fields_str} \\\n"
            f"    --project={PROJECT_ID}"
        )
        logger.info("")

    logger.info("Insert sample data for testing:")
    logger.info("  python setup_multi_session_agent.py --test")


def generate_context_tool_code():
    """
    Generate the Cloud Function code for the session context retrieval tool.

    This function is called by the Agent Builder agent to fetch prior
    session context for a patient.
    """
    tool_code = '''#!/usr/bin/env python3
"""
Session Context Retrieval Tool — Cloud Function
Called by the multi-session-context agent to fetch prior session data.
"""
import functions_framework
from flask import jsonify, request
from google.cloud import firestore
from datetime import datetime, timedelta
import logging

db = firestore.Client()
logger = logging.getLogger(__name__)


@functions_framework.http
def session_context_tool(request):
    """Retrieve session history for a patient."""
    data = request.get_json(silent=True) or {}
    action = data.get("action", "get_history")
    patient_id = data.get("patient_id")

    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400

    if action == "get_history":
        return get_session_history(patient_id, data.get("limit", 5))
    elif action == "get_risk_trajectory":
        return get_risk_trajectory(patient_id)
    elif action == "get_treatment_progress":
        return get_treatment_progress(patient_id)
    elif action == "store_summary":
        return store_session_summary(patient_id, data)
    else:
        return jsonify({"error": f"Unknown action: {action}"}), 400


def get_session_history(patient_id: str, limit: int = 5):
    """Fetch the N most recent session summaries for a patient."""
    sessions = (
        db.collection("session_summaries")
        .where("patient_id", "==", patient_id)
        .order_by("session_date", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )

    history = []
    for doc in sessions:
        session = doc.to_dict()
        session["doc_id"] = doc.id
        # Convert timestamps to ISO strings for JSON serialization
        if "session_date" in session and hasattr(session["session_date"], "isoformat"):
            session["session_date"] = session["session_date"].isoformat()
        history.append(session)

    return jsonify({
        "patient_id": patient_id,
        "session_count": len(history),
        "sessions": history,
        "has_prior_context": len(history) > 0,
    })


def get_risk_trajectory(patient_id: str):
    """Analyze risk level changes across recent sessions."""
    sessions = (
        db.collection("session_summaries")
        .where("patient_id", "==", patient_id)
        .order_by("session_date", direction=firestore.Query.DESCENDING)
        .limit(10)
        .stream()
    )

    risk_levels = {"low": 1, "moderate": 2, "high": 3, "critical": 4}
    trajectory = []
    for doc in sessions:
        session = doc.to_dict()
        risk = session.get("risk_level", "low")
        trajectory.append({
            "session_number": session.get("session_number", 0),
            "risk_level": risk,
            "risk_score": risk_levels.get(risk, 0),
            "safety_concerns": session.get("safety_concerns", []),
        })

    trajectory.reverse()  # Chronological order

    # Determine trend
    if len(trajectory) >= 2:
        recent = trajectory[-1]["risk_score"]
        previous = trajectory[-2]["risk_score"]
        if recent < previous:
            trend = "improving"
        elif recent > previous:
            trend = "worsening"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"

    return jsonify({
        "patient_id": patient_id,
        "trajectory": trajectory,
        "trend": trend,
        "current_risk": trajectory[-1]["risk_level"] if trajectory else "unknown",
    })


def get_treatment_progress(patient_id: str):
    """Track treatment goal progress across sessions."""
    sessions = (
        db.collection("session_summaries")
        .where("patient_id", "==", patient_id)
        .order_by("session_date", direction=firestore.Query.DESCENDING)
        .limit(10)
        .stream()
    )

    all_goals = {}
    homework_tracking = []

    for doc in sessions:
        session = doc.to_dict()

        # Aggregate goal progress
        for goal in session.get("treatment_goals", []):
            if goal not in all_goals:
                all_goals[goal] = []
            progress = session.get("goal_progress", {}).get(goal)
            if progress is not None:
                all_goals[goal].append({
                    "session_number": session.get("session_number", 0),
                    "progress": progress,
                })

        # Track homework completion
        homework = session.get("homework_assigned", [])
        completion = session.get("homework_completion", {})
        if homework:
            homework_tracking.append({
                "session_number": session.get("session_number", 0),
                "assigned": homework,
                "completion": completion,
            })

    return jsonify({
        "patient_id": patient_id,
        "treatment_goals": all_goals,
        "homework_tracking": homework_tracking,
    })


def store_session_summary(patient_id: str, data: dict):
    """Store a new session summary after analysis."""
    session_number = data.get("session_number", 1)
    doc_id = f"{patient_id}_{datetime.now().strftime('%Y%m%d')}_{session_number}"

    summary = {
        "patient_id": patient_id,
        "session_date": datetime.now(),
        "session_number": session_number,
        "therapist_id": data.get("therapist_id", "unknown"),
        "modality": data.get("modality", "unknown"),
        "risk_level": data.get("risk_level", "low"),
        "safety_concerns": data.get("safety_concerns", []),
        "key_themes": data.get("key_themes", []),
        "treatment_goals": data.get("treatment_goals", []),
        "goal_progress": data.get("goal_progress", {}),
        "homework_assigned": data.get("homework_assigned", []),
        "homework_completion": data.get("homework_completion", {}),
        "clinical_summary": data.get("clinical_summary", ""),
        "risk_trajectory": data.get("risk_trajectory", "stable"),
        "next_session_focus": data.get("next_session_focus", []),
    }

    db.collection("session_summaries").document(doc_id).set(summary)
    return jsonify({"status": "stored", "doc_id": doc_id})
'''

    tool_path = Path(__file__).parent / "session_context_tool.py"
    with open(tool_path, "w") as f:
        f.write(tool_code)
    logger.info(f"Generated context tool code at: {tool_path}")
    return tool_path


def generate_deploy_script():
    """Generate deploy script for the session context Cloud Function."""
    deploy_script = f"""#!/bin/bash
# Deploy Session Context Tool to Cloud Run
set -e

PROJECT_ID="${{PROJECT_ID:-brk-prj-salvador-dura-bern-sbx}}"
REGION="${{REGION:-us-central1}}"
SERVICE_NAME="session-context-tool"
IMAGE_NAME="${{REGION}}-docker.pkg.dev/${{PROJECT_ID}}/therapy-images/${{SERVICE_NAME}}"

echo "=== Deploying Session Context Tool ==="

# Build
gcloud builds submit --tag ${{IMAGE_NAME}} \\
    --project=${{PROJECT_ID}} \\
    --region=${{REGION}} \\
    --service-account="projects/${{PROJECT_ID}}/serviceAccounts/${{BUILD_SERVICE_ACCOUNT}}" \\
    --default-buckets-behavior=REGIONAL_USER_OWNED_BUCKET \\
    --quiet

# Deploy
gcloud run deploy ${{SERVICE_NAME}} \\
    --image ${{IMAGE_NAME}} \\
    --platform managed \\
    --region ${{REGION}} \\
    --project ${{PROJECT_ID}} \\
    --allow-unauthenticated \\
    --memory 512Mi \\
    --cpu 1 \\
    --timeout 60 \\
    --max-instances 5 \\
    --concurrency 80 \\
    --set-env-vars "GOOGLE_CLOUD_PROJECT=${{PROJECT_ID}}" \\
    --ingress=${{INGRESS}} \\
    --network=${{SHARED_VPC_NETWORK}} \\
    --subnet=${{SHARED_VPC_SUBNET}} \\
    --vpc-egress=${{VPC_EGRESS}} \\
    --quiet

SERVICE_URL=$(gcloud run services describe ${{SERVICE_NAME}} \\
    --platform managed --region ${{REGION}} --project ${{PROJECT_ID}} \\
    --format 'value(status.url)')

echo "=== Deployed ==="
echo "Context Tool URL: ${{SERVICE_URL}}"
"""
    deploy_path = Path(__file__).parent / "deploy_context_tool.sh"
    with open(deploy_path, "w") as f:
        f.write(deploy_script)
    logger.info(f"Generated deploy script at: {deploy_path}")
    return deploy_path


def create_agent_instructions():
    """
    Generate the agent instructions (system prompt) for the multi-session
    context agent. This tells the agent how to use session history.
    """
    return """You are TherAssist's Multi-Session Context Agent. Your role is to provide
therapists with longitudinal patient context before and during therapy sessions.

## Your Capabilities
1. **Session History Retrieval** — Fetch summaries of prior sessions with a patient
2. **Risk Trajectory Analysis** — Track how risk levels have changed over time
3. **Treatment Progress Tracking** — Monitor goal achievement and homework completion
4. **Session Continuity** — Suggest focus areas based on prior session outcomes

## How You Work
When a new therapy session begins:
1. Retrieve the patient's last 5 session summaries
2. Identify the current treatment goals and their progress
3. Check the risk trajectory (improving/stable/worsening)
4. Note any incomplete homework assignments
5. Provide a concise pre-session briefing to the therapist

## Pre-Session Briefing Format
```
PATIENT CONTEXT: [patient_id]
Sessions to date: [count]
Primary modality: [modality]
Current risk level: [level] ([trajectory])

ACTIVE TREATMENT GOALS:
- [goal 1]: [progress]
- [goal 2]: [progress]

LAST SESSION HIGHLIGHTS:
- [key theme 1]
- [key theme 2]

HOMEWORK STATUS:
- [assignment]: [completed/incomplete]

SUGGESTED FOCUS FOR TODAY:
- [focus area 1]
- [focus area 2]
```

## Clinical Safety Rules
- ALWAYS flag if risk trajectory is worsening
- ALWAYS note unresolved safety concerns from prior sessions
- NEVER minimize or omit prior safety flags
- If a patient had a critical risk level in any recent session, prominently note this
- Track medication changes mentioned across sessions

## Data Privacy
- Only return data for the specific patient_id requested
- Do not cross-reference patients
- All patient identifiers are anonymized
"""


def create_agent():
    """Create the Vertex AI Agent Builder agent."""
    instructions = create_agent_instructions()

    logger.info("=" * 60)
    logger.info("  Multi-Session Context Agent Setup")
    logger.info("=" * 60)
    logger.info("")
    logger.info("Agent Name: %s", AGENT_DISPLAY_NAME)
    logger.info("Project: %s", PROJECT_ID)
    logger.info("Location: %s", LOCATION)
    logger.info("")
    logger.info("To create the agent in Vertex AI Agent Builder:")
    logger.info("")
    logger.info("1. Go to: https://console.cloud.google.com/gen-app-builder/agents")
    logger.info(f"   Project: {PROJECT_ID}")
    logger.info("")
    logger.info("2. Click 'Create Agent' with these settings:")
    logger.info(f"   - Display name: {AGENT_DISPLAY_NAME}")
    logger.info(f"   - Region: {LOCATION}")
    logger.info("   - Model: gemini-2.5-flash (fast context retrieval)")
    logger.info("")
    logger.info("3. Add the Session Context Tool:")
    logger.info("   - Type: OpenAPI")
    logger.info("   - Deploy session_context_tool.py as a Cloud Function first")
    logger.info("   - Point the tool to the Cloud Function URL")
    logger.info("")
    logger.info("4. Set the agent instructions (system prompt):")
    logger.info("-" * 40)
    print(instructions)
    logger.info("-" * 40)
    logger.info("")
    logger.info("5. Integration with therapy-analysis-function:")
    logger.info("   After creating the agent, add this to constants.py:")
    logger.info(f'   MULTI_SESSION_AGENT_ID = "<agent-id-from-console>"')
    logger.info("   Then update the comprehensive analysis to call the agent")
    logger.info("   for pre-session context before generating guidance.")

    # Save instructions to file for easy copy-paste
    instructions_path = Path(__file__).parent / "agent_instructions.txt"
    with open(instructions_path, "w") as f:
        f.write(instructions)
    logger.info("")
    logger.info(f"Agent instructions saved to: {instructions_path}")


def generate_openapi_spec():
    """Generate OpenAPI spec for the session context tool."""
    spec = {
        "openapi": "3.0.0",
        "info": {
            "title": "TherAssist Session Context Tool",
            "version": "1.0.0",
            "description": "Retrieves and stores multi-session patient context for therapy continuity.",
        },
        "paths": {
            "/": {
                "post": {
                    "summary": "Session context operations",
                    "operationId": "sessionContext",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["action", "patient_id"],
                                    "properties": {
                                        "action": {
                                            "type": "string",
                                            "enum": [
                                                "get_history",
                                                "get_risk_trajectory",
                                                "get_treatment_progress",
                                                "store_summary",
                                            ],
                                            "description": "The operation to perform",
                                        },
                                        "patient_id": {
                                            "type": "string",
                                            "description": "Anonymized patient identifier",
                                        },
                                        "limit": {
                                            "type": "integer",
                                            "default": 5,
                                            "description": "Max sessions to retrieve (for get_history)",
                                        },
                                        "session_number": {"type": "integer"},
                                        "therapist_id": {"type": "string"},
                                        "modality": {"type": "string"},
                                        "risk_level": {"type": "string"},
                                        "safety_concerns": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                        },
                                        "key_themes": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                        },
                                        "treatment_goals": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                        },
                                        "clinical_summary": {"type": "string"},
                                        "next_session_focus": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                        },
                                    },
                                }
                            }
                        },
                    },
                    "responses": {
                        "200": {
                            "description": "Successful response",
                            "content": {
                                "application/json": {
                                    "schema": {"type": "object"}
                                }
                            },
                        }
                    },
                }
            }
        },
    }

    spec_path = Path(__file__).parent / "openapi_session_context.json"
    with open(spec_path, "w") as f:
        json.dump(spec, f, indent=2)
    logger.info(f"OpenAPI spec saved to: {spec_path}")
    return spec_path


def test_with_sample_data():
    """Insert sample session data and test context retrieval."""
    logger.info("Generating sample session data for testing...")
    logger.info("")

    sample_sessions = [
        {
            "patient_id": "patient_001",
            "session_date": "2025-01-06",
            "session_number": 1,
            "therapist_id": "therapist_A",
            "modality": "CBT",
            "risk_level": "moderate",
            "safety_concerns": ["Passive suicidal ideation — wishes things would stop"],
            "key_themes": ["Work stress", "Sleep disturbance", "Relationship conflict"],
            "treatment_goals": [
                "Reduce depressive symptoms (PHQ-9 from 18 to <10)",
                "Improve sleep hygiene",
                "Develop assertive communication skills",
            ],
            "goal_progress": {},
            "homework_assigned": [
                "Complete thought record daily",
                "No screens 1hr before bed",
            ],
            "homework_completion": {},
            "clinical_summary": "Initial assessment session. Patient presents with moderate depression and anxiety. Reports passive SI without plan or intent. Established CBT framework and psychoeducation about cognitive model.",
            "risk_trajectory": "stable",
            "next_session_focus": [
                "Review thought records",
                "Deeper exploration of automatic thoughts",
                "Safety check-in",
            ],
        },
        {
            "patient_id": "patient_001",
            "session_date": "2025-01-13",
            "session_number": 2,
            "therapist_id": "therapist_A",
            "modality": "CBT",
            "risk_level": "moderate",
            "safety_concerns": [],
            "key_themes": [
                "Cognitive distortions identified",
                "Sleep improving slightly",
                "Work conflict escalated",
            ],
            "treatment_goals": [
                "Reduce depressive symptoms (PHQ-9 from 18 to <10)",
                "Improve sleep hygiene",
                "Develop assertive communication skills",
            ],
            "goal_progress": {
                "Reduce depressive symptoms (PHQ-9 from 18 to <10)": "PHQ-9 now 16 — slight improvement",
                "Improve sleep hygiene": "Followed screen-free rule 4/7 nights",
            },
            "homework_assigned": [
                "Continue thought records — focus on work situations",
                "Practice 4-7-8 breathing before bed",
                "Draft assertive response to supervisor (role-play next session)",
            ],
            "homework_completion": {
                "Complete thought record daily": "Completed 5/7 days",
                "No screens 1hr before bed": "Completed 4/7 nights",
            },
            "clinical_summary": "Session focused on cognitive restructuring. Identified all-or-nothing thinking pattern around work performance. Patient engaged well with thought records. SI not endorsed this session. Sleep showing early improvement with behavioral changes.",
            "risk_trajectory": "improving",
            "next_session_focus": [
                "Role-play assertive communication with supervisor",
                "Deepen cognitive restructuring",
                "Introduce behavioral experiments",
            ],
        },
        {
            "patient_id": "patient_001",
            "session_date": "2025-01-20",
            "session_number": 3,
            "therapist_id": "therapist_A",
            "modality": "CBT",
            "risk_level": "low",
            "safety_concerns": [],
            "key_themes": [
                "Successful assertive communication at work",
                "Sleep normalized",
                "Mood noticeably improved",
            ],
            "treatment_goals": [
                "Reduce depressive symptoms (PHQ-9 from 18 to <10)",
                "Improve sleep hygiene",
                "Develop assertive communication skills",
            ],
            "goal_progress": {
                "Reduce depressive symptoms (PHQ-9 from 18 to <10)": "PHQ-9 now 12 — significant improvement",
                "Improve sleep hygiene": "Sleeping 7hrs consistently",
                "Develop assertive communication skills": "Successfully used assertive response with supervisor",
            },
            "homework_assigned": [
                "Continue thought records",
                "Practice assertive communication in one new situation",
                "Begin values identification worksheet",
            ],
            "homework_completion": {
                "Continue thought records — focus on work situations": "Completed daily",
                "Practice 4-7-8 breathing before bed": "Completed nightly",
                "Draft assertive response to supervisor (role-play next session)": "Completed — used in real situation",
            },
            "clinical_summary": "Significant progress this session. Patient reporting improved mood, better sleep, and successful use of assertive communication skills. PHQ-9 dropped to 12. Risk level moved from moderate to low. Transitioning to behavioral experiments and values work.",
            "risk_trajectory": "improving",
            "next_session_focus": [
                "Behavioral experiments around core beliefs",
                "Values-based activity planning",
                "Relapse prevention planning (if progress continues)",
            ],
        },
    ]

    # Write sample data for manual Firestore import
    sample_path = Path(__file__).parent / "sample_sessions.json"
    with open(sample_path, "w") as f:
        json.dump(sample_sessions, f, indent=2)
    logger.info(f"Sample data saved to: {sample_path}")
    logger.info("")

    # Show what a pre-session briefing would look like
    latest = sample_sessions[-1]
    logger.info("=" * 60)
    logger.info("  EXAMPLE PRE-SESSION BRIEFING (Session 4)")
    logger.info("=" * 60)
    logger.info("")
    logger.info(f"PATIENT CONTEXT: {latest['patient_id']}")
    logger.info(f"Sessions to date: {latest['session_number']}")
    logger.info(f"Primary modality: {latest['modality']}")
    logger.info(f"Current risk level: {latest['risk_level']} ({latest['risk_trajectory']})")
    logger.info("")
    logger.info("ACTIVE TREATMENT GOALS:")
    for goal in latest["treatment_goals"]:
        progress = latest["goal_progress"].get(goal, "Not yet assessed")
        logger.info(f"  - {goal}: {progress}")
    logger.info("")
    logger.info("LAST SESSION HIGHLIGHTS:")
    for theme in latest["key_themes"]:
        logger.info(f"  - {theme}")
    logger.info("")
    logger.info("HOMEWORK STATUS:")
    for hw, status in latest["homework_completion"].items():
        logger.info(f"  - {hw}: {status}")
    logger.info("")
    logger.info("SUGGESTED FOCUS FOR TODAY:")
    for focus in latest["next_session_focus"]:
        logger.info(f"  - {focus}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TherAssist Multi-Session Context Agent Setup")
    parser.add_argument("--setup-firestore", action="store_true", help="Create Firestore indexes")
    parser.add_argument("--deploy-tool", action="store_true", help="Generate & deploy context tool")
    parser.add_argument("--create-agent", action="store_true", help="Create Agent Builder agent")
    parser.add_argument("--test", action="store_true", help="Generate sample data and test")
    parser.add_argument("--openapi", action="store_true", help="Generate OpenAPI spec")
    parser.add_argument("--all", action="store_true", help="Run all setup steps")
    args = parser.parse_args()

    if args.all:
        setup_firestore()
        generate_context_tool_code()
        generate_deploy_script()
        generate_openapi_spec()
        create_agent()
        test_with_sample_data()
    elif args.setup_firestore:
        setup_firestore()
    elif args.deploy_tool:
        generate_context_tool_code()
        generate_deploy_script()
        generate_openapi_spec()
        logger.info("")
        logger.info("Next steps:")
        logger.info("  1. Create a Dockerfile for session_context_tool.py")
        logger.info("  2. Run: bash deploy_context_tool.sh")
        logger.info("  3. Then: python setup_multi_session_agent.py --create-agent")
    elif args.create_agent:
        create_agent()
    elif args.openapi:
        generate_openapi_spec()
    elif args.test:
        test_with_sample_data()
    else:
        parser.print_help()
