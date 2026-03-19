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

# pylint: disable=W1203,C0303,C0301
import functions_framework
from flask import jsonify, Response, request
from google import genai
from google.genai import types
import os
import json
import logging
import re
import time
from typing import List, Dict, Tuple, Optional, Any
from datetime import datetime, timedelta
import threading
import firebase_admin
from firebase_admin import auth, credentials, firestore
from dotenv import load_dotenv
try:
    from . import constants
except ImportError:
    import constants

# Load environment variables
load_dotenv()

# --- Initialize Logging ---
logging.basicConfig(level=logging.INFO)

# --- Initialize Firebase Admin ---
try:
    # Firebase Admin SDK will automatically use the service account when running in Google Cloud
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    logging.info("Firebase Admin SDK initialized")
except Exception as e:
    logging.error(f"Error initializing Firebase Admin SDK: {e}", exc_info=True)

# --- Initialize Firestore Client ---
db = None
try:
    db = firestore.client()
    logging.info("Firestore client initialized")
except Exception as e:
    logging.warning(f"Firestore client init failed (sessions will not persist): {e}")

# --- Load Authorization Configuration from Environment ---
ALLOWED_DOMAINS = set(os.environ.get('AUTH_ALLOWED_DOMAINS', '').split(',')) if os.environ.get('AUTH_ALLOWED_DOMAINS') else set()
ALLOWED_EMAILS = set(os.environ.get('AUTH_ALLOWED_EMAILS', '').split(',')) if os.environ.get('AUTH_ALLOWED_EMAILS') else set()

def extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """
    Simplified JSON extraction from text that may contain extra content.
    Uses only basic strategies for efficient parsing.
    """
    if not text or not text.strip():
        logging.warning("Empty text provided for JSON extraction")
        return None
    
    # Strategy 1: Try to parse the entire text as JSON first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        logging.debug("Failed to parse entire text as JSON, trying regex extraction")
    
    # Strategy 2: Look for JSON objects using basic regex patterns
    json_patterns = [
        # Find JSON that starts with { and ends with } (greedy)
        r'\{.*\}',
        # Find JSON in code blocks
        r'```(?:json)?\s*(\{.*\})\s*```'
    ]
    
    for i, pattern in enumerate(json_patterns):
        try:
            matches = re.finditer(pattern, text, re.DOTALL | re.IGNORECASE)
            for match in matches:
                # For patterns with groups, use the group; otherwise use the full match
                json_text = match.group(1) if match.groups() else match.group(0)
                
                try:
                    parsed = json.loads(json_text.strip())
                    logging.info(f"Successfully extracted JSON using pattern {i+1}")
                    return parsed
                except json.JSONDecodeError:
                    logging.debug(f"Pattern {i+1} matched but JSON parsing failed")
                    continue
        except Exception as e:
            logging.debug(f"Error with pattern {i+1}: {e}")
            continue
    
    # Strategy 3: Attempt to repair truncated JSON (from max_output_tokens cutoff)
    # Find the start of a JSON object and try to close unclosed braces/brackets
    json_start = text.find('{')
    if json_start >= 0:
        truncated = text[json_start:]
        # Remove trailing incomplete strings/keys (anything after last complete value)
        # Try progressively closing open brackets
        for trim_end in range(len(truncated), max(len(truncated) - 200, 0), -1):
            candidate = truncated[:trim_end]
            # Count open/close braces and brackets
            open_braces = candidate.count('{') - candidate.count('}')
            open_brackets = candidate.count('[') - candidate.count(']')
            if open_braces >= 0 and open_brackets >= 0:
                # Strip any trailing comma or incomplete key
                candidate = candidate.rstrip()
                if candidate.endswith(','):
                    candidate = candidate[:-1]
                # Close any remaining open structures
                candidate += ']' * open_brackets + '}' * open_braces
                try:
                    parsed = json.loads(candidate)
                    logging.warning(f"Repaired truncated JSON (closed {open_braces} braces, {open_brackets} brackets)")
                    return parsed
                except json.JSONDecodeError:
                    continue

    logging.error("JSON extraction failed for text:")
    logging.info(text[:500] if len(text) > 500 else text)
    return None

def extract_usage_metadata(chunk) -> Dict[str, Any]:
    """Extract token usage metadata from a Gemini response chunk (usually the last one)."""
    usage = {}
    try:
        if hasattr(chunk, 'usage_metadata') and chunk.usage_metadata:
            meta = chunk.usage_metadata
            usage['prompt_tokens'] = getattr(meta, 'prompt_token_count', None)
            usage['completion_tokens'] = getattr(meta, 'candidates_token_count', None)
            usage['total_tokens'] = getattr(meta, 'total_token_count', None)
            usage['thinking_tokens'] = getattr(meta, 'thoughts_token_count', None)
            usage['cached_tokens'] = getattr(meta, 'cached_content_token_count', None)
    except Exception as e:
        logging.debug(f"Could not extract usage metadata: {e}")
    return usage

def extract_finish_reason(chunk) -> Optional[str]:
    """Extract finish reason from a Gemini response chunk."""
    try:
        if chunk.candidates and chunk.candidates[0]:
            fr = getattr(chunk.candidates[0], 'finish_reason', None)
            return str(fr) if fr else None
    except Exception:
        pass
    return None

def build_diagnostics(
    model: str,
    analysis_type: str,
    prompt_name: str,
    temperature: float,
    max_output_tokens: int,
    thinking_level: Optional[str],
    rag_tools: List[str],
    start_time: float,
    ttft: Optional[float],
    end_time: float,
    token_usage: Dict[str, Any],
    finish_reason: Optional[str],
    grounding_sources: List[Dict],
    response_length: int,
    json_parse_success: bool,
    used_fallback: bool = False,
    trigger_phrase_detected: Optional[bool] = None,
    context_cache_hit: Optional[bool] = None,
) -> Dict[str, Any]:
    """Build a standardized _diagnostics object for the frontend activity log."""
    latency_ms = round((end_time - start_time) * 1000)
    ttft_ms = round((ttft - start_time) * 1000) if ttft else None

    diag = {
        "model": model,
        "analysis_type": analysis_type,
        "prompt_used": prompt_name,
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
        "thinking_level": thinking_level,
        "rag_tools": rag_tools,
        "latency_ms": latency_ms,
        "ttft_ms": ttft_ms,
        "token_usage": token_usage,
        "finish_reason": finish_reason,
        "grounding": {
            "chunks_retrieved": len(grounding_sources),
            "sources": [
                {
                    "title": s.get("source", {}).get("title", "Unknown"),
                    "pages": f"{s['source']['pages']['first']}-{s['source']['pages']['last']}" if s.get("source", {}).get("pages") else None
                }
                for s in grounding_sources
            ]
        },
        "response_length_chars": response_length,
        "json_parse_success": json_parse_success,
        "used_fallback": used_fallback,
        "timestamp": datetime.now().isoformat(),
    }
    if trigger_phrase_detected is not None:
        diag["trigger_phrase_detected"] = trigger_phrase_detected
    if context_cache_hit is not None:
        diag["context_cache_hit"] = context_cache_hit
    return diag

def is_email_authorized(email: str) -> bool:
    """Check if email is authorized based on domain or explicit allowlist"""
    if not email:
        return False
    
    # Check explicit email allowlist
    if email in ALLOWED_EMAILS:
        return True
        
    # Check domain allowlist
    email_domain = email.split('@')[-1] if '@' in email else ''
    return email_domain in ALLOWED_DOMAINS

def verify_firebase_token(token: str) -> Optional[Dict]:
    """Verify Firebase ID token and return decoded claims"""
    try:
        decoded_token = auth.verify_id_token(token)
        email = decoded_token.get('email')
        
        if not is_email_authorized(email):
            logging.warning(f"Unauthorized email attempted access: {email}")
            return None
            
        logging.info(f"Authorized user authenticated: {email}")
        return decoded_token
    except Exception as e:
        logging.error(f"Token verification failed: {e}")
        return None


# --- Initialize Google GenAI ---
try:
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    if not project_id:
        logging.warning("GOOGLE_CLOUD_PROJECT environment variable not set.")
    
    # Initialize the client
    client = genai.Client(
        vertexai=True,
        project=project_id,
        location="us-central1",
    )
    logging.info(f"Google GenAI initialized for project '{project_id}'")
