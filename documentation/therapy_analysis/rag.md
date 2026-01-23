## created w/ gemini CLI assistance
# High Level Description of RAG backend

Retrieval-Augmented Generation in ther-assist is triggered by the frontend

-> `frontend/components/NewSession.tsx` `frontend/hooks/useTherapyAnalysis.ts`
periodically requests analysis based on conversation based on input, calls `useTherapyAnalysis` (first w/ `isRealtime` set to `true`, then `false`), which `await` `response.data` from `axios.post` to backend.
#TODO elaborate addn. triggers 

Retrieval-Augmented Generation in ther-assist is implemented in the backend via multiple sub-modules.

-> `setup_services/rag`
loads `setup_services/rag/corpus` and `setup_services/rag/transcripts`
via `setup_*_datastore.py` scripts

-> `backend/therapy-analysis-function`
backend to format and call queries to LLM. Queries configured with `*_PROMPT` in `constants.py` while `main.py` contains the `request` `functions_framework.http` entrypoint at `def therapy_analysis(request):`

# Component pointers


## Setup

### setup_services/rag/setup_rag_datastore.py

creates the Google Cloud Storage (GCS) bucket `<PROJECT_ID>-ebt-corpus`
uploads all files found in `setup_services/rag/corpus` to the ebt-corpus GCS bucket.
creates a `Vertex AI` datastore which includes: 
    processed `corpus` chunks
    `metadata/indexing` hooks

### setup_services/rag/setup_transcript_datastore.py

creates the Google Cloud Storage (GCS) bucket `<PROJECT_ID>-transcript-patterns`
uploads all files found in `setup_services/rag/transcripts` to the transcript GCS bucket.
   some metadata is already added in `process_json_conversation` and `process_pdf_transcript`
https://github.com/jchen6727/gcaimh-ther-assist/blob/main/setup_services/rag/setup_transcript_datastore.py#L159
https://github.com/jchen6727/gcaimh-ther-assist/blob/main/setup_services/rag/setup_transcript_datastore.py#L179
`trauma` -> `PTSD`
`BB3` -> `Beck CBT`
`PE` -> `PE/PTSD`
else:
`General`
Creates an additional pattern library `therapeutic_pattern_library.txt` of manually curated text for the LLM
creates a `Vertex AI` datastore which includes:
    processed `transcripts` chunks
        PLUS the processed `therapeutic_pattern_library.txt`
    `metadata/indexing` hooks

### setup_services/rag/setup_transcript_datastore_resumable.py

More robust `setup_transcript_datastore.py`...


## Frontend

### frontend/components/NewSession.tsx

https://github.com/jchen6727/gcaimh-ther-assist/blob/main/frontend/components/NewTherSession.tsx#L81

the trigger for analysis is in `NewSession` `useEffect` block:

https://github.com/jchen6727/gcaimh-ther-assist/blob/main/frontend/components/NewSession.tsx#L384

see defined `WORDS_PER_ANALYSIS` and `TRANSCRIPT_WINDOW_MINUTES` which control logic for capturing a frame of the transcript and then triggering `analyzeSegmentRef` with `is_realtime` set to `true` then `false`

https://github.com/jchen6727/gcaimh-ther-assist/blob/main/frontend/components/NewSession.tsx#L414-L431

```ts
        if (recentTranscript.length > 0) {
          // Get the most recent alert for backend deduplication
          const recentAlert = alertsRef.current.length > 0 ? alertsRef.current[0] : null;
          
          // Trigger both real-time and comprehensive analysis
          analyzeSegmentRef.current(
            recentTranscript,
            { ...sessionContextRef.current, is_realtime: true },
            Math.floor(sessionDurationRef.current / 60),
            recentAlert
          );
          
          analyzeSegmentRef.current(
            recentTranscript,
            { ...sessionContextRef.current, is_realtime: false },
            Math.floor(sessionDurationRef.current / 60)
          );
        }
```

`NewSession.tsx`                       -> `useTherapyAnalysis.ts`
`analyzeSegmentRef`-> `analyzeSegment` -> `useTherapyAnalysis`

### frontend/hooks/useTherapyAnalysis.ts

https://github.com/jchen6727/gcaimh-ther-assist/blob/main/frontend/hooks/useTherapyAnalysis.ts#L26

calls `analyzeSegment` on `word count trigger`->
https://github.com/jchen6727/gcaimh-ther-assist/blob/main/frontend/hooks/useTherapyAnalysis.ts#L58
```ts
      const response = await axios.post(`${ANALYSIS_API}/therapy_analysis`, requestPayload, {
        responseType: 'text',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
```


DEAD CODE `getPathwayGuidance` ->
https://github.com/jchen6727/gcaimh-ther-assist/blob/main/frontend/hooks/useTherapyAnalysis.ts#L111
```ts
      const response = await axios.post(`${ANALYSIS_API}/therapy_analysis`, {
        action: 'pathway_guidance',
        current_approach: currentApproach,
        session_history: sessionHistory,
        presenting_issues: presentingIssues,
      }, {
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      })
```

