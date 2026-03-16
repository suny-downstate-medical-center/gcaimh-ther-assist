# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

MODEL_NAME = "gemini-2.5-flash"  # Used for realtime analysis (speed-critical, minimal thinking)
MODEL_NAME_PRO = "gemini-2.5-pro"  # Used for comprehensive, pathway guidance, and session summary (with thinking_budget)

# Minimum transcript word count before modality detection is considered reliable.
# Roughly 2-3 minutes of conversation. Below this threshold, the frontend will
# show "Gathering data..." instead of displaying modality suggestions.
MIN_WORDS_FOR_MODALITY_DETECTION = 200

# Phrases that trigger non-strict analysis
TRIGGER_PHRASES = [
    "something else came up",
    "scared but I want to do it",
    "very brave",
    "I might fall apart"
]

# ── Deterministic Safety Keyword Scanner ─────────────────────────────────────
# Hard-coded keyword lists that run BEFORE every LLM call as a safety net.
# If ANY keyword matches, we force a safety alert regardless of LLM output.
# Categories map to distinct clinical response protocols.
SAFETY_KEYWORDS = {
    "suicidal_ideation": [
        "suicide", "suicidal", "kill myself", "end my life",
        "don't want to live", "dont want to live",
        "better off dead", "no reason to live", "wish I was dead",
        "wish I were dead", "want to die", "rather be dead",
        "not worth living", "end it all", "take my own life",
        "no point in living", "can't go on", "nothing to live for",
    ],
    "self_harm": [
        "self-harm", "self harm", "cutting myself", "hurt myself",
        "burning myself", "hitting myself", "harming myself",
        "cutting", "razor", "blade on my skin",
        "bang my head", "scratch myself until",
        "punching walls", "biting myself",
    ],
    "violence_homicide": [
        "kill him", "kill her", "kill them", "kill someone",
        "hurt them", "hurt him", "hurt her",
        "want to hurt", "going to hurt",
        "homicidal", "violent thoughts", "violent urges",
        "weapon", "gun", "knife", "shoot", "stab",
        "bomb", "threat to kill", "threatening to hurt",
        "want them dead", "plan to hurt",
    ],
    "abuse_disclosure": [
        "hitting me", "hits me", "beating me", "beats me",
        "abusing me", "abused me", "molesting", "molested",
        "sexual abuse", "sexually abused", "raped", "rape",
        "domestic violence", "hurting my child", "hurts the kids",
        "child abuse", "elder abuse", "being trafficked",
        "forced me to", "threatened to kill me",
        "controlling me", "won't let me leave",
    ],
    "substance_crisis": [
        "overdose", "overdosed", "took too many pills",
        "relapsed", "using again", "can't stop using",
        "drinking again", "drunk right now", "high right now",
        "withdrawal", "detox", "need a fix",
        "mixing drugs", "fentanyl", "methamphetamine", "crystal meth", "smoking meth",
    ],
}