except Exception as e:
    logging.error(f"CRITICAL: Error initializing Google GenAI: {e}", exc_info=True)

# ── Context Caching for System Prompts ───────────────────────────────────────
# Caches the large static portion of the comprehensive analysis prompt
# (risk definitions, calibration rules, JSON schema, diarization instructions).
# This reduces input token costs by ~75% and improves latency for comprehensive analysis.
# Cache TTL is 30 minutes; auto-refreshed when expired.
_cached_content_lock = threading.Lock()
_cached_content_resource = None  # stores the CachedContent resource name
_cached_content_expiry = None    # datetime when the cache expires

# The static system instruction portion of the comprehensive prompt
# (everything EXCEPT the per-request variables like transcript_text, phase, etc.)
COMPREHENSIVE_SYSTEM_INSTRUCTION = constants.COMPREHENSIVE_ANALYSIS_PROMPT.split(
    "CURRENT SESSION CONTEXT:"
)[0] + """CURRENT SESSION CONTEXT:
(provided in the user message below)

""" + constants.COMPREHENSIVE_ANALYSIS_PROMPT.split(
    "Provide analysis with a JSON response only"
)[1] if "CURRENT SESSION CONTEXT:" in constants.COMPREHENSIVE_ANALYSIS_PROMPT else None

# Cache TTL in minutes (Gemini context caching minimum is 1 minute, max 60 minutes)
CACHE_TTL_MINUTES = 30


def _get_or_refresh_cached_content():
    """Get existing cached content or create a new one if expired/missing.

    Returns the cached content resource name, or None if caching is unavailable.
    Thread-safe via lock.
    """
    global _cached_content_resource, _cached_content_expiry

    if not COMPREHENSIVE_SYSTEM_INSTRUCTION:
        return None

    with _cached_content_lock:
        now = datetime.utcnow()

        # Return existing cache if still valid (with 2-minute buffer)
        if _cached_content_resource and _cached_content_expiry and now < (_cached_content_expiry - timedelta(minutes=2)):
            return _cached_content_resource

        # Create new cached content
        try:
            cached = client.caches.create(
                model=constants.MODEL_NAME_PRO,
                config=types.CreateCachedContentConfig(
                    system_instruction=COMPREHENSIVE_SYSTEM_INSTRUCTION,
                    ttl=f"{CACHE_TTL_MINUTES * 60}s",
                    display_name="therassist-comprehensive-system-prompt",
                )
            )
            _cached_content_resource = cached.name
            _cached_content_expiry = now + timedelta(minutes=CACHE_TTL_MINUTES)
            logging.info(f"[CONTEXT CACHE] Created/refreshed cached content: {cached.name} (TTL={CACHE_TTL_MINUTES}min)")
            return _cached_content_resource
        except Exception as e:
            logging.warning(f"[CONTEXT CACHE] Failed to create cached content (falling back to uncached): {e}")
            _cached_content_resource = None
            _cached_content_expiry = None
            return None


# --- Startup Credential Validation ---
def _validate_credentials_at_startup():
    """Log clear warnings if ADC are missing/broken so the developer knows immediately."""
    import google.auth

    creds_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    if creds_path:
        if os.path.exists(creds_path):
            logging.info(f"GOOGLE_APPLICATION_CREDENTIALS set: {creds_path}")
        else:
            logging.critical(
                f"GOOGLE_APPLICATION_CREDENTIALS file not found: {creds_path}. "
                "API calls will fail. Fix the path or run: gcloud auth application-default login"
            )
            return
    else:
        # In Cloud Run, Workload Identity provides credentials via metadata server — no file needed
        if os.environ.get('K_SERVICE'):
            logging.info("Running in Cloud Run — using Workload Identity (no credentials file needed)")
        else:
            # Local dev: check well-known ADC location
            well_known_path = os.path.join(
                os.environ.get('APPDATA', os.path.expanduser('~')),
                'gcloud', 'application_default_credentials.json'
            )
            if os.path.exists(well_known_path):
                logging.info(f"ADC found at well-known path: {well_known_path}")
                logging.warning(
                    "GOOGLE_APPLICATION_CREDENTIALS not set explicitly in .env. "
                    f"Consider adding: GOOGLE_APPLICATION_CREDENTIALS={well_known_path}"
                )
            else:
                logging.critical(
                    "No Application Default Credentials found. API calls WILL FAIL. "
                    "Run: gcloud auth application-default login  OR  "
                    "set GOOGLE_APPLICATION_CREDENTIALS in .env"
                )

    # Attempt to load credentials to validate they are usable
    try:
        cred_obj, cred_project = google.auth.default()
        logging.info(f"Credentials OK — project: {cred_project}, type: {type(cred_obj).__name__}")
    except Exception as e:
        logging.critical(f"google.auth.default() FAILED: {e}. All GenAI API calls will fail.")

_validate_credentials_at_startup()

# Configure RAG tools with EBT manuals, modality-specific research, and transcript patterns
# ── Core RAG Tools (always available) ──────────────────────────────────────────
# EBT Manuals RAG Tool - therapy treatment manuals (PE, CBT-Social Phobia, Deliberate Practice)
MANUAL_RAG_TOOL = types.Tool(
    retrieval=types.Retrieval(
        vertex_ai_search=types.VertexAISearch(
            datastore=f"projects/{project_id}/locations/us/collections/default_collection/dataStores/ebt-corpus"
        )
    )
)

# Transcript Patterns RAG Tool - Beck sessions, PE sessions, ThousandVoicesOfTrauma conversations
TRANSCRIPT_RAG_TOOL = types.Tool(
    retrieval=types.Retrieval(
        vertex_ai_search=types.VertexAISearch(
            datastore=f"projects/{project_id}/locations/us/collections/default_collection/dataStores/transcript-patterns"
        )
    )
)

# ── Modality-Specific RAG Tools ────────────────────────────────────────────────
# CBT Clinical Research - 31 randomized controlled trials and clinical studies
CBT_RAG_TOOL = types.Tool(
    retrieval=types.Retrieval(
        vertex_ai_search=types.VertexAISearch(
            datastore=f"projects/{project_id}/locations/us/collections/default_collection/dataStores/cbt-corpus"
        )
    )
)

# BA (Behavioral Activation) Clinical Research - 11 RCTs and treatment studies
BA_RAG_TOOL = types.Tool(
    retrieval=types.Retrieval(
        vertex_ai_search=types.VertexAISearch(
            datastore=f"projects/{project_id}/locations/us/collections/default_collection/dataStores/ba-corpus"
        )
    )
)

# DBT (Dialectical Behavior Therapy) Clinical Research - 6 RCTs and systematic reviews
DBT_RAG_TOOL = types.Tool(
    retrieval=types.Retrieval(
        vertex_ai_search=types.VertexAISearch(
            datastore=f"projects/{project_id}/locations/us/collections/default_collection/dataStores/dbt-corpus"
        )
    )
)

# IPT (Interpersonal Psychotherapy) Clinical Research - 10 RCTs and meta-analyses
IPT_RAG_TOOL = types.Tool(
    retrieval=types.Retrieval(
        vertex_ai_search=types.VertexAISearch(
            datastore=f"projects/{project_id}/locations/us/collections/default_collection/dataStores/ipt-corpus"
        )
    )
)

# ── Safety & Crisis Protocols (always included, not modality-dependent) ───────
# C-SSRS, Stanley-Brown Safety Plan, SAMHSA crisis de-escalation, Tarasoff
# duty-to-warn summaries, mandatory reporting guidelines, 988 Lifeline standards.
# This RAG tool is ALWAYS added to every session — safety is not modality-specific.
SAFETY_RAG_TOOL = types.Tool(
    retrieval=types.Retrieval(
        vertex_ai_search=types.VertexAISearch(
            datastore=f"projects/{project_id}/locations/us/collections/default_collection/dataStores/safety-crisis"
        )
    )
)

