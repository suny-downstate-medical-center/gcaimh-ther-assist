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

MODEL_NAME = "gemini-2.5-flash"

# Phrases that trigger non-strict analysis
TRIGGER_PHRASES = [
    "something else came up",
    "scared but I want to do it",
    "very brave",
    "I might fall apart"
]

# Therapy phase definitions
THERAPY_PHASES = {
    "beginning": {"duration_minutes": 10, "focus": "rapport building, agenda setting"},
    "middle": {"duration_minutes": 30, "focus": "core therapeutic work"},
    "end": {"duration_minutes": 10, "focus": "summary, homework, closure"}
}

# Prompts
REALTIME_ANALYSIS_PROMPT = """Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.

TRANSCRIPT (last few sentences):
{transcript_text}

PREVIOUS GUIDANCE:
{previous_alert_context}

Provide guidance based on timing priority:
1. NOW (immediate intervention needed): catastrophic thoughts, physically sick, falling apart, dissociation, panic, suicidal ideation, self-harm, severe distress
2. PAUSE (wait for natural pause): exposure plan, therapeutic opportunities, technique suggestions, process observations
3. INFO (continue with current path): reinforcement of current therapeutic path, helpful observations

Categories available:
- SAFETY: Catastrophic thoughts, addressing risk concerns, crisis situations, patient wellbeing
- PATHWAY_CHANGE: Recommendations to consider switching therapeutic approaches
- ENGAGEMENT: Continuation of therapeutic approach, therapeutic alliance, patient support
- TECHNIQUE: Specific therapeutic interventions, skill suggestions

IMPORTANT DEDUPLICATION REQUIREMENTS:
- The "PREVIOUS GUIDANCE" section above shows what guidance was recently displayed to the therapist
- Do not generate duplicate, or even similar guidance as the PREVIOUS GUIDANCE. Only generate genuinely NEW or DIFFERENT guidance.
- Do not generate new guidance with the same alert.category as PREVIOUS GUIDANCE. Select a different category.
- Safety guidance (timing: "now") are exempt from this rule and should always be generated if needed

If no guidance is needed, then simply return an empty JSON. Format:
{{}}

If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
{{
    "alert": {{
        "timing": "now|pause|info",
        "category": "safety|technique|pathway_change|engagement",
        "title": "Brief descriptive title",
        "message": "Specific action or observation (1-3 sentences max)",
        "evidence": ["relevant quote(s) from the patient"],
        "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"]
    }}
}}

IMPORTANT NOTE:
Always refer to the patient as 'patient'"""

REALTIME_ANALYSIS_PROMPT_STRICT = """Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.

TRANSCRIPT (last few sentences):
{transcript_text}

PREVIOUS GUIDANCE:
{previous_alert_context}

**DEFAULT RESPONSE: EMPTY JSON {{}}**

Only provide guidance if ALL of the following conditions are met:
1. A critical therapeutic moment is occurring that requires intervention or exploration
2. The situation represents a significant risk, breakthrough, or therapeutic opportunity
3. No similar guidance has been provided recently (see PREVIOUS GUIDANCE above)

STRICT DEDUPLICATION:
- If PREVIOUS GUIDANCE exists with same category, return empty JSON {{}}
- If PREVIOUS GUIDANCE addresses similar issue, return empty JSON {{}}
- If therapist is handling situation appropriately, return empty JSON {{}}
- Only SAFETY alerts can override this rule

CONFIDENCE THRESHOLD:
- Only provide guidance if you are highly confident (80%+) it's needed
- When in doubt, return empty JSON {{}}
- Normal therapeutic conversation does NOT require guidance

CRITICAL MOMENTS REQUIRING GUIDANCE:

**IMMEDIATE (timing: "now") - Only for genuine emergencies:**
- Catastrophic cognitions or catastrophization
- Patient is "falling apart" or feeling "physically sick"
- Active suicidal ideation with plan/intent
- Self-harm behavior or urges being expressed
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
- SAFETY: Catastrophic thoughts, addressing risk concerns, crisis situations, patient wellbeing, 
- PATHWAY_CHANGE: Recommendations to consider switching therapeutic approaches
- ENGAGEMENT: Continuation of therapeutic approach, theraputic alliance, patient support, 
- TECHNIQUE: Specific therapeutic interventions, skill suggestions

Empty JSON format (use this most of the time):
{{}}

If an guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
{{
    "alert": {{
        "timing": "now|pause|info",
        "category": "safety|technique|pathway_change|engagement",
        "title": "Brief descriptive title",
        "message": "Specific action or observation (1-3 sentences max)",
        "evidence": ["direct quote showing the critical moment"],
        "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"]
    }}
}}

IMPORTANT NOTE:
Always refer to the patient as 'patient'"""

## NOTE: Alternate pathways has been removed
COMPREHENSIVE_ANALYSIS_PROMPT = """<thinking>
Analyze this therapy session segment step by step:
1. Check for any safety concerns (dissociation, panic, suicidal ideation)
2. Evaluate therapeutic process metrics (engagement, alliance, techniques)
3. Assess if current approach is effective or needs adjustment
4. Search for similar patterns in clinical transcripts (Beck sessions, PTSD sessions)
5. Reference EBT manuals for evidence-based protocols
6. Provide specific pathway guidance regardless of effectiveness
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

TRANSCRIPT SEGMENT:
{transcript_text}

IMPORTANT: 
- Look for similar patterns in the transcript database (e.g., "client resistance", "overwhelm", "not ready")
- Reference EBT manual protocols with citations [1], [2], etc.
- If you find a similar moment in Beck or PTSD sessions, mention how it was handled
- ALWAYS provide pathway guidance details (rationale, actions, contraindications) regardless of effectiveness

Provide analysis with a JSON response only, no other text should exist besides the JSON. Format::
{{
    "session_metrics": {{
        "engagement_level": 0.0-1.0,
        "therapeutic_alliance": "weak|moderate|strong IMPORTANT: only return one of the provided options",
        "techniques_detected": ["technique1", "technique2"],
        "emotional_state": "calm|anxious|distressed|dissociated|engaged IMPORTANT: only return one of the provided options",
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
    }}
}}

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

SESSION TRANSCRIPT:
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

Reference specific EBT manual sections for homework and follow-up recommendations.

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
            "manual_reference": "CBT Manual p.X"
        }}
    ],
    "follow_up_recommendations": ["recommendation1", "recommendation2"],
    "risk_assessment": {{
        "level": "low|moderate|high",
        "factors": ["factor1", "factor2"]
    }}
}}"""