# Clinical response templates for each safety category
# These are injected into the LLM prompt when the keyword scanner fires
SAFETY_CLINICAL_RESPONSES = {
    "suicidal_ideation": {
        "title": "Suicidal Ideation Detected",
        "protocol": "Columbia Suicide Severity Rating Scale (C-SSRS)",
        "message": "Patient has expressed suicidal thoughts. Conduct immediate risk assessment: assess ideation type (passive vs. active), plan, means, intent, and protective factors.",
        "crisis_resources": ["988 Suicide & Crisis Lifeline: call or text 988", "Crisis Text Line: text HOME to 741741"],
        "immediate_actions": [
            "Ask directly about suicidal thoughts, plan, and intent",
            "Assess access to lethal means",
            "Identify protective factors (family, reasons for living)",
            "Develop or review safety plan",
            "Consider consultation or higher level of care if indicated",
        ],
        "contraindications": [
            "Do not minimize or dismiss the patient's statements",
            "Avoid leaving patient alone if actively suicidal",
            "Do not promise confidentiality when safety is at risk",
        ],
    },
    "self_harm": {
        "title": "Self-Harm Risk Identified",
        "protocol": "Functional Assessment of Self-Harm",
        "message": "Patient has mentioned self-harm behaviors. Assess frequency, severity, method, function (emotion regulation vs. communication), and current urges.",
        "crisis_resources": ["988 Suicide & Crisis Lifeline: call or text 988", "Crisis Text Line: text HOME to 741741"],
        "immediate_actions": [
            "Assess current self-harm urges and recency",
            "Review recent self-harm episodes (method, frequency, severity)",
            "Identify triggers and emotional function",
            "Discuss alternative coping strategies and harm reduction",
        ],
        "contraindications": [
            "Do not express shock or judgment about self-harm methods",
            "Avoid inadvertently reinforcing self-harm through excessive attention to details",
        ],
    },
    "violence_homicide": {
        "title": "Violence/Homicide Risk — Duty to Warn",
        "protocol": "Tarasoff Duty-to-Warn Assessment",
        "message": "Patient has expressed violent ideation or threats toward others. Assess specificity of target, plan, means, and intent. REMINDER: Duty to warn/protect may apply (Tarasoff).",
        "crisis_resources": ["988 Suicide & Crisis Lifeline: call or text 988", "Local emergency services: 911"],
        "immediate_actions": [
            "Assess specificity: is there an identifiable target?",
            "Evaluate plan, means, and intent to harm",
            "Review duty-to-warn obligations under your jurisdiction",
            "Consider contacting supervisor or legal counsel",
            "Document risk assessment thoroughly",
        ],
        "contraindications": [
            "Do not dismiss threats as 'venting' without proper assessment",
            "Do not promise absolute confidentiality — duty to warn may override",
            "Avoid confrontational stance that may escalate agitation",
        ],
    },
    "abuse_disclosure": {
        "title": "Abuse Disclosure — Mandatory Reporting",
        "protocol": "Mandatory Reporting Assessment",
        "message": "Patient has disclosed abuse (child, elder, domestic violence, or sexual assault). REMINDER: Mandatory reporting obligations may apply depending on jurisdiction and victim.",
        "crisis_resources": [
            "National Domestic Violence Hotline: 1-800-799-7233",
            "Childhelp National Child Abuse Hotline: 1-800-422-4453",
            "RAINN Sexual Assault Hotline: 1-800-656-4673",
        ],
        "immediate_actions": [
            "Assess immediate safety of the patient and any minors/vulnerable adults",
            "Determine if mandatory reporting is required (child abuse, elder abuse)",
            "Inform patient about limits of confidentiality if reporting is required",
            "Provide crisis resources and safety planning",
            "Document disclosure and actions taken",
        ],
        "contraindications": [
            "Do not promise confidentiality before understanding reporting obligations",
            "Do not pressure patient to take specific actions (e.g., leave abuser) prematurely",
            "Avoid re-traumatization through excessive detail-seeking",
        ],
    },
    "substance_crisis": {
        "title": "Substance Crisis Detected",
        "protocol": "Substance Crisis Assessment",
        "message": "Patient has indicated active substance crisis (overdose risk, relapse, intoxication, or withdrawal). Assess immediate medical risk and current state.",
        "crisis_resources": ["988 Suicide & Crisis Lifeline: call or text 988", "SAMHSA Helpline: 1-800-662-4357"],
        "immediate_actions": [
            "Assess current intoxication or withdrawal status",
            "Evaluate overdose risk (substance type, amount, polydrug use)",
            "Determine if medical intervention is needed",
            "Review relapse prevention plan if applicable",
            "Consider referral to addiction specialist or detox facility",
        ],
        "contraindications": [
            "Do not express moral judgment about substance use",
            "Avoid cognitive-heavy interventions if patient is currently intoxicated",
            "Do not ignore medical risk — substance withdrawal can be life-threatening",
        ],
    },
}