# ── Modality → RAG Tool Mapping ────────────────────────────────────────────────
# Simplified to 3 core therapy types per March 2026 meeting:
#   - CBT umbrella: includes BA, Exposure, ACT techniques (ebt + cbt + ba corpora)
#   - DBT standalone (ebt + dbt corpora)
#   - IPT standalone (ebt + ipt corpora)
#   - MANUAL_RAG_TOOL (ebt-corpus) + SAFETY_RAG_TOOL always included as foundation
#   - Unrecognized types fall back to full CBT umbrella
#
# Values are LISTS of tools (not single tools) to support multi-corpus routing.
MODALITY_RAG_MAP = {
    "CBT":  [CBT_RAG_TOOL, BA_RAG_TOOL],  # CBT umbrella: ebt + cbt + ba (includes BA, Exposure, ACT)
    "DBT":  [DBT_RAG_TOOL],                # DBT standalone: ebt + dbt
    "IPT":  [IPT_RAG_TOOL],                # IPT standalone: ebt + ipt
}

def get_rag_tools_for_session(session_context, is_realtime=False):
    """Select RAG tools based on the session's therapeutic modality.

    Always includes MANUAL_RAG_TOOL (core EBT protocols) as the foundation.
    Adds modality-specific research corpora based on session_type.
    For comprehensive (non-realtime), also adds TRANSCRIPT_RAG_TOOL.

    Returns: list of types.Tool objects (deduplicated)
    """
    session_type = session_context.get("session_type", "CBT") if session_context else "CBT"

    # Core: always include EBT manuals (core protocols) + safety crisis protocols
    tools = [MANUAL_RAG_TOOL, SAFETY_RAG_TOOL]

    # Add modality-specific research corpora
    modality_tools = MODALITY_RAG_MAP.get(session_type, MODALITY_RAG_MAP["CBT"])
    for tool in modality_tools:
        if tool not in tools:
            tools.append(tool)

    # For comprehensive analysis, also include transcript patterns
    if not is_realtime:
        tools.append(TRANSCRIPT_RAG_TOOL)

    # Build readable names for logging
    corpus_names = ["ebt-corpus", "safety-crisis"]
    for tool in modality_tools:
        if tool is CBT_RAG_TOOL: corpus_names.append("cbt-corpus")
        elif tool is BA_RAG_TOOL: corpus_names.append("ba-corpus")
        elif tool is DBT_RAG_TOOL: corpus_names.append("dbt-corpus")
        elif tool is IPT_RAG_TOOL: corpus_names.append("ipt-corpus")

    logging.info(f"[RAG] Session type '{session_type}' → tools: {' + '.join(corpus_names)}"
                 f"{' + transcript-patterns' if not is_realtime else ''}")

    return tools

@functions_framework.http
def therapy_analysis(request):
    """
    HTTP Cloud Function for real-time therapy session analysis.
    Requires Firebase authentication.
    """
    # --- CORS Handling ---
    logging.warning(request.method)
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    # Fast GET health check — lightweight, no Gemini API call, doesn't queue behind analysis
    if request.method == 'GET':
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "unknown").strip()
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
        cred_file_exists = os.path.isfile(cred_path) if cred_path else False
        # Cloud Run sets K_SERVICE automatically — Workload Identity provides credentials via metadata server
        in_cloud_run = os.environ.get("K_SERVICE") is not None
        cred_exists = cred_file_exists or in_cloud_run
        return (jsonify({
            'status': 'healthy',
            'project': project_id,
            'gcp_auth': 'valid' if cred_exists else 'error',
            'gcp_auth_detail': 'Server running, using Workload Identity' if in_cloud_run else ('Server running, credentials file present' if cred_file_exists else 'Credentials file not found'),
            'model_flash': constants.MODEL_NAME,
            'model_pro': constants.MODEL_NAME_PRO,
        }), 200, headers)

    # --- Authentication Check (Disabled for local development) ---
    # For local testing, skip authentication
    # Remove these lines for production deployment
    logging.info("Authentication disabled for local development - REMOVE FOR PRODUCTION")
    # auth_header = request.headers.get('Authorization')
    # if not auth_header or not auth_header.startswith('Bearer '):
    #     logging.warning("Missing or invalid Authorization header")
    #     return (jsonify({'error': 'Authentication required'}), 401, headers)
    # token = auth_header.split(' ')[1]
    # decoded_token = verify_firebase_token(token)
    # if not decoded_token:
    #     return (jsonify({'error': 'Invalid or unauthorized token'}), 401, headers)

    try:
        request_json = request.get_json(silent=True)

        if not request_json:
            logging.warning("Request JSON missing.")
            return (jsonify({'error': 'Missing JSON body'}), 400, headers)

        action = request_json.get('action')
        
        if action == 'health_check':
            return handle_health_check(headers)
        elif action == 'analyze_segment':
            return handle_segment_analysis(request_json, headers)
        elif action == 'pathway_guidance':
            return handle_pathway_guidance(request_json, headers)
        elif action == 'session_summary':
            return handle_session_summary(request_json, headers)
        elif action == 'save_session':
            return handle_save_session(request_json, headers)
        elif action == 'get_sessions':
            return handle_get_sessions(request_json, headers)
        elif action == 'get_patient_summary':
            return handle_get_patient_summary(request_json, headers)
        else:
            return (jsonify({'error': 'Invalid action. Use "health_check", "analyze_segment", "pathway_guidance", "session_summary", "save_session", "get_sessions", or "get_patient_summary"'}), 400, headers)

    except Exception as e:
        logging.exception(f"An unexpected error occurred: {str(e)}")
        return (jsonify({'error': 'An internal server error occurred.'}), 500, headers)

def handle_save_session(request_json, headers):
    """
    Save a completed therapy session to Firestore.
    Expected payload:
      patient_id, date, duration_minutes, summary_text, session_type,
      full_summary (dict), session_metrics (dict)
    """
    if not db:
        logging.warning("[SaveSession] Firestore not available — session not saved")
        return (jsonify({'error': 'Firestore is not configured. Session was not saved.'}), 503, headers)

    try:
        patient_id = request_json.get('patient_id')
        if not patient_id:
            return (jsonify({'error': 'patient_id is required'}), 400, headers)

        doc_data = {
            'patient_id': str(patient_id),
            'date': request_json.get('date', datetime.utcnow().strftime('%Y-%m-%d')),
            'duration_minutes': request_json.get('duration_minutes', 0),
            'summary_text': request_json.get('summary_text', ''),
            'session_type': request_json.get('session_type', 'General'),
            'full_summary': request_json.get('full_summary', {}),
            'session_metrics': request_json.get('session_metrics', {}),
            'created_at': firestore.SERVER_TIMESTAMP,
        }

        doc_ref = db.collection('sessions').add(doc_data)
        doc_id = doc_ref[1].id  # add() returns (write_result, doc_ref)

        logging.info(f"[SaveSession] Saved session {doc_id} for patient {patient_id}")
        return (jsonify({'success': True, 'session_id': doc_id}), 200, headers)

    except Exception as e:
        logging.exception(f"[SaveSession] Error saving session: {e}")
        return (jsonify({'error': f'Failed to save session: {str(e)}'}), 500, headers)


def handle_get_sessions(request_json, headers):
    """
    Retrieve therapy sessions from Firestore for a given patient.
    Expected payload: patient_id
    Returns array of session records ordered by date descending.
    """
    if not db:
        logging.warning("[GetSessions] Firestore not available — returning empty list")
        return (jsonify({'sessions': []}), 200, headers)

    try:
        patient_id = request_json.get('patient_id')
        if not patient_id:
            return (jsonify({'error': 'patient_id is required'}), 400, headers)

        sessions_ref = db.collection('sessions')
        query = sessions_ref.where('patient_id', '==', str(patient_id)).order_by('date', direction=firestore.Query.DESCENDING)
        docs = query.stream()

        sessions = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            # Convert Firestore timestamps to ISO strings for JSON serialization
            if data.get('created_at') and hasattr(data['created_at'], 'isoformat'):
                data['created_at'] = data['created_at'].isoformat()
            sessions.append(data)

        logging.info(f"[GetSessions] Retrieved {len(sessions)} sessions for patient {patient_id}")
        return (jsonify({'sessions': sessions}), 200, headers)

    except Exception as e:
        logging.exception(f"[GetSessions] Error retrieving sessions: {e}")
        return (jsonify({'error': f'Failed to retrieve sessions: {str(e)}'}), 500, headers)