calls `generateSessionSummary` on `session end`->
(#TODO called upon ending session -- elaborate hook later)
https://github.com/jchen6727/gcaimh-ther-assist/blob/main/frontend/hooks/useTherapyAnalysis.ts#L156
```ts
      const summaryReqBody = {
          action: 'session_summary',
          full_transcript: fullTranscript,
          session_metrics: sessionMetrics,
        }
      console.log(`[Summary] 📤 REQUEST:`, summaryReqBody);
      const response = await axios.post(`${ANALYSIS_API}/therapy_analysis`, summaryReqBody, {
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
```


## backend

### backend/therapy-analysis-function/main.py

entrypoint to service axios POST requests in `therapy_analysis`
https://github.com/jchen6727/gcaimh-ther-assist/blob/main/backend/therapy-analysis-function/main.py#L161

frontend will request each service upon trigger, `therapy_analysis` redirects based on `action` what logic is performed.

https://github.com/jchen6727/gcaimh-ther-assist/blob/main/backend/therapy-analysis-function/main.py#L206
```python
        if action == 'analyze_segment':
            return handle_segment_analysis(request_json, headers)
        elif action == 'pathway_guidance':
            return handle_pathway_guidance(request_json, headers)
        elif action == 'session_summary':
            return handle_session_summary(request_json, headers)
        else:
            return (jsonify({'error': 'Invalid action. Use "analyze_segment", "pathway_guidance", or "session_summary"'}), 400, headers)
```
NOTE `pathway_guidance` is DEAD CODE (cannot find hook for execution.)


`handle_segment_analysis` performs both `is_realtime == True` analysis and `is_realtime == False` analysis, with both POST made sequentially and handled asynchronously.
https://github.com/jchen6727/gcaimh-ther-assist/blob/main/backend/therapy-analysis-function/main.py#L258

#### handle_realtime_analysis_with_retry
for `is_realtime`: NOTE! NO RAG ASSISTANCE IS USED WITHIN THIS!

```python
            return handle_realtime_analysis_with_retry(
                transcript_segment, transcript_text, previous_alert_context, phase, headers
            )
```

this function calls:

generate() -> entrypoint (0 budget) streaming response with retry logic
    check_for_trigger_phrases() -> logic to order queries, either `constants.REALTIME_*_PROMPT` OR `constants.REALTIME_*_STRICT` first, depending on:
```python
        for phrase in constants.TRIGGER_PHRASES:
        if phrase.lower() in latest_text:
            logging.info(f"Trigger phrase '{phrase}' found in latest transcript item")
            return True
```
    with first successful query being "kept".
    try_analysis_with_prompt() -> formats prompt from template, then queries LLM and receives/parses/returns `json` that was generated by Gemini.

#### handle_comprehensive_analysis
for `NOT` `is_realtime`: (RAG assistance from BOTH `corpus` and `transcripts` utilized)
https://github.com/jchen6727/gcaimh-ther-assist/blob/main/backend/therapy-analysis-function/main.py#L264
```python
            analysis_prompt = constants.COMPREHENSIVE_ANALYSIS_PROMPT.format(
                phase=phase,
                phase_focus=constants.THERAPY_PHASES[phase]['focus'],
                session_duration=session_duration,
                session_type=session_context.get('session_type', 'General Therapy'),
                primary_concern=session_context.get('primary_concern', 'Not specified'),
                current_approach=session_context.get('current_approach', 'Not specified'),
                transcript_text=transcript_text
            )
            
            return handle_comprehensive_analysis(analysis_prompt, phase, headers)
```

this function uses one `constants.COMPREHENSIVE_ANALYSIS_PROMPT` as the template for its prompt...

it calls:
generate() -> 
    entrypoint comprehensive analysis (8192->24576 budget) with two RAG tools:
        `MANUAL_RAG_TOOL` -> "from" `corpus`
        `TRANSCRIPT_RAG_TOOL` -> "from" `transcripts` (and `therapeutic_pattern_library.txt`)
    then receives LLM retrieved context, does minor formatting on references, and returns `json`

https://github.com/jchen6727/gcaimh-ther-assist/blob/main/backend/therapy-analysis-function/main.py#L492

#### DEAD CODE handle_pathway_guidance
DEAD CODE
RAG assistance from ONLY `corpus` utilized (budget 24576)
similar to `handle_comprehensive_analysis` - see `PATHWAY_GUIDANCE_PROMPT`
https://github.com/jchen6727/gcaimh-ther-assist/blob/main/backend/therapy-analysis-function/constants.py#L204


#### handle_session_summary
RAG assistance from ONLY `corpus` utilized (budget 16384)
similar to `handle_comprehensive_analysis` - see `SESSION_SUMMARY_PROMPT`
https://github.com/jchen6727/gcaimh-ther-assist/blob/491d8b12926b1e8ce7d20d5ab713131721829306/backend/therapy-analysis-function/constants.py#L235

### backend/therapy-analysis-function/constants.py
Contains LLM prompts used within `backend/therapy-analysis-function/main.py`. Note that the `{}` enclosed kwargs are formatted within `main.py`

Addn.:
`MODEL_NAME`
`TRIGGER_PHRASES`
`THERAPY_PHASES`
#TODO link ref. later.