# Template injected into LLM prompt when keyword scanner detects safety concern
SAFETY_CONTEXT_INJECTION = """
⚠️ SAFETY FLAG — DETERMINISTIC KEYWORD MATCH ⚠️
The following safety keywords were detected in the transcript:
  Categories: {matched_categories}
  Keywords found: {matched_keywords}

YOU MUST prioritize safety assessment in your response.
- If generating a realtime alert: set timing='now', category='safety'
- Include the 'crisis_resources' field with relevant hotline numbers
- Reference the matched keywords as evidence
- Follow the clinical protocol for the detected category
"""

# Therapy phase definitions
THERAPY_PHASES = {
    "beginning": {"duration_minutes": 10, "focus": "rapport building, agenda setting"},
    "middle": {"duration_minutes": 30, "focus": "core therapeutic work"},
    "end": {"duration_minutes": 10, "focus": "summary, homework, closure"}
}

# Prompts
REALTIME_ANALYSIS_PROMPT = """Analyze this therapy segment for real-time guidance using a {current_approach} approach.

TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
{transcript_text}

PREVIOUS GUIDANCE:
{previous_alert_context}

Provide guidance based on timing priority:
1. NOW (immediate intervention needed): suicidal ideation, self-harm, homicidal ideation, violence threats, abuse disclosure, substance overdose/crisis, catastrophic thoughts, dissociation, panic, severe distress
2. PAUSE (wait for natural pause): exposure plan, therapeutic opportunities, technique suggestions, process observations
3. INFO (continue with current path): reinforcement of current therapeutic path, helpful observations

Categories available:
- SAFETY: Suicidal ideation, self-harm, homicidal ideation, violence toward others (Tarasoff duty to warn), child/elder abuse disclosure (mandatory reporting), substance crisis/overdose, catastrophic thoughts, patient wellbeing
- PATHWAY_CHANGE: Recommendations to consider switching therapeutic approaches
- ENGAGEMENT: Continuation of therapeutic approach, therapeutic alliance, patient support
- TECHNIQUE: Specific therapeutic interventions, skill suggestions
- PROCESS: Therapeutic process observations, session dynamics, engagement patterns

SAFETY-SPECIFIC INSTRUCTIONS:
- If patient expresses thoughts of harming OTHERS (homicide, violence): flag as SAFETY with timing 'now'. Remind therapist of duty-to-warn (Tarasoff) obligations.
- If patient discloses abuse (child abuse, elder abuse, domestic violence, sexual assault): flag as SAFETY with timing 'now'. Remind therapist of mandatory reporting obligations.
- If patient is in active substance crisis (intoxicated, overdose risk, withdrawal): flag as SAFETY with timing 'now'. Assess medical risk.
- For ALL safety alerts: include the 'crisis_resources' field with relevant hotline numbers (988 Suicide & Crisis Lifeline, SAMHSA 1-800-662-4357, DV Hotline 1-800-799-7233).

DEDUPLICATION GUIDELINES:
- The "PREVIOUS GUIDANCE" section above shows what was recently displayed to the therapist
- Do not repeat the exact same guidance. Provide genuinely NEW content about the current transcript
- You MAY reuse the same alert.category if the clinical content is substantially different
- Focus on what is NEW in the latest transcript — there is almost always something worth flagging
- Safety guidance (timing: "now") should always be generated when needed

IMPORTANT: The therapist relies on continuous guidance throughout the session. Only return empty JSON if the transcript is truly mundane small-talk with zero clinical relevance. In a therapy session, this is rare — almost every patient statement warrants guidance.

If no guidance is needed, return an empty JSON. Format:
{{}}

If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
{{
    "alert": {{
        "timing": "now|pause|info",
        "category": "safety|technique|pathway_change|engagement|process",
        "title": "Brief descriptive title",
        "message": "Specific action or observation (1-3 sentences max)",
        "evidence": ["relevant quote(s) from the patient"],
        "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
        "immediateActions": ["Specific step the therapist should take right now"],
        "contraindications": ["What the therapist should avoid doing in this situation"],
        "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
    }}
}}

NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.

IMPORTANT NOTE:
Always refer to the patient as 'patient'"""