def handle_health_check(headers):
    """
    Health check that validates GCP authentication by making a lightweight Gemini API call.
    Returns status with specific error details if auth is expired or misconfigured.
    """
    health = {
        "status": "healthy",
        "project": project_id or "NOT_SET",
        "model_flash": constants.MODEL_NAME,
        "model_pro": constants.MODEL_NAME_PRO,
        "gcp_auth": "unknown",
        "gcp_auth_detail": "",
    }

    # Check if project_id is set
    if not project_id:
        health["status"] = "unhealthy"
        health["gcp_auth"] = "error"
        health["gcp_auth_detail"] = "GOOGLE_CLOUD_PROJECT environment variable not set"
        return (jsonify(health), 200, headers)

    # Check if GenAI client exists
    try:
        if not client:
            health["status"] = "unhealthy"
            health["gcp_auth"] = "error"
            health["gcp_auth_detail"] = "GenAI client failed to initialize"
            return (jsonify(health), 200, headers)
    except NameError:
        health["status"] = "unhealthy"
        health["gcp_auth"] = "error"
        health["gcp_auth_detail"] = "GenAI client not defined"
        return (jsonify(health), 200, headers)

    # Test actual GCP auth by making a lightweight Gemini call
    try:
        test_response = client.models.generate_content(
            model=constants.MODEL_NAME,
            contents="Say hello",
            config=types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=10,
            ),
        )
        # If we get here without an exception, auth is valid
        health["gcp_auth"] = "valid"
        health["gcp_auth_detail"] = "GCP credentials verified - Gemini API responding"
    except Exception as e:
        error_msg = str(e)
        health["status"] = "unhealthy"
        health["gcp_auth"] = "expired"
        # Provide specific, actionable error messages
        if "invalid_grant" in error_msg or "Refresh token has expired" in error_msg:
            health["gcp_auth_detail"] = "OAuth token expired. Run: gcloud auth application-default login --workforce"
        elif "PERMISSION_DENIED" in error_msg:
            health["gcp_auth_detail"] = "Permission denied. Check project IAM roles for your account."
        elif "Could not automatically determine credentials" in error_msg:
            health["gcp_auth_detail"] = "No credentials found. Run: gcloud auth application-default login --workforce"
        else:
            health["gcp_auth_detail"] = f"GCP API error: {error_msg[:200]}"

    logging.info(f"Health check: {health['status']} - GCP auth: {health['gcp_auth']}")
    return (jsonify(health), 200, headers)


def handle_segment_analysis(request_json, headers):
    """Handle real-time analysis of therapy session segments with streaming"""
    try:
        transcript_segment = request_json.get('transcript_segment', [])
        session_context = request_json.get('session_context', {})
        session_duration = request_json.get('session_duration_minutes', 0)
        is_realtime = request_json.get('is_realtime', False)  # Flag for fast real-time analysis
        previous_alert = request_json.get('previous_alert', None)  # Previous alert for deduplication
        job_id = request_json.get('job_id', None)  # Job ID for pairing realtime + comprehensive results

        logging.info(f"Segment analysis request - duration: {session_duration} minutes, segments: {len(transcript_segment)}, realtime: {is_realtime}, has_previous_alert: {previous_alert is not None}, job_id: {job_id}")
        logging.info(f"Transcript segment: {transcript_segment[-1]}")
        
        if not transcript_segment:
            return (jsonify({'error': 'Missing transcript_segment'}), 400, headers)

        # Determine therapy phase
        phase = determine_therapy_phase(session_duration)

        # Format transcript
        transcript_text = format_transcript_segment(transcript_segment)

        # ── SAFETY KEYWORD SCANNER (runs BEFORE every LLM call) ──────────
        safety_scan = detect_safety_keywords(transcript_text)
        if safety_scan["detected"]:
            logging.warning(f"[SAFETY] Deterministic scanner triggered: {safety_scan['matched_categories']}")

        # Log timing for diagnostics
        analysis_start = datetime.now()
        logging.info(f"[TIMING] Analysis started at: {analysis_start.isoformat()}")

        # Format previous alert context for deduplication
        if previous_alert and is_realtime:
            # Only use previous alert context for real-time analysis (where we generate alerts)
            previous_alert_context = f"""
Title: {previous_alert.get('title', 'N/A')}
Category: {previous_alert.get('category', 'N/A')}
Message: {previous_alert.get('message', 'N/A')}
Recommendation: {previous_alert.get('recommendation', 'N/A')}
Timing: {previous_alert.get('timing', 'N/A')}
"""
        else:
            previous_alert_context = "No previous alert to consider."

        # Choose analysis mode based on is_realtime flag
        if is_realtime:
            # For realtime analysis, we'll use a retry mechanism with two different prompts
            return handle_realtime_analysis_with_retry(
                transcript_segment, transcript_text, previous_alert_context, phase, headers, job_id,
                session_context=session_context, safety_scan=safety_scan
            )
        else:
            # COMPREHENSIVE PATH: Full analysis with RAG
            # If safety scanner fired, inject safety context into the prompt
            safety_prefix = safety_scan["prompt_injection"] if safety_scan["detected"] else ""

            analysis_prompt = safety_prefix + constants.COMPREHENSIVE_ANALYSIS_PROMPT.format(
                phase=phase,
                phase_focus=constants.THERAPY_PHASES[phase]['focus'],
                session_duration=session_duration,
                session_type=session_context.get('session_type', 'General Therapy'),
                primary_concern=session_context.get('primary_concern', 'Not specified'),
                current_approach=session_context.get('current_approach', 'Not specified'),
                transcript_text=transcript_text
            )

            # Select modality-specific RAG tools
            rag_tools = get_rag_tools_for_session(session_context, is_realtime=False)
            return handle_comprehensive_analysis(
                analysis_prompt, phase, headers, job_id,
                rag_tools=rag_tools, safety_scan=safety_scan
            )
        
    except Exception as e:
        logging.exception(f"Error in handle_segment_analysis: {str(e)}")
        return (jsonify({'error': f'Segment analysis failed: {str(e)}'}), 500, headers)

def check_for_trigger_phrases(transcript_segment):
    """Check if the most recent transcript item contains any trigger phrases"""
    if not transcript_segment:
        return False

    # Get the most recent item in the transcript
    latest_item = transcript_segment[-1]
    latest_text = latest_item.get('text', '').lower()

    # Check against all trigger phrases
    for phrase in constants.TRIGGER_PHRASES:
        if phrase.lower() in latest_text:
            logging.info(f"Trigger phrase '{phrase}' found in latest transcript item")
            return True

    return False


def detect_safety_keywords(transcript_text: str) -> Dict[str, Any]:
    """
    Deterministic safety keyword scanner — runs BEFORE every LLM call.

    Scans transcript text against hard-coded keyword lists in constants.SAFETY_KEYWORDS.
    Returns match details if any safety keywords are found.

    Returns:
        Dict with 'detected' (bool), 'matched_categories' (list),
        'matched_keywords' (list), 'highest_severity' (str),
        'clinical_responses' (list of response dicts),
        'prompt_injection' (str to prepend to LLM prompt)
    """
    result = {
        "detected": False,
        "matched_categories": [],
        "matched_keywords": [],
        "highest_severity": None,
        "clinical_responses": [],
        "prompt_injection": "",
    }

    if not transcript_text:
        return result

    text_lower = transcript_text.lower()

    # Severity ranking: suicidal_ideation and violence_homicide are highest
    SEVERITY_ORDER = [
        "suicidal_ideation",    # Highest — immediate life threat to self
        "violence_homicide",    # Highest — immediate life threat to others
        "abuse_disclosure",     # High — mandatory reporting obligations
        "self_harm",            # High — active self-injury
        "substance_crisis",     # Moderate-High — medical risk
    ]

    for category in SEVERITY_ORDER:
        keywords = constants.SAFETY_KEYWORDS.get(category, [])
        matched = [kw for kw in keywords if kw.lower() in text_lower]

        if matched:
            result["detected"] = True
            result["matched_categories"].append(category)
            result["matched_keywords"].extend(matched)

            # Add clinical response template for this category
            clinical_response = constants.SAFETY_CLINICAL_RESPONSES.get(category, {})
            if clinical_response:
                result["clinical_responses"].append({
                    "category": category,
                    **clinical_response
                })

            # Set highest severity (first match in severity order wins)
            if result["highest_severity"] is None:
                result["highest_severity"] = category

    # Build prompt injection string if safety detected
    if result["detected"]:
        result["prompt_injection"] = constants.SAFETY_CONTEXT_INJECTION.format(
            matched_categories=", ".join(result["matched_categories"]),
            matched_keywords=", ".join(result["matched_keywords"][:10]),  # Cap at 10 to avoid prompt bloat
        )
        logging.warning(
            f"[SAFETY SCANNER] Keywords detected! Categories: {result['matched_categories']}, "
            f"Keywords: {result['matched_keywords'][:5]}..."
        )

    return result

