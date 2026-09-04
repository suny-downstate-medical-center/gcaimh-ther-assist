# Realtime analysis debrief

Steps: 20 | alerts: 0 | model attempts: 40
RAG calls: 80 | datastores: ba-corpus, cbt-corpus, ebt-corpus, safety-crisis
Token totals: `{}`

> The realtime backend disables an explicit thinking configuration. TTFT combines server prompt processing and any hidden thinking; completion_after_first_token is the observable generation interval.

## Step 1

**Transcript checkpoint** (1 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
```

Request latency: **2200 ms**; prompt assembly: **1 ms**

### RAG

- **ba-corpus** — 1045 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.`
  - Source titles: not returned
- **ebt-corpus** — 1046 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.`
  - Source titles: not returned
- **safety-crisis** — 1046 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.`
  - Source titles: not returned
- **cbt-corpus** — 1046 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 700 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 448 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 2

**Transcript checkpoint** (2 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
```

Request latency: **1165 ms**; prompt assembly: **0 ms**

### RAG

- **ebt-corpus** — 212 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.`
  - Source titles: not returned
- **ba-corpus** — 210 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.`
  - Source titles: not returned
- **safety-crisis** — 214 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.`
  - Source titles: not returned
- **cbt-corpus** — 270 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 483 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 406 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 3

**Transcript checkpoint** (3 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
```

Request latency: **1100 ms**; prompt assembly: **0 ms**

### RAG

- **safety-crisis** — 146 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.`
  - Source titles: not returned
- **ba-corpus** — 148 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.`
  - Source titles: not returned
- **cbt-corpus** — 163 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.`
  - Source titles: not returned
- **ebt-corpus** — 211 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 436 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 449 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 4

**Transcript checkpoint** (4 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
```

Request latency: **1164 ms**; prompt assembly: **0 ms**

### RAG

- **ebt-corpus** — 155 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.`
  - Source titles: not returned
- **cbt-corpus** — 153 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.`
  - Source titles: not returned
- **ba-corpus** — 150 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.`
  - Source titles: not returned
- **safety-crisis** — 211 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 435 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 513 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 5

**Transcript checkpoint** (5 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
```

Request latency: **1042 ms**; prompt assembly: **0 ms**

### RAG

- **cbt-corpus** — 83 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.`
  - Source titles: not returned
- **ebt-corpus** — 86 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.`
  - Source titles: not returned
- **ba-corpus** — 82 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.`
  - Source titles: not returned
- **safety-crisis** — 171 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 419 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 446 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 6

**Transcript checkpoint** (6 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
```

Request latency: **1037 ms**; prompt assembly: **1 ms**

### RAG

- **cbt-corpus** — 135 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.`
  - Source titles: not returned
- **safety-crisis** — 147 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.`
  - Source titles: not returned
- **ba-corpus** — 146 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.`
  - Source titles: not returned
- **ebt-corpus** — 149 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 508 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 375 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 7

**Transcript checkpoint** (7 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
```

Request latency: **1085 ms**; prompt assembly: **1 ms**

### RAG

- **safety-crisis** — 200 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.`
  - Source titles: not returned
- **ba-corpus** — 206 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.`
  - Source titles: not returned
- **cbt-corpus** — 207 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.`
  - Source titles: not returned
- **ebt-corpus** — 210 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 495 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 375 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 8

**Transcript checkpoint** (8 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
```

Request latency: **1201 ms**; prompt assembly: **0 ms**

### RAG

- **cbt-corpus** — 209 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.`
  - Source titles: not returned
- **safety-crisis** — 212 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.`
  - Source titles: not returned
- **ba-corpus** — 213 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.`
  - Source titles: not returned
- **ebt-corpus** — 267 ms
  - Trigger query: `Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 549 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 376 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 9

**Transcript checkpoint** (9 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
```

Request latency: **845 ms**; prompt assembly: **0 ms**

### RAG

- **ebt-corpus** — 114 ms
  - Trigger query: `I’ve been feeling so overwhelmed and it seems like there's no way out. Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen. Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up.`
  - Source titles: not returned
- **cbt-corpus** — 125 ms
  - Trigger query: `I’ve been feeling so overwhelmed and it seems like there's no way out. Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen. Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up.`
  - Source titles: not returned
- **safety-crisis** — 125 ms
  - Trigger query: `I’ve been feeling so overwhelmed and it seems like there's no way out. Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen. Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up.`
  - Source titles: not returned
- **ba-corpus** — 124 ms
  - Trigger query: `I’ve been feeling so overwhelmed and it seems like there's no way out. Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen. Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 355 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 361 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 10

**Transcript checkpoint** (10 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
```

Request latency: **977 ms**; prompt assembly: **0 ms**

### RAG

- **safety-crisis** — 151 ms
  - Trigger query: `know you're not alone, and I'm here to listen. Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?`
  - Source titles: not returned
- **cbt-corpus** — 158 ms
  - Trigger query: `know you're not alone, and I'm here to listen. Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?`
  - Source titles: not returned
- **ebt-corpus** — 159 ms
  - Trigger query: `know you're not alone, and I'm here to listen. Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?`
  - Source titles: not returned
- **ba-corpus** — 204 ms
  - Trigger query: `know you're not alone, and I'm here to listen. Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 394 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 375 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 11

**Transcript checkpoint** (11 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
```

Request latency: **1002 ms**; prompt assembly: **0 ms**

### RAG

- **ebt-corpus** — 184 ms
  - Trigger query: `sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages.`
  - Source titles: not returned
- **safety-crisis** — 182 ms
  - Trigger query: `sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages.`
  - Source titles: not returned
- **ba-corpus** — 181 ms
  - Trigger query: `sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages.`
  - Source titles: not returned
- **cbt-corpus** — 181 ms
  - Trigger query: `sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay. Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 477 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 338 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 12

**Transcript checkpoint** (12 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
```

Request latency: **887 ms**; prompt assembly: **0 ms**

### RAG

- **ebt-corpus** — 152 ms
  - Trigger query: `pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?`
  - Source titles: not returned
- **safety-crisis** — 152 ms
  - Trigger query: `pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?`
  - Source titles: not returned
- **cbt-corpus** — 155 ms
  - Trigger query: `pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?`
  - Source titles: not returned
- **ba-corpus** — 160 ms
  - Trigger query: `pretend here. Your feelings are valid, and it’s important to acknowledge them. Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 291 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 433 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 13

**Transcript checkpoint** (13 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
Patient: I guess I could try tomorrow morning. I’m not making any promises though.
```

Request latency: **898 ms**; prompt assembly: **1 ms**

### RAG

- **safety-crisis** — 143 ms
  - Trigger query: `tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though.`
  - Source titles: not returned
- **ebt-corpus** — 147 ms
  - Trigger query: `tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though.`
  - Source titles: not returned
- **ba-corpus** — 140 ms
  - Trigger query: `tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though.`
  - Source titles: not returned
- **cbt-corpus** — 146 ms
  - Trigger query: `tried to reach out before, but nothing seems to change. It’s just this endless cycle. Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 338 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 404 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 14

**Transcript checkpoint** (14 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
Patient: I guess I could try tomorrow morning. I’m not making any promises though.
Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
```

Request latency: **1085 ms**; prompt assembly: **1 ms**

### RAG

- **safety-crisis** — 128 ms
  - Trigger query: `discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.`
  - Source titles: not returned
- **ba-corpus** — 126 ms
  - Trigger query: `discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.`
  - Source titles: not returned
- **cbt-corpus** — 132 ms
  - Trigger query: `discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.`
  - Source titles: not returned
- **ebt-corpus** — 135 ms
  - Trigger query: `discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 498 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 449 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 15

**Transcript checkpoint** (15 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
Patient: I guess I could try tomorrow morning. I’m not making any promises though.
Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
Patient: Thanks for not pushing me too hard. I’m scared of failing again.
```

Request latency: **869 ms**; prompt assembly: **0 ms**

### RAG

- **safety-crisis** — 140 ms
  - Trigger query: `brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again.`
  - Source titles: not returned
- **cbt-corpus** — 139 ms
  - Trigger query: `brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again.`
  - Source titles: not returned
- **ebt-corpus** — 145 ms
  - Trigger query: `brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again.`
  - Source titles: not returned
- **ba-corpus** — 151 ms
  - Trigger query: `brave step, and it shows that part of you is seeking change, even when it feels impossible. Patient: I just feel so disconnected, like I’m not even part of my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 339 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 370 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 16

**Transcript checkpoint** (16 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
Patient: I guess I could try tomorrow morning. I’m not making any promises though.
Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
Patient: Thanks for not pushing me too hard. I’m scared of failing again.
Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
```

Request latency: **1065 ms**; prompt assembly: **1 ms**

### RAG

- **ebt-corpus** — 155 ms
  - Trigger query: `my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.`
  - Source titles: not returned
- **cbt-corpus** — 154 ms
  - Trigger query: `my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.`
  - Source titles: not returned
- **ba-corpus** — 153 ms
  - Trigger query: `my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.`
  - Source titles: not returned
- **safety-crisis** — 155 ms
  - Trigger query: `my own life anymore. Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 494 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 409 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 17

**Transcript checkpoint** (17 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
Patient: I guess I could try tomorrow morning. I’m not making any promises though.
Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
Patient: Thanks for not pushing me too hard. I’m scared of failing again.
Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
```

Request latency: **1178 ms**; prompt assembly: **0 ms**

### RAG

- **safety-crisis** — 178 ms
  - Trigger query: `to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.`
  - Source titles: not returned
- **ebt-corpus** — 181 ms
  - Trigger query: `to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.`
  - Source titles: not returned
- **cbt-corpus** — 182 ms
  - Trigger query: `to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.`
  - Source titles: not returned
- **ba-corpus** — 184 ms
  - Trigger query: `to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning. Patient: I don’t even know where to start. Everything seems so tangled up. Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 499 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
    Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 484 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
    Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 18

**Transcript checkpoint** (18 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
Patient: I guess I could try tomorrow morning. I’m not making any promises though.
Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
Patient: Thanks for not pushing me too hard. I’m scared of failing again.
Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.
```

Request latency: **1085 ms**; prompt assembly: **0 ms**

### RAG

- **ebt-corpus** — 107 ms
  - Trigger query: `can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.`
  - Source titles: not returned
- **cbt-corpus** — 107 ms
  - Trigger query: `can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.`
  - Source titles: not returned
- **safety-crisis** — 109 ms
  - Trigger query: `can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.`
  - Source titles: not returned
- **ba-corpus** — 110 ms
  - Trigger query: `can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 498 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
    Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
    Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 473 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
    Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
    Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 19

**Transcript checkpoint** (19 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
Patient: I guess I could try tomorrow morning. I’m not making any promises though.
Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
Patient: Thanks for not pushing me too hard. I’m scared of failing again.
Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.
Patient: I’ll think about that. Maybe writing things down could help me make sense of it all.
```

Request latency: **850 ms**; prompt assembly: **1 ms**

### RAG

- **cbt-corpus** — 115 ms
  - Trigger query: `you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time. Patient: I’ll think about that. Maybe writing things down could help me make sense of it all.`
  - Source titles: not returned
- **ebt-corpus** — 126 ms
  - Trigger query: `you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time. Patient: I’ll think about that. Maybe writing things down could help me make sense of it all.`
  - Source titles: not returned
- **safety-crisis** — 128 ms
  - Trigger query: `you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time. Patient: I’ll think about that. Maybe writing things down could help me make sense of it all.`
  - Source titles: not returned
- **ba-corpus** — 127 ms
  - Trigger query: `you think you can do today to feel a bit more connected? Patient: Maybe just getting outside for a walk. I haven’t done that in ages. Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time. Patient: I’ll think about that. Maybe writing things down could help me make sense of it all.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 356 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
    Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
    Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.
    Patient: I’ll think about that. Maybe writing things down could help me make sense of it all.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 355 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
    Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
    Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.
    Patient: I’ll think about that. Maybe writing things down could help me make sense of it all.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`

## Step 20

**Transcript checkpoint** (20 turns):

```text
Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
Patient: I don’t even know where to start. Everything seems so tangled up.
Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
Patient: I guess I could try tomorrow morning. I’m not making any promises though.
Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
Patient: Thanks for not pushing me too hard. I’m scared of failing again.
Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.
Patient: I’ll think about that. Maybe writing things down could help me make sense of it all.
Therapist: That sounds like a great plan. Writing can be a powerful tool for making sense of emotions. Remember, I’m here whenever you need to talk, and you’re not alone in this.
```

Request latency: **1096 ms**; prompt assembly: **1 ms**

### RAG

- **cbt-corpus** — 215 ms
  - Trigger query: `idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time. Patient: I’ll think about that. Maybe writing things down could help me make sense of it all. Therapist: That sounds like a great plan. Writing can be a powerful tool for making sense of emotions. Remember, I’m here whenever you need to talk, and you’re not alone in this.`
  - Source titles: not returned
- **ba-corpus** — 215 ms
  - Trigger query: `idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time. Patient: I’ll think about that. Maybe writing things down could help me make sense of it all. Therapist: That sounds like a great plan. Writing can be a powerful tool for making sense of emotions. Remember, I’m here whenever you need to talk, and you’re not alone in this.`
  - Source titles: not returned
- **safety-crisis** — 217 ms
  - Trigger query: `idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time. Patient: I’ll think about that. Maybe writing things down could help me make sense of it all. Therapist: That sounds like a great plan. Writing can be a powerful tool for making sense of emotions. Remember, I’m here whenever you need to talk, and you’re not alone in this.`
  - Source titles: not returned
- **ebt-corpus** — 228 ms
  - Trigger query: `idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that? Patient: I guess I could try tomorrow morning. I’m not making any promises though. Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough. Patient: Thanks for not pushing me too hard. I’m scared of failing again. Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward. Patient: I’ll try to remember that. It’s just hard to see any progress sometimes. Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time. Patient: I’ll think about that. Maybe writing things down could help me make sense of it all. Therapist: That sounds like a great plan. Writing can be a powerful tool for making sense of emotions. Remember, I’m here whenever you need to talk, and you’re not alone in this.`
  - Source titles: not returned

### Model attempts

- **REALTIME_ANALYSIS_PROMPT** — total 441 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for real-time guidance using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences — speaker labels from voice diarization: "Therapist:" and "Patient:"):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
    Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
    Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.
    Patient: I’ll think about that. Maybe writing things down could help me make sense of it all.
    Therapist: That sounds like a great plan. Writing can be a powerful tool for making sense of emotions. Remember, I’m here whenever you need to talk, and you’re not alone in this.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["relevant quote(s) from the patient"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only, e.g. '988 Suicide & Crisis Lifeline: call or text 988'"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```
- **REALTIME_ANALYSIS_PROMPT_STRICT** — total 423 ms; TTFT None ms; completion after TTFT None ms
  - Prompt sent:

    ```text
    Analyze this therapy segment for CRITICAL guidance only using a Cognitive Behavioral Therapy approach.
    
    TRANSCRIPT (last few sentences):
    Patient: I don’t know if I can keep going. I’ve been feeling so overwhelmed and it seems like there's no way out.
    Therapist: I’m really sorry to hear you’re feeling this way. It sounds incredibly tough. I want you to know you're not alone, and I'm here to listen.
    Patient: Thanks, but I’m not sure what to say. Everything just feels so heavy, and I’m tired of pretending like I’m okay.
    Therapist: It’s okay to feel like that and to express it. You don’t have to pretend here. Your feelings are valid, and it’s important to acknowledge them.
    Patient: I’ve tried to reach out before, but nothing seems to change. It’s just this endless cycle.
    Therapist: It can be so discouraging when it feels like nothing is changing. But reaching out is a brave step, and it shows that part of you is seeking change, even when it feels impossible.
    Patient: I just feel so disconnected, like I’m not even part of my own life anymore.
    Therapist: Feeling disconnected can be frightening and isolating. It’s important to reconnect with yourself and others, and that can start with small steps. Talking about it is a good beginning.
    Patient: I don’t even know where to start. Everything seems so tangled up.
    Therapist: Starting can feel overwhelming, but breaking things down into smaller, manageable pieces can help. What’s one small thing you think you can do today to feel a bit more connected?
    Patient: Maybe just getting outside for a walk. I haven’t done that in ages.
    Therapist: That sounds like a wonderful idea. Fresh air and a change of scenery can sometimes help clear the mind a bit. Would you like to plan when you might do that?
    Patient: I guess I could try tomorrow morning. I’m not making any promises though.
    Therapist: That’s okay. Just considering it is a positive step. You’re doing what you can right now, and that’s enough.
    Patient: Thanks for not pushing me too hard. I’m scared of failing again.
    Therapist: I understand that fear, and it’s okay to feel that way. Remember, it's about progress, not perfection. Each step, no matter how small, is still a step forward.
    Patient: I’ll try to remember that. It’s just hard to see any progress sometimes.
    Therapist: It can be really difficult to see progress when you’re in the thick of things. Maybe keeping a small journal of your feelings and actions could help you see your own journey over time.
    Patient: I’ll think about that. Maybe writing things down could help me make sense of it all.
    Therapist: That sounds like a great plan. Writing can be a powerful tool for making sense of emotions. Remember, I’m here whenever you need to talk, and you’re not alone in this.
    
    PREVIOUS GUIDANCE:
    No previous alert to consider.
    
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
    {}
    
    If guidance is needed, prioritize actionable guidance and return only the MOST RELEVANT single piece of guidance. Format response as a valid JSON object:
    {
        "alert": {
            "timing": "now|pause|info",
            "category": "safety|technique|pathway_change|engagement|process",
            "title": "Brief descriptive title",
            "message": "Specific action or observation (1-3 sentences max)",
            "evidence": ["direct quote showing the critical moment"],
            "recommendation": ["Action 1 to take if applicable", "Action 2 to take if applicable", "Action 3 to take if applicable (max 3 items)"],
            "immediateActions": ["Specific step the therapist should take right now"],
            "contraindications": ["What the therapist should avoid doing in this situation"],
            "crisis_resources": ["Include relevant crisis hotline numbers for safety alerts only"]
        }
    }
    
    NOTE: The 'crisis_resources' field is REQUIRED for all safety alerts (category='safety'). Omit it for non-safety alerts.
    
    IMPORTANT NOTE:
    Always refer to the patient as 'patient'
    
    IMPORTANT LIMITS: Overall response maximum 1000 characters and 200 words. STRICT FIELD CONSTRAINTS: the 'message' field MUST be under 200 characters; the 'title' field MUST be under 50 characters.
    ```

Result: `{"error": "Failed to parse analysis response after retry - no valid JSON found", "raw_response": "('Error code invalid_grant: Refresh token has expired', '{\"error\":\"invalid_grant\",\"error_description\":\"Refresh token has expired\"}')", "trigger_phrase_detected": false, "attempts": ["REALTIME_ANALYSIS_PROMPT", "REALTIME_ANALYSIS_PROMPT_STRICT"], "_diagnostics": {}}`
Diagnostics: `{}`