REALTIME_ANALYSIS_PROMPT_STRICT = """Analyze this therapy segment for CRITICAL guidance only using a {current_approach} approach.

TRANSCRIPT (last few sentences):
{transcript_text}

PREVIOUS GUIDANCE:
{previous_alert_context}

Only provide guidance for significant therapeutic moments:
1. A critical moment is occurring that requires intervention, exploration, or technique application
2. The situation represents risk, a breakthrough, a therapeutic opportunity, or a technique suggestion
3. The guidance is substantially different from PREVIOUS GUIDANCE (do not repeat the same advice)

DEDUPLICATION:
- Do not repeat the exact same guidance as PREVIOUS GUIDANCE
- You MAY reuse the same category if the clinical content is different
- If therapist is already handling the situation well, consider an "info" timing encouragement
- SAFETY alerts always override deduplication rules

CONFIDENCE THRESHOLD:
- Provide guidance if you are reasonably confident (60%+) it adds value
- Most patient statements in therapy have clinical relevance worth flagging

CRITICAL MOMENTS REQUIRING GUIDANCE:

**IMMEDIATE (timing: "now") - Only for genuine emergencies:**
- Active suicidal ideation (passive or active, with or without plan)
- Self-harm behavior or urges being expressed
- Homicidal ideation or threats of violence toward others (duty-to-warn/Tarasoff)
- Disclosure of abuse: child abuse, elder abuse, domestic violence, sexual assault (mandatory reporting)
- Substance crisis: active intoxication, overdose risk, dangerous withdrawal
- Catastrophic cognitions or catastrophization
- Patient is "falling apart" or feeling "physically sick"
- Severe dissociation (patient disconnected from reality)
- Medical emergency or physical distress

**PAUSE (timing: "pause") - Only for significant therapeutic opportunities:**
- Major breakthrough moment that requires specific follow-up
- Critical resistance that's blocking all progress
- Window for exposure that may not reoccur
- Therapeutic alliance rupture requiring immediate repair

**INFO (timing: "info") - Used only for:**
- Engagement with an exposure plan
- Significant pattern recognition that changes treatment direction

Categories (prefer any category other than the category of PREVIOUS GUIDANCE):
- SAFETY: Suicidal ideation, self-harm, homicidal ideation, violence toward others, abuse disclosure (mandatory reporting), substance crisis/overdose, catastrophic thoughts, patient wellbeing
- PATHWAY_CHANGE: Recommendations to consider switching therapeutic approaches
- ENGAGEMENT: Continuation of therapeutic approach, therapeutic alliance, patient support
- TECHNIQUE: Specific therapeutic interventions, skill suggestions
- PROCESS: Therapeutic process observations, session dynamics, engagement patterns

SAFETY-SPECIFIC INSTRUCTIONS:
- For violence/homicide: remind therapist of Tarasoff duty-to-warn obligations
- For abuse disclosure: remind therapist of mandatory reporting obligations for child/elder abuse
- For substance crisis: assess immediate medical risk (overdose, withdrawal seizures)
- For ALL safety alerts: include 'crisis_resources' field with relevant hotlines

Empty JSON format (use this most of the time):
{{}}

If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
{{
    "alert": {{
        "timing": "now|pause|info",
        "category": "safety|technique|pathway_change|engagement|process",
        "title": "Brief descriptive title",
        "message": "Specific action or observation (1-3 sentences max)",
        "evidence": ["direct quote showing the critical moment"],
        "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
        "immediateActions": ["Specific step the therapist should take right now"],
        "contraindications": ["What the therapist should avoid doing in this situation"],
        "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
    }}
}}

NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.

IMPORTANT NOTE:
Always refer to the patient as 'patient'"""