def handle_realtime_analysis_with_retry(transcript_segment, transcript_text, previous_alert_context, phase, headers, job_id=None, session_context=None, safety_scan=None):
    """Handle realtime analysis with retry mechanism using different prompts.

    If safety_scan detected keywords, the safety context is injected into the
    prompt and we force non-strict mode to ensure the LLM generates a safety alert.
    """
    safety_scan = safety_scan or {"detected": False}

    # Select modality-specific RAG tools for realtime
    realtime_rag_tools = get_rag_tools_for_session(session_context, is_realtime=True)
    _session_type = (session_context or {}).get("session_type", "CBT")
    # Build tool names for logging (reflects multi-corpus routing)
    _realtime_rag_tool_names = ["ebt-corpus", "safety-crisis"]
    for _t in MODALITY_RAG_MAP.get(_session_type, [CBT_RAG_TOOL]):
        if _t is CBT_RAG_TOOL: _realtime_rag_tool_names.append("cbt-corpus")
        elif _t is BA_RAG_TOOL: _realtime_rag_tool_names.append("ba-corpus")
        elif _t is DBT_RAG_TOOL: _realtime_rag_tool_names.append("dbt-corpus")
        elif _t is IPT_RAG_TOOL: _realtime_rag_tool_names.append("ipt-corpus")

    def try_analysis_with_prompt(prompt_template, prompt_name):
        """Helper function to try analysis with a specific prompt"""
        try:
            current_approach = (session_context or {}).get('current_approach', 'Cognitive Behavioral Therapy')

            # If safety scanner fired, prepend safety context to the prompt
            safety_prefix = safety_scan.get("prompt_injection", "") if safety_scan.get("detected") else ""

            analysis_prompt = safety_prefix + prompt_template.format(
                transcript_text=transcript_text,
                previous_alert_context=previous_alert_context,
                current_approach=current_approach
            )

            contents = [types.Content(
                role="user",
                parts=[types.Part(text=analysis_prompt)]
            )]

            # FAST configuration for real-time guidance
            # Note: Realtime analysis uses no thinking config for maximum speed (Gemini 3 Flash)
            config = types.GenerateContentConfig(
                temperature=0.0,  # Deterministic for speed
                max_output_tokens=2048,  # Sufficient for complete JSON responses
                safety_settings=[
                    types.SafetySetting(
                        category="HARM_CATEGORY_HARASSMENT",
                        threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_HATE_SPEECH",
                        threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold="OFF"
                    )
                ],
                # NO RAG tools for realtime — retrieval adds 10+ seconds latency
                # Flash has sufficient training knowledge for quick safety/technique alerts
                # RAG grounding is used only for comprehensive analysis (Pro)
            )

            logging.info(f"[TIMING] Trying realtime analysis with {prompt_name}")

            # Collect response text and grounding metadata
            accumulated_text = ""
            grounding_chunks = []
            rt_start = time.perf_counter()
            rt_ttft = None
            last_chunk = None
            chunk_count = 0
            for chunk in client.models.generate_content_stream(
                model=constants.MODEL_NAME,
                contents=contents,
                config=config
            ):
                chunk_count += 1
                if rt_ttft is None and chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
                    rt_ttft = time.perf_counter()
                last_chunk = chunk

                if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
                    for part in chunk.candidates[0].content.parts:
                        if hasattr(part, 'text') and part.text:
                            accumulated_text += part.text

                # Extract grounding metadata (usually in final chunk)
                if chunk.candidates and hasattr(chunk.candidates[0], 'grounding_metadata'):
                    metadata = chunk.candidates[0].grounding_metadata
                    if hasattr(metadata, 'grounding_chunks') and metadata.grounding_chunks:
                        for idx, g_chunk in enumerate(metadata.grounding_chunks):
                            g_data = {
                                "citation_number": idx + 1,
                            }
                            if g_chunk.retrieved_context:
                                ctx = g_chunk.retrieved_context
                                g_data["source"] = {
                                    "title": ctx.title if hasattr(ctx, 'title') and ctx.title else "Clinical Manual",
                                    "uri": ctx.uri if hasattr(ctx, 'uri') and ctx.uri else None,
                                    "excerpt": ctx.text if hasattr(ctx, 'text') and ctx.text else None
                                }
                                if hasattr(ctx, 'rag_chunk') and ctx.rag_chunk:
                                    if hasattr(ctx.rag_chunk, 'page_span') and ctx.rag_chunk.page_span:
                                        g_data["source"]["pages"] = {
                                            "first": ctx.rag_chunk.page_span.first_page,
                                            "last": ctx.rag_chunk.page_span.last_page
                                        }
                            grounding_chunks.append(g_data)

            rt_end = time.perf_counter()
            # Extract token usage and finish reason from last chunk
            token_usage = extract_usage_metadata(last_chunk) if last_chunk else {}
            finish_reason = extract_finish_reason(last_chunk) if last_chunk else None

            logging.info(f"Response received from {prompt_name} - length: {len(accumulated_text)} characters, grounding_chunks: {len(grounding_chunks)}, latency: {round((rt_end - rt_start)*1000)}ms, tokens: {token_usage}")

            # Try to parse the JSON response
            parsed = extract_json_from_text(accumulated_text)

            if parsed is not None:
                logging.info(f"Successfully parsed JSON from {prompt_name}")
                # Build diagnostics for this attempt
                diag = build_diagnostics(
                    model=constants.MODEL_NAME,
                    analysis_type="realtime",
                    prompt_name=prompt_name,
                    temperature=0.0,
                    max_output_tokens=2048,
                    thinking_level=None,
                    rag_tools=_realtime_rag_tool_names,
                    start_time=rt_start,
                    ttft=rt_ttft,
                    end_time=rt_end,
                    token_usage=token_usage,
                    finish_reason=finish_reason,
                    grounding_sources=grounding_chunks,
                    response_length=len(accumulated_text),
                    json_parse_success=True,
                )
                return parsed, accumulated_text, grounding_chunks, diag
            else:
                # Log first 200 characters of response on parsing failure
                response_preview = accumulated_text[:200] if accumulated_text else "No response received"
                logging.error(f"JSON parsing failed for {prompt_name}. First 200 characters of response: {response_preview} - {str(parsed)}")
                logging.warning(f"Full response from {prompt_name}: {accumulated_text}")
                diag = build_diagnostics(
                    model=constants.MODEL_NAME,
                    analysis_type="realtime",
                    prompt_name=prompt_name,
                    temperature=0.0,
                    max_output_tokens=2048,
                    thinking_level=None,
                    rag_tools=_realtime_rag_tool_names,
                    start_time=rt_start,
                    ttft=rt_ttft,
                    end_time=rt_end,
                    token_usage=token_usage,
                    finish_reason=finish_reason,
                    grounding_sources=grounding_chunks,
                    response_length=len(accumulated_text),
                    json_parse_success=False,
                )
                return None, accumulated_text, [], diag

        except Exception as e:
            logging.error(f"Error during {prompt_name} analysis: {str(e)}")
            return None, str(e), [], {}
    
    def generate():
        """Generator function for streaming response with retry logic"""
        try:
            # Check for trigger phrases to determine prompt selection
            has_trigger_phrase = check_for_trigger_phrases(transcript_segment)
            has_safety_keywords = safety_scan.get("detected", False)

            if has_safety_keywords:
                # Safety keywords detected — ALWAYS use non-strict prompt to ensure alert generation
                first_prompt = constants.REALTIME_ANALYSIS_PROMPT
                first_prompt_name = "REALTIME_ANALYSIS_PROMPT"
                fallback_prompt = constants.REALTIME_ANALYSIS_PROMPT_STRICT
                fallback_prompt_name = "REALTIME_ANALYSIS_PROMPT_STRICT"
                logging.warning("[SAFETY] Forcing non-strict prompt due to safety keyword detection")
            else:
                # Always use non-strict prompt first — strict was suppressing guidance
                # after 1-2 alerts because it defaults to empty JSON and treats same-category
                # as reason to return nothing.  Non-strict generates guidance freely;
                # strict is kept as a safety-net fallback only.
                first_prompt = constants.REALTIME_ANALYSIS_PROMPT
                first_prompt_name = "REALTIME_ANALYSIS_PROMPT"
                fallback_prompt = constants.REALTIME_ANALYSIS_PROMPT_STRICT
                fallback_prompt_name = "REALTIME_ANALYSIS_PROMPT_STRICT"
                if has_trigger_phrase:
                    logging.info("Trigger phrase detected - using non-strict prompt first")
                else:
                    logging.info("Using non-strict prompt first for continuous guidance")
            
            # First attempt with selected prompt
            parsed_result, response_text, citations, diag = try_analysis_with_prompt(
                first_prompt,
                first_prompt_name
            )

            if parsed_result is not None:
                # If first attempt returned empty JSON (no alert), try fallback
                # before giving up — the non-strict prompt can still return {}
                # when dedup rules suppress it, but the strict prompt with
                # different framing may produce different guidance.
                if not parsed_result.get("alert") and not has_safety_keywords:
                    logging.info(f"{first_prompt_name} returned empty JSON (no alert) — trying fallback {fallback_prompt_name}")
                    fallback_parsed, fallback_text, fallback_citations, fallback_diag = try_analysis_with_prompt(
                        fallback_prompt,
                        fallback_prompt_name
                    )
                    if fallback_parsed is not None and fallback_parsed.get("alert"):
                        parsed_result = fallback_parsed
                        citations = fallback_citations
                        diag = fallback_diag
                        if diag:
                            diag['used_fallback'] = True
                        logging.info(f"Fallback {fallback_prompt_name} produced alert — using it")

                # If safety scanner fired but LLM returned empty JSON (no alert),
                # inject a deterministic safety alert from the clinical response templates
                if has_safety_keywords and not parsed_result.get("alert"):
                    logging.warning("[SAFETY] LLM returned empty JSON despite safety keywords — injecting deterministic alert")
                    primary_response = safety_scan.get("clinical_responses", [{}])[0] if safety_scan.get("clinical_responses") else {}
                    parsed_result["alert"] = {
                        "timing": "now",
                        "category": "safety",
                        "title": primary_response.get("title", "Safety Concern Detected"),
                        "message": primary_response.get("message", "Safety keywords detected in patient speech. Conduct immediate assessment."),
                        "evidence": safety_scan.get("matched_keywords", [])[:5],
                        "recommendation": primary_response.get("immediate_actions", ["Conduct immediate safety assessment"]),
                        "immediateActions": primary_response.get("immediate_actions", []),
                        "contraindications": primary_response.get("contraindications", []),
                        "crisis_resources": primary_response.get("crisis_resources", ["988 Suicide & Crisis Lifeline: call or text 988"]),
                    }

                # Add safety scan metadata to response
                if has_safety_keywords:
                    parsed_result["safety_scan"] = {
                        "scanner_triggered": True,
                        "categories": safety_scan.get("matched_categories", []),
                        "keywords_matched": safety_scan.get("matched_keywords", [])[:10],
                        "highest_severity": safety_scan.get("highest_severity"),
                    }
                    # Add crisis_resources to alert if present but missing the field
                    if parsed_result.get("alert") and not parsed_result["alert"].get("crisis_resources"):
                        primary_response = safety_scan.get("clinical_responses", [{}])[0] if safety_scan.get("clinical_responses") else {}
                        parsed_result["alert"]["crisis_resources"] = primary_response.get("crisis_resources", [])

                # Success with first prompt
                parsed_result['timestamp'] = datetime.now().isoformat()
                parsed_result['session_phase'] = phase
                parsed_result['analysis_type'] = 'realtime'
                parsed_result['prompt_used'] = 'non-strict' if (has_trigger_phrase or has_safety_keywords) else 'strict'
                parsed_result['trigger_phrase_detected'] = has_trigger_phrase
                parsed_result['safety_keywords_detected'] = has_safety_keywords
                if job_id is not None:
                    parsed_result['job_id'] = job_id
                if citations:
                    parsed_result['citations'] = citations
                    logging.info(f"Added {len(citations)} citations to realtime response")
                # Add diagnostics
                if diag:
                    diag['trigger_phrase_detected'] = has_trigger_phrase
                    diag['safety_keywords_detected'] = has_safety_keywords
                    parsed_result['_diagnostics'] = diag

                yield json.dumps(parsed_result) + "\n"
                return

            # First attempt failed, try with fallback prompt
            logging.info(f"{first_prompt_name} failed, retrying with fallback {fallback_prompt_name}")

            parsed_result, response_text, citations, diag = try_analysis_with_prompt(
                fallback_prompt,
                fallback_prompt_name
            )

            if parsed_result is not None:
                # Success with fallback prompt
                parsed_result['timestamp'] = datetime.now().isoformat()
                parsed_result['session_phase'] = phase
                parsed_result['analysis_type'] = 'realtime'
                parsed_result['prompt_used'] = 'strict' if has_trigger_phrase else 'non-strict'
                parsed_result['trigger_phrase_detected'] = has_trigger_phrase
                parsed_result['used_fallback'] = True
                if job_id is not None:
                    parsed_result['job_id'] = job_id
                if citations:
                    parsed_result['citations'] = citations
                    logging.info(f"Added {len(citations)} citations to realtime fallback response")
                # Add diagnostics
                if diag:
                    diag['used_fallback'] = True
                    diag['trigger_phrase_detected'] = has_trigger_phrase
                    parsed_result['_diagnostics'] = diag

                yield json.dumps(parsed_result) + "\n"
                return

            # Both attempts failed
            logging.error("Both prompts failed to produce valid JSON")
            yield json.dumps({
                'error': 'Failed to parse analysis response after retry - no valid JSON found',
                'raw_response': response_text[:200] if response_text else 'No response received',
                'trigger_phrase_detected': has_trigger_phrase,
                'attempts': [first_prompt_name, fallback_prompt_name],
                '_diagnostics': diag if diag else {}
            }) + "\n"
            
        except Exception as e:
            logging.exception(f"Error during realtime analysis with retry: {str(e)}")
            yield json.dumps({'error': f'Realtime analysis failed: {str(e)}'}) + "\n"
    
    return Response(generate(), mimetype='text/plain', headers=headers)

def handle_comprehensive_analysis(analysis_prompt, phase, headers, job_id=None, rag_tools=None, safety_scan=None):
    """Handle comprehensive analysis (non-realtime)"""
    safety_scan = safety_scan or {"detected": False}

    def generate():
        """Generator function for comprehensive analysis streaming"""
        chunk_index = 0
        accumulated_text = ""
        grounding_chunks = []

        try:
            contents = [types.Content(
                role="user",
                parts=[types.Part(text=analysis_prompt)]
            )]

            # COMPREHENSIVE configuration for full analysis — optimized for speed
            # gemini-2.5-pro uses thinking_budget (integer), not thinking_level (semantic)
            thinking_budget = 8192  # Optimized clinical reasoning — fast + high quality

            # Escalate thinking budget only if safety scanner detected keywords in TRANSCRIPT
            # (not the prompt template, which always contains safety-related terms)
            if safety_scan.get("detected"):
                thinking_budget = 16384  # Extended reasoning for safety-critical situations
                logging.warning(f"[SAFETY] Escalated thinking_budget to {thinking_budget} due to safety keyword detection")

            thinking_level = f"budget_{thinking_budget}"  # For diagnostics logging only

            # ── Context Caching: disabled when RAG tools are present ──────────
            # Gemini API requires tools/system_instruction NOT be set in request when using cached_content.
            # Since RAG tools vary per modality, we skip caching to preserve grounding quality.
            cached_content_name = None if rag_tools else _get_or_refresh_cached_content()
            using_cache = cached_content_name is not None

            config = types.GenerateContentConfig(
                temperature=0.1,  # Near-deterministic for speed + consistency
                max_output_tokens=4096,  # Ample headroom for comprehensive JSON
                thinking_config=types.ThinkingConfig(
                    thinking_budget=thinking_budget,
                    include_thoughts=False
                ),
                cached_content=cached_content_name,
                safety_settings=[
                    types.SafetySetting(
                        category="HARM_CATEGORY_HARASSMENT",
                        threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_HATE_SPEECH",
                        threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold="OFF"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold="OFF"
                    )
                ],
                tools=rag_tools or [MANUAL_RAG_TOOL, CBT_RAG_TOOL, BA_RAG_TOOL, TRANSCRIPT_RAG_TOOL],
            )

            # Compute tool names for diagnostics
            _comp_tool_names = []
            if rag_tools:
                for t in rag_tools:
                    try:
                        ds_path = t.retrieval.vertex_ai_search.datastore
                        _comp_tool_names.append(ds_path.split("/")[-1])
                    except Exception:
                        _comp_tool_names.append("unknown")
            else:
                _comp_tool_names = ["ebt-corpus", "cbt-corpus", "ba-corpus", "transcript-patterns"]

            # Use Flash for comprehensive analysis — 2-4x faster than Pro with comparable clinical quality
            comprehensive_model = constants.MODEL_NAME  # gemini-2.5-flash
            cache_status = f"cached={cached_content_name[:40]}..." if using_cache else "uncached"
            logging.info(f"[TIMING] Calling Gemini model '{comprehensive_model}' for comprehensive analysis ({cache_status}) with RAG tools: {_comp_tool_names}")

            # Stream the response from the model
            comp_start = time.perf_counter()
            comp_ttft = None
            last_chunk = None
            for chunk in client.models.generate_content_stream(
                model=comprehensive_model,
                contents=contents,
                config=config
            ):
                chunk_index += 1
                last_chunk = chunk

                # Extract text from chunk
                if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
                    if comp_ttft is None:
                        comp_ttft = time.perf_counter()
                    for part in chunk.candidates[0].content.parts:
                        if hasattr(part, 'text') and part.text:
                            accumulated_text += part.text

                # Check for grounding metadata (usually only in final chunk)
                if chunk.candidates and hasattr(chunk.candidates[0], 'grounding_metadata'):
                    metadata = chunk.candidates[0].grounding_metadata
                    if hasattr(metadata, 'grounding_chunks') and metadata.grounding_chunks:
                        logging.info(f"Found {len(metadata.grounding_chunks)} grounding chunks in chunk {chunk_index}")

                        for idx, g_chunk in enumerate(metadata.grounding_chunks):
                            g_data = {
                                "citation_number": idx + 1,  # Maps to [1], [2], etc in text
                            }

                            if g_chunk.retrieved_context:
                                ctx = g_chunk.retrieved_context
                                g_data["source"] = {
                                    "title": ctx.title if hasattr(ctx, 'title') and ctx.title else "EBT Manual",
                                    "uri": ctx.uri if hasattr(ctx, 'uri') and ctx.uri else None,
                                    "excerpt": ctx.text if hasattr(ctx, 'text') and ctx.text else None
                                }

                                # Include page information if available
                                if hasattr(ctx, 'rag_chunk') and ctx.rag_chunk:
                                    if hasattr(ctx.rag_chunk, 'page_span') and ctx.rag_chunk.page_span:
                                        g_data["source"]["pages"] = {
                                            "first": ctx.rag_chunk.page_span.first_page,
                                            "last": ctx.rag_chunk.page_span.last_page
                                        }

                            grounding_chunks.append(g_data)

            comp_end = time.perf_counter()
            # Extract token usage and finish reason from last chunk
            token_usage = extract_usage_metadata(last_chunk) if last_chunk else {}
            finish_reason = extract_finish_reason(last_chunk) if last_chunk else None

            logging.info(f"Comprehensive analysis streaming complete - {chunk_index} chunks, {len(accumulated_text)} characters, latency: {round((comp_end - comp_start)*1000)}ms, tokens: {token_usage}")

            # Parse the accumulated JSON response using robust extraction
            parsed = extract_json_from_text(accumulated_text)

            if parsed is not None:
                # Add metadata
                parsed['timestamp'] = datetime.now().isoformat()
                parsed['session_phase'] = phase
                parsed['analysis_type'] = 'comprehensive'
                if job_id is not None:
                    parsed['job_id'] = job_id

                # Add grounding citations if available
                if grounding_chunks:
                    parsed['citations'] = grounding_chunks
                    logging.info(f"Added {len(grounding_chunks)} citations to response")

                # Add diagnostics
                parsed['_diagnostics'] = build_diagnostics(
                    model=comprehensive_model,
                    analysis_type="comprehensive",
                    prompt_name="COMPREHENSIVE_ANALYSIS_PROMPT",
                    temperature=0.1,
                    max_output_tokens=2048,
                    thinking_level=thinking_level,
                    rag_tools=_comp_tool_names,
                    start_time=comp_start,
                    ttft=comp_ttft,
                    end_time=comp_end,
                    token_usage=token_usage,
                    finish_reason=finish_reason,
                    grounding_sources=grounding_chunks,
                    response_length=len(accumulated_text),
                    json_parse_success=True,
                    context_cache_hit=using_cache,
                )

                yield json.dumps(parsed) + "\n"
            else:
                logging.error(f"Failed to extract JSON from comprehensive analysis response: {accumulated_text[:500]}...")
                yield json.dumps({
                    'error': 'Failed to parse analysis response - no valid JSON found',
                    'raw_response': accumulated_text[:200] if accumulated_text else 'No response received',
                    '_diagnostics': build_diagnostics(
                        model=comprehensive_model,
                        analysis_type="comprehensive",
                        prompt_name="COMPREHENSIVE_ANALYSIS_PROMPT",
                        temperature=0.1,
                        max_output_tokens=2048,
                        thinking_level=thinking_level,
                        rag_tools=_comp_tool_names,
                        start_time=comp_start,
                        ttft=comp_ttft,
                        end_time=comp_end,
                        token_usage=token_usage,
                        finish_reason=finish_reason,
                        grounding_sources=grounding_chunks,
                        response_length=len(accumulated_text),
                        json_parse_success=False,
                    )
                }) + "\n"

        except Exception as e:
            logging.exception(f"Error during comprehensive analysis streaming: {str(e)}")
            yield json.dumps({'error': f'Analysis failed: {str(e)}'}) + "\n"
    
    return Response(generate(), mimetype='text/plain', headers=headers)