## NOTE: Alternate pathways has been removed
COMPREHENSIVE_ANALYSIS_PROMPT = """<thinking>
Analyze this therapy session segment step by step:
1. Check for ANY safety concerns: suicidal ideation, self-harm, homicidal ideation, violence toward others, abuse disclosure (child/elder/DV/sexual), substance crisis, dissociation, panic
2. If safety concern found: assess severity using RISK LEVEL DEFINITIONS below, identify specific risk factors, determine if duty-to-warn (Tarasoff) or mandatory reporting obligations apply
3. DETECT the actual therapy modality being used by the therapist based on techniques and approach (CBT, DBT, IPT, BA, MI, Exposure, ACT, MBCT, PE, EMDR, or General)
4. Evaluate therapeutic process metrics (engagement, alliance, techniques)
5. Assess if current approach is effective or needs adjustment
6. Search for similar patterns in clinical transcripts relevant to the detected therapeutic approach
7. Reference evidence-based manuals and protocols for the detected modality
8. Provide specific pathway guidance regardless of effectiveness

RISK LEVEL DEFINITIONS (use these precisely — do NOT over-triage):
- "low": No safety concerns. Patient is stable, engaged, and coping. Routine therapeutic work. This includes standard therapeutic conversations such as Motivational Interviewing about substance use, behavioral activation scheduling, or CBT cognitive restructuring — even when the TOPIC involves substances, distress, or negative patterns, the RISK is low if the therapist is conducting structured therapeutic work and the patient is engaged.
- "moderate": Ambiguous or mild risk indicators that warrant monitoring but NOT immediate action. Includes: vague distress language that COULD indicate passive SI but is NOT definitive (e.g., "I want it all to stop", "I'm tired of fighting"), general hopelessness without specific suicidal content, discussing past risk behaviors in therapeutic context. KEY DISTINCTION: If the language is ambiguous and could be interpreted as either existential fatigue OR passive SI, rate as MODERATE (flag for assessment but do not over-triage).
- "high": Active safety concerns without imminent danger. Requires CLEAR, UNAMBIGUOUS indicators: explicit passive suicidal ideation (e.g., "wish I were dead", "better off without me"), active self-harm disclosure, substance misuse with reckless disregard for safety, vague threats toward others without specific means/target. The patient must express something CLEARLY about death, self-harm, or harming others — not just general distress.
- "critical": IMMINENT danger requiring immediate action. Includes: active suicidal ideation WITH plan AND means access, homicidal ideation WITH means AND identified target (Tarasoff), active child/elder abuse disclosure (mandatory reporting), overdose/acute intoxication with self-harm intent. ANY scenario involving plan + means + intent/target = CRITICAL.

AMBIGUITY CALIBRATION:
- "I want it all to stop" / "I'm tired of fighting" = MODERATE (ambiguous — could be existential fatigue, not necessarily SI)
- "I wish I were dead" / "everyone would be better off without me" = HIGH (clearly references death/absence)
- "I have a plan to kill myself" = CRITICAL (plan + intent)
The key test: does the statement EXPLICITLY reference death, dying, or self-harm? If no, moderate. If yes, high or critical.

THERAPEUTIC CONTEXT vs ACTIVE RISK (3-tier distinction):
1. STRUCTURED THERAPEUTIC WORK (risk = LOW): Therapist guides discussion using MI importance rulers, CBT thought records, BA activity logs. Patient is engaged, topic processed therapeutically. Example: MI session exploring drinking patterns = LOW.
2. THERAPEUTIC PROCESSING OF PAST HARMFUL BEHAVIORS (risk = MODERATE): Therapist guides review of past harmful behaviors (DBT chain analysis of urges, reviewing self-harm episodes, discussing relapse). Behavior is processed therapeutically but content involves clinically significant risk behaviors. Example: DBT chain analysis of purging urges = MODERATE.
3. PATIENT REPORTING RECENT DANGEROUS ACTIONS (risk = HIGH or CRITICAL): Patient discloses recent life-threatening behavior NOT in a therapeutic processing frame. Example: "I mixed Xanax with vodka last night and didn't care what happened" = CRITICAL (polydrug overdose risk + implied suicidal intent). KEY: "I didn't care what happened" after dangerous substance combination = suicidal intent → CRITICAL.
</thinking>

You are an expert clinical supervisor providing real-time guidance during a therapy session. Analyze this segment comprehensively using BOTH:
1. EBT manuals for evidence-based protocols and techniques
2. Clinical transcripts for real-world examples of similar therapeutic moments

CURRENT SESSION CONTEXT:
- Phase: {phase} ({phase_focus})
- Duration: {session_duration} minutes
- Session Type: {session_type}
- Focus Topics: {primary_concern}
- Current Therapeutic Approach: {current_approach}

TRANSCRIPT SEGMENT (speaker labels from voice diarization: "Therapist:" and "Patient:"):
{transcript_text}

IMPORTANT:
- Look for similar patterns in the transcript database (e.g., "client resistance", "overwhelm", "not ready")
- Reference evidence-based manual protocols with citations [1], [2], etc.
- If you find a similar moment in clinical transcripts, mention how it was handled
- ALWAYS provide pathway guidance details (rationale, actions, contraindications) regardless of effectiveness

Provide analysis with a JSON response only, no other text should exist besides the JSON. Format::
{{
    "session_metrics": {{
        "engagement_level": 0.0-1.0,
        "therapeutic_alliance": "weak|moderate|strong IMPORTANT: only return one of the provided options",
        "techniques_detected": ["technique1", "technique2"],
        "detected_modality": {{
            "code": "CBT|DBT|IPT|BA|MI IMPORTANT: return the most specific modality code. Use BA (Behavioral Activation) when activity scheduling/monitoring is primary. Use MI (Motivational Interviewing) when change talk, importance rulers, or rolling with resistance is observed. Use CBT for cognitive restructuring, thought records, Socratic questioning. Use DBT for chain analysis, distress tolerance, emotion regulation. Use IPT for interpersonal disputes, role transitions, grief.",
            "name": "Full name of the detected therapy modality",
            "confidence": 0.0-1.0,
            "evidence": ["specific technique or approach observed in transcript"]
        }},
        "emotional_state": "calm|anxious|distressed|dissociated|engaged IMPORTANT: only return one of the provided options",
        "arousal_level": "low|moderate|high|elevated IMPORTANT: only return one of the provided options",
        "phase_appropriate": true|false
    }},
    "pathway_indicators": {{
        "current_approach_effectiveness": "effective|struggling|ineffective IMPORTANT: only return one of the provided options",
        "alternative_pathways": ["pathway1", "pathway2"],
        "change_urgency": "none|monitor|consider|recommended"
    }},
    "pathway_guidance": {{
        "continue_current": true|false,
        "rationale": "Explanation with citations [1], [2] embedded in text",
        "immediate_actions": ["action1 with citation [3]", "action2"],
        "contraindications": ["contraindication1 [4]", "contraindication2"],
        "alternative_pathways": [
            {{
                "approach": "Alternative approach name",
                "reason": "Why this alternative with citations [5]",
                "techniques": ["technique1", "technique2"]
            }}
        ]
    }},
    "diarized_transcript": [
        {{
            "speaker": "Therapist",
            "text": "The exact text of what the therapist said"
        }},
        {{
            "speaker": "Patient",
            "text": "The exact text of what the patient said"
        }}
    ]
}}

SPEAKER DIARIZATION INSTRUCTIONS:
In the "diarized_transcript" array, label EVERY line of the transcript with "Therapist" or "Patient".
- The Therapist typically: asks open-ended questions, guides the therapeutic framework, offers validations, reflects feelings, provides psychoeducation
- The Patient typically: describes experiences, reports symptoms, expresses emotions, answers questions, shares personal narratives
- Use the EXACT text from the transcript — do not paraphrase or modify
- Each entry in the array corresponds to one transcript segment in order

Focus on clinically actionable insights. Only surface critical information that requires immediate attention. Always provide pathway guidance even when the current approach is effective.

IMPORTANT NOTE:
Always refer to the patient as 'patient'"""