def handle_pathway_guidance(request_json, headers):
    """Provide specific pathway guidance based on current session state"""
    try:
        current_approach = request_json.get('current_approach', '')
        session_history = request_json.get('session_history', [])
        presenting_issues = request_json.get('presenting_issues', [])
        session_context = request_json.get('session_context', {})

        logging.info(f"Pathway guidance request for approach: {current_approach}")

        # Format session history
        history_summary = summarize_session_history(session_history)

        # Create pathway guidance prompt
        guidance_prompt = constants.PATHWAY_GUIDANCE_PROMPT.format(
            current_approach=current_approach,
            presenting_issues=', '.join(presenting_issues),
            history_summary=history_summary
        )

        contents = [types.Content(
            role="user",
            parts=[types.Part(text=guidance_prompt)]
        )]

        # Select modality-specific RAG tools (realtime=True → no transcript patterns)
        pathway_rag_tools = get_rag_tools_for_session(session_context, is_realtime=True)

        config = types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=2048,
            tools=pathway_rag_tools,
            thinking_config=types.ThinkingConfig(
                thinking_budget=16384,  # Enhanced clinical reasoning — budget allows deeper pathway analysis
                include_thoughts=False
            ),
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="OFF"
                )
            ]
        )
        
        response = client.models.generate_content(
            model=constants.MODEL_NAME_PRO,
            contents=contents,
            config=config
        )

        response_text = ""
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            response_text = response.candidates[0].content.parts[0].text

        # Parse JSON response using robust extraction
        parsed_response = extract_json_from_text(response_text)

        if parsed_response:
            # Add grounding metadata if available (same format as segment analysis)
            if response.candidates[0].grounding_metadata:
                metadata = response.candidates[0].grounding_metadata
                if hasattr(metadata, 'grounding_chunks') and metadata.grounding_chunks:
                    citations = []
                    for idx, g_chunk in enumerate(metadata.grounding_chunks):
                        citation_data = {
                            "citation_number": idx + 1,  # Maps to [1], [2], etc in text
                        }
                        
                        if g_chunk.retrieved_context:
                            ctx = g_chunk.retrieved_context
                            citation_data["source"] = {
                                "title": ctx.title if hasattr(ctx, 'title') and ctx.title else "EBT Manual",
                                "uri": ctx.uri if hasattr(ctx, 'uri') and ctx.uri else None,
                                "excerpt": ctx.text if hasattr(ctx, 'text') and ctx.text else None
                            }
                            
                            # Include page information if available
                            if hasattr(ctx, 'rag_chunk') and ctx.rag_chunk:
                                if hasattr(ctx.rag_chunk, 'page_span') and ctx.rag_chunk.page_span:
                                    citation_data["source"]["pages"] = {
                                        "first": ctx.rag_chunk.page_span.first_page,
                                        "last": ctx.rag_chunk.page_span.last_page
                                    }
                        
                        citations.append(citation_data)
                    
                    parsed_response['citations'] = citations
                    logging.info(f"Added {len(citations)} citations to pathway guidance response")
            
            return (jsonify(parsed_response), 200, headers)
        else:
            # Log first 200 characters of response on parsing failure
            response_preview = response_text[:200] if response_text else "No response received"
            logging.error(f"JSON parsing failed for pathway guidance. First 200 characters of response: {response_preview}")
            logging.error(f"Failed to extract JSON from pathway guidance response: {response_text[:500]}...")
            return (jsonify({
                'error': 'Failed to parse pathway guidance response - no valid JSON found',
                'raw_response': response_preview
            }), 500, headers)
        
    except Exception as e:
        logging.exception(f"Error in handle_pathway_guidance: {str(e)}")
        return (jsonify({'error': f'Pathway guidance failed: {str(e)}'}), 500, headers)

def handle_session_summary(request_json, headers):
    """Generate session summary with key therapeutic moments"""
    try:
        full_transcript = request_json.get('full_transcript', [])
        session_metrics = request_json.get('session_metrics', {})
        session_context = request_json.get('session_context', {})

        logging.info(f"Session summary request - transcript length: {len(full_transcript)}")

        transcript_text = format_transcript_segment(full_transcript)

        summary_prompt = constants.SESSION_SUMMARY_PROMPT.format(
            transcript_text=transcript_text,
            session_metrics=json.dumps(session_metrics, indent=2)
        )

        contents = [types.Content(
            role="user",
            parts=[types.Part(text=summary_prompt)]
        )]

        # Select modality-specific RAG tools
        summary_rag_tools = get_rag_tools_for_session(session_context, is_realtime=True)

        config = types.GenerateContentConfig(
            temperature=0.2,  # Consistent, slightly creative for homework/recommendations
            max_output_tokens=4096,
            tools=summary_rag_tools,
            thinking_config=types.ThinkingConfig(
                thinking_budget=24576,  # Deep session summary analysis — maximize quality for final report
                include_thoughts=False
            ),
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="OFF"
                )
            ]
        )
        
        response = client.models.generate_content(
            model=constants.MODEL_NAME_PRO,
            contents=contents,
            config=config
        )

        response_text = ""
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            response_text = response.candidates[0].content.parts[0].text

        # Parse JSON response using robust extraction
        parsed_response = extract_json_from_text(response_text)

        if parsed_response:
            # Extract grounding citations if available
            if response.candidates[0].grounding_metadata:
                metadata = response.candidates[0].grounding_metadata
                if hasattr(metadata, 'grounding_chunks') and metadata.grounding_chunks:
                    citations = []
                    for idx, g_chunk in enumerate(metadata.grounding_chunks):
                        citation_data = {
                            "citation_number": idx + 1,
                        }
                        if g_chunk.retrieved_context:
                            ctx = g_chunk.retrieved_context
                            citation_data["source"] = {
                                "title": ctx.title if hasattr(ctx, 'title') and ctx.title else "Clinical Manual",
                                "uri": ctx.uri if hasattr(ctx, 'uri') and ctx.uri else None,
                                "excerpt": ctx.text if hasattr(ctx, 'text') and ctx.text else None
                            }
                            if hasattr(ctx, 'rag_chunk') and ctx.rag_chunk:
                                if hasattr(ctx.rag_chunk, 'page_span') and ctx.rag_chunk.page_span:
                                    citation_data["source"]["pages"] = {
                                        "first": ctx.rag_chunk.page_span.first_page,
                                        "last": ctx.rag_chunk.page_span.last_page
                                    }
                        citations.append(citation_data)

                    parsed_response['citations'] = citations
                    logging.info(f"Added {len(citations)} citations to session summary response")

            return (jsonify({'summary': parsed_response}), 200, headers)
        else:
            # Return raw text if JSON parsing fails
            logging.warning(f"Failed to extract JSON from session summary response: {response_text[:500]}...")
            return (jsonify({'summary': response_text}), 200, headers)
        
    except Exception as e:
        logging.exception(f"Error in handle_session_summary: {str(e)}")
        return (jsonify({'error': f'Session summary failed: {str(e)}'}), 500, headers)

# ── Patient-facing summary (filtered subset of SessionSummary) ────────────────
def handle_get_patient_summary(request_json, headers):
    """
    Return a patient-safe subset of a session summary.

    Strips out clinical-internal fields that patients should not see:
      - risk_assessment (level + factors)
      - techniques_used (clinician metric)
      - manual_reference on homework (EBT citations)
      - key_moments (therapist review data)

    Keeps:
      - session_date, duration_minutes
      - progress_indicators (positively framed)
      - homework_assignments (task + rationale only)
      - follow_up_recommendations

    Input:  { "action": "get_patient_summary", "full_summary": { ...SessionSummary } }
    Output: { "patient_summary": { ...filtered fields } }
    """
    try:
        full_summary = request_json.get('full_summary', {})
        if not full_summary:
            return (jsonify({'error': 'full_summary is required'}), 400, headers)

        # Build patient-safe subset
        patient_summary = {
            'session_date': full_summary.get('session_date', ''),
            'duration_minutes': full_summary.get('duration_minutes', 0),
            'progress_indicators': full_summary.get('progress_indicators', []),
            'homework_assignments': [
                {
                    'task': hw.get('task', ''),
                    'rationale': hw.get('rationale', ''),
                    # Intentionally omit manual_reference — patient doesn't need EBT citations
                }
                for hw in full_summary.get('homework_assignments', [])
            ],
            'follow_up_recommendations': full_summary.get('follow_up_recommendations', []),
        }

        logging.info(f"Patient summary generated — {len(patient_summary['homework_assignments'])} homework items, "
                      f"{len(patient_summary['progress_indicators'])} progress indicators")

        return (jsonify({'patient_summary': patient_summary}), 200, headers)

    except Exception as e:
        logging.exception(f"Error in handle_get_patient_summary: {str(e)}")
        return (jsonify({'error': f'Patient summary failed: {str(e)}'}), 500, headers)


# Helper functions
def determine_therapy_phase(duration_minutes: int) -> str:
    """Determine current phase of therapy session based on duration"""
    if duration_minutes <= 10:
        return "beginning"
    elif duration_minutes <= 40:
        return "middle"
    else:
        return "end"

def format_transcript_segment(segment: List[Dict]) -> str:
    """Format transcript segment for analysis"""
    formatted = []
    for entry in segment:
        speaker = entry.get('speaker', 'Unknown')
        text = entry.get('text', '')
        timestamp = entry.get('timestamp', '')
        
        # Clean up speaker labels
        if speaker == 'conversation':
            # Try to infer speaker from text
            if text.startswith('Therapist:') or text.startswith('T:'):
                speaker = 'Therapist'
                text = text.split(':', 1)[1].strip() if ':' in text else text
            elif text.startswith('Client:') or text.startswith('C:') or text.startswith('Patient:') or text.startswith('P:'):
                speaker = 'Client'
                text = text.split(':', 1)[1].strip() if ':' in text else text
        
        if timestamp:
            formatted.append(f"[{timestamp}] {speaker}: {text}")
        else:
            formatted.append(f"{speaker}: {text}")
    
    return '\n'.join(formatted)

def summarize_session_history(history: List[Dict]) -> str:
    """Create brief summary of session history"""
    if not history:
        return "No previous sessions"
    
    summary_points = []
    for session in history[-3:]:  # Last 3 sessions
        date = session.get('date', 'Unknown date')
        main_topics = session.get('main_topics', [])
        summary_points.append(f"{date}: {', '.join(main_topics)}")
    
    return '; '.join(summary_points) if summary_points else "Recent session data"