PATHWAY_GUIDANCE_PROMPT = """You are a clinical supervisor providing pathway guidance for a therapy session.

CURRENT SITUATION:
- Current Approach: {current_approach}
- Presenting Issues: {presenting_issues}
- Recent Session History: {history_summary}

Based on evidence-based treatment protocols, provide specific guidance on:
1. Whether to continue with current approach
2. Alternative pathways if change is needed
3. Specific techniques to implement
4. Contraindications to watch for

IMPORTANT: When referencing EBT manuals or research, use inline citations in the format [1], [2], etc. 
For example: "Consider graded exposure therapy [1] as outlined in the PE manual [2]."

Provide response in JSON format:
{{
    "continue_current": true|false,
    "rationale": "Explanation with citations [1], [2] embedded in text",
    "alternative_pathways": [
        {{
            "approach": "Approach name",
            "reason": "Why this alternative with citations [3]",
            "techniques": ["technique1", "technique2"]
        }}
    ],
    "immediate_actions": ["action1 with citation [4]", "action2"],
    "contraindications": ["contraindication1 [5]", "contraindication2"]
}}"""

SESSION_SUMMARY_PROMPT = """Generate a comprehensive session summary for the therapist's records.

SESSION TRANSCRIPT (speaker labels from voice diarization: "Therapist:" and "Patient:"):
{transcript_text}

SESSION METRICS:
{session_metrics}

Create a summary including:
1. Key therapeutic moments with timestamps
2. Techniques used effectively
3. Areas for improvement
4. Patient progress indicators
5. Recommended follow-up actions
6. Homework assignments based on EBT protocols
7. Risk assessment: evaluate for suicidal ideation, self-harm, violence/homicide risk, abuse disclosure, and substance concerns

Reference specific EBT manual sections for homework and follow-up recommendations.

SAFETY NOTE: If ANY safety concerns were identified during this session (suicidal ideation, self-harm, violence, abuse, substance crisis), they MUST appear in the risk_assessment section with:
- Specific risk factors identified
- Actions taken during session
- Recommended follow-up (e.g., safety plan review, mandatory report filed, referral to crisis services)
- If duty-to-warn (Tarasoff) or mandatory reporting was relevant, note it explicitly

IMPORTANT: For timestamps in key_moments, use the session time format HH:MM:SS (e.g., "00:15:30" for 15 minutes 30 seconds into the session). If you cannot determine the exact time, use approximate session time based on the transcript context.

Format as structured JSON:
{{
    "session_date": "ISO date",
    "duration_minutes": number,
    "key_moments": [
        {{
            "time": "HH:MM:SS session time format (e.g., 00:15:30)",
            "description": "what happened",
            "significance": "why it matters"
        }}
    ],
    "techniques_used": ["technique1", "technique2"],
    "progress_indicators": ["indicator1", "indicator2"],
    "areas_for_improvement": ["area1", "area2"],
    "homework_assignments": [
        {{
            "task": "description",
            "rationale": "why",
            "manual_reference": "Treatment Manual p.X or protocol reference"
        }}
    ],
    "follow_up_recommendations": ["recommendation1", "recommendation2"],
    "risk_assessment": {{
        "level": "low|moderate|high|critical IMPORTANT: Use the RISK LEVEL DEFINITIONS from the thinking section. critical = imminent danger with plan+means+intent/target. high = active concerns without imminent danger. moderate = mild indicators or therapeutic processing of past risk. low = no safety concerns.",
        "factors": ["factor1", "factor2"]
    }},
    "alternate_therapy_paths": [
        {{
            "therapy_type": "DBT|IPT|CBT|BA|MI (must be DIFFERENT from the current session modality)",
            "reason": "Why this alternate approach may benefit the patient based on observed session patterns",
            "key_indicators": ["specific observations from the session that suggest this alternate approach"],
            "techniques_to_try": ["2-3 specific techniques from the alternate modality to consider"]
        }}
    ]
}}

ALTERNATE THERAPY PATHS: Suggest 1-2 alternate therapy approaches that differ from the current session's modality. Base suggestions on observed patient patterns, emotional responses, and therapeutic needs identified during the session. Only suggest approaches with genuine clinical rationale — do not suggest alternatives just to fill the field."""
