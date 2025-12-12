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
from typing import List, Dict, Tuple, Optional, Any
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import auth, credentials
from dotenv import load_dotenv
from . import constants

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
    
    logging.error("JSON extraction failed for text:")
    logging.info(text)
    return None

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
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        logging.warning("GOOGLE_CLOUD_PROJECT environment variable not set.")
    
    # Initialize the client
    client = genai.Client(
        vertexai=True,
        project=project_id,
        location="global",  # Using global for Discovery Engine
    )
    logging.info(f"Google GenAI initialized for project '{project_id}'")
except Exception as e:
    logging.error(f"CRITICAL: Error initializing Google GenAI: {e}", exc_info=True)

# Configure RAG tools with both EBT manuals and transcript patterns
# EBT Manuals RAG Tool (existing)
MANUAL_RAG_TOOL = types.Tool(
    retrieval=types.Retrieval(
        vertex_ai_search=types.VertexAISearch(
            datastore=f"projects/{project_id}/locations/global/collections/default_collection/dataStores/ebt-corpus"
        )
    )
)

# Transcript Patterns RAG Tool (new)
TRANSCRIPT_RAG_TOOL = types.Tool(
    retrieval=types.Retrieval(
        vertex_ai_search=types.VertexAISearch(
            datastore=f"projects/{project_id}/locations/global/collections/default_collection/dataStores/transcript-patterns"
        )
    )
)

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

    if request.method != 'POST':
        logging.warning(f"Received non-POST request: {request.method}")
        return (jsonify({'error': 'Method not allowed. Use POST.'}), 405, headers)

    # --- Authentication Check ---
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        logging.warning("Missing or invalid Authorization header")
        return (jsonify({'error': 'Authentication required'}), 401, headers)
    token = auth_header.split(' ')[1]
    decoded_token = verify_firebase_token(token)
    if not decoded_token:
        return (jsonify({'error': 'Invalid or unauthorized token'}), 401, headers)

    try:
        request_json = request.get_json(silent=True)

        if not request_json:
            logging.warning("Request JSON missing.")
            return (jsonify({'error': 'Missing JSON body'}), 400, headers)

        action = request_json.get('action')
        
        if action == 'analyze_segment':
            return handle_segment_analysis(request_json, headers)
        elif action == 'pathway_guidance':
            return handle_pathway_guidance(request_json, headers)
        elif action == 'session_summary':
            return handle_session_summary(request_json, headers)
        else:
            return (jsonify({'error': 'Invalid action. Use "analyze_segment", "pathway_guidance", or "session_summary"'}), 400, headers)

    except Exception as e:
        logging.exception(f"An unexpected error occurred: {str(e)}")
        return (jsonify({'error': 'An internal server error occurred.'}), 500, headers)

def handle_segment_analysis(request_json, headers):
    """Handle real-time analysis of therapy session segments with streaming"""
    try:
        transcript_segment = request_json.get('transcript_segment', [])
        session_context = request_json.get('session_context', {})
        session_duration = request_json.get('session_duration_minutes', 0)
        is_realtime = request_json.get('is_realtime', False)  # Flag for fast real-time analysis
        previous_alert = request_json.get('previous_alert', None)  # Previous alert for deduplication
        
        logging.info(f"Segment analysis request - duration: {session_duration} minutes, segments: {len(transcript_segment)}, realtime: {is_realtime}, has_previous_alert: {previous_alert is not None}")
        logging.info(f"Transcript segment: {transcript_segment[-1]}")
        
        if not transcript_segment:
            return (jsonify({'error': 'Missing transcript_segment'}), 400, headers)

        # Determine therapy phase
        phase = determine_therapy_phase(session_duration)
        
        # Format transcript
        transcript_text = format_transcript_segment(transcript_segment)
        
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
                transcript_segment, transcript_text, previous_alert_context, phase, headers
            )
        else:
            # COMPREHENSIVE PATH: Full analysis with RAG
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

def handle_realtime_analysis_with_retry(transcript_segment, transcript_text, previous_alert_context, phase, headers):
    """Handle realtime analysis with retry mechanism using different prompts"""
    
    def try_analysis_with_prompt(prompt_template, prompt_name):
        """Helper function to try analysis with a specific prompt"""
        try:
            analysis_prompt = prompt_template.format(
                transcript_text=transcript_text,
                previous_alert_context=previous_alert_context
            )
            
            contents = [types.Content(
                role="user",
                parts=[types.Part(text=analysis_prompt)]
            )]
            
            # FAST configuration for real-time guidance
            config = types.GenerateContentConfig(
                temperature=0.0,  # Deterministic for speed
                max_output_tokens=300,  # Minimal output
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
                tools=[],  # No RAG for speed
                thinking_config=types.ThinkingConfig(
                    thinking_budget=0,  # Zero thinking for fastest response
                    include_thoughts=False
                ),
            )
            
            logging.info(f"[TIMING] Trying realtime analysis with {prompt_name}")
            
            # Collect response text
            accumulated_text = ""
            for chunk in client.models.generate_content_stream(
                model=constants.MODEL_NAME,
                contents=contents,
                config=config
            ):
                if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
                    for part in chunk.candidates[0].content.parts:
                        if hasattr(part, 'text') and part.text:
                            accumulated_text += part.text
            
            logging.info(f"Response received from {prompt_name} - length: {len(accumulated_text)} characters")
            
            # Try to parse the JSON response
            parsed = extract_json_from_text(accumulated_text)
            
            if parsed is not None:
                logging.info(f"Successfully parsed JSON from {prompt_name}")
                return parsed, accumulated_text
            else:
                # Log first 200 characters of response on parsing failure
                response_preview = accumulated_text[:200] if accumulated_text else "No response received"
                logging.error(f"JSON parsing failed for {prompt_name}. First 200 characters of response: {response_preview} - {str(parsed)}")
                logging.warning(f"Full response from {prompt_name}: {accumulated_text}")
                return None, accumulated_text
                
        except Exception as e:
            logging.error(f"Error during {prompt_name} analysis: {str(e)}")
            return None, str(e)
    
    def generate():
        """Generator function for streaming response with retry logic"""
        try:
            # Check for trigger phrases to determine prompt selection
            has_trigger_phrase = check_for_trigger_phrases(transcript_segment)
            
            if has_trigger_phrase:
                # Trigger phrase found - use non-strict prompt first
                first_prompt = constants.REALTIME_ANALYSIS_PROMPT
                first_prompt_name = "REALTIME_ANALYSIS_PROMPT"
                fallback_prompt = constants.REALTIME_ANALYSIS_PROMPT_STRICT
                fallback_prompt_name = "REALTIME_ANALYSIS_PROMPT_STRICT"
                logging.info("Trigger phrase detected - using non-strict prompt first")
            else:
                # No trigger phrase - use strict prompt first (original behavior)
                first_prompt = constants.REALTIME_ANALYSIS_PROMPT_STRICT
                first_prompt_name = "REALTIME_ANALYSIS_PROMPT_STRICT"
                fallback_prompt = constants.REALTIME_ANALYSIS_PROMPT
                fallback_prompt_name = "REALTIME_ANALYSIS_PROMPT"
                logging.info("No trigger phrase detected - using strict prompt first")
            
            # First attempt with selected prompt
            parsed_result, response_text = try_analysis_with_prompt(
                first_prompt, 
                first_prompt_name
            )
            
            if parsed_result is not None:
                # Success with first prompt
                parsed_result['timestamp'] = datetime.now().isoformat()
                parsed_result['session_phase'] = phase
                parsed_result['analysis_type'] = 'realtime'
                parsed_result['prompt_used'] = 'non-strict' if has_trigger_phrase else 'strict'
                parsed_result['trigger_phrase_detected'] = has_trigger_phrase
                
                yield json.dumps(parsed_result) + "\n"
                return
            
            # First attempt failed, try with fallback prompt
            logging.info(f"{first_prompt_name} failed, retrying with fallback {fallback_prompt_name}")
            
            parsed_result, response_text = try_analysis_with_prompt(
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
                
                yield json.dumps(parsed_result) + "\n"
                return
            
            # Both attempts failed
            logging.error("Both prompts failed to produce valid JSON")
            yield json.dumps({
                'error': 'Failed to parse analysis response after retry - no valid JSON found',
                'raw_response': response_text[:200] if response_text else 'No response received',
                'trigger_phrase_detected': has_trigger_phrase,
                'attempts': [first_prompt_name, fallback_prompt_name]
            }) + "\n"
            
        except Exception as e:
            logging.exception(f"Error during realtime analysis with retry: {str(e)}")
            yield json.dumps({'error': f'Realtime analysis failed: {str(e)}'}) + "\n"
    
    return Response(generate(), mimetype='text/plain', headers=headers)

def handle_comprehensive_analysis(analysis_prompt, phase, headers):
    """Handle comprehensive analysis (non-realtime)"""
    
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
            
            # COMPREHENSIVE configuration for full analysis
            thinking_budget = 8192  # Moderate complexity for balanced analysis
            
            # Determine if we need more complex reasoning
            if "suicide" in analysis_prompt.lower() or "self-harm" in analysis_prompt.lower():
                thinking_budget = 24576  # Maximum for critical situations
            
            config = types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=4096,
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
                tools=[MANUAL_RAG_TOOL, TRANSCRIPT_RAG_TOOL],
                thinking_config=types.ThinkingConfig(
                    thinking_budget=thinking_budget,
                    include_thoughts=False  # Don't include thoughts in response
                ),
            )
            
            logging.info(f"[TIMING] Calling Gemini model '{constants.MODEL_NAME}' for comprehensive analysis, thinking_budget: {thinking_budget}")
            
            # Stream the response from the model
            for chunk in client.models.generate_content_stream(
                model=constants.MODEL_NAME,
                contents=contents,
                config=config
            ):
                chunk_index += 1
                
                # Extract text from chunk
                if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
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
            
            logging.info(f"Comprehensive analysis streaming complete - {chunk_index} chunks, {len(accumulated_text)} characters")
            
            # Parse the accumulated JSON response using robust extraction
            parsed = extract_json_from_text(accumulated_text)
            
            if parsed is not None:
                # Add metadata
                parsed['timestamp'] = datetime.now().isoformat()
                parsed['session_phase'] = phase
                parsed['analysis_type'] = 'comprehensive'
                
                # Add grounding citations if available
                if grounding_chunks:
                    parsed['citations'] = grounding_chunks
                    logging.info(f"Added {len(grounding_chunks)} citations to response")
                
                yield json.dumps(parsed) + "\n"
            else:
                logging.error(f"Failed to extract JSON from comprehensive analysis response: {accumulated_text[:500]}...")
                yield json.dumps({
                    'error': 'Failed to parse analysis response - no valid JSON found',
                    'raw_response': accumulated_text[:200] if accumulated_text else 'No response received'
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
        
        config = types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=2048,
            tools=[MANUAL_RAG_TOOL],
            thinking_config=types.ThinkingConfig(
                thinking_budget=24576,  # Complex clinical reasoning
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
            model=constants.MODEL_NAME,
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
        
        config = types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=4096,
            tools=[MANUAL_RAG_TOOL],
            thinking_config=types.ThinkingConfig(
                thinking_budget=16384,  # Moderate complexity for summary
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
            model=constants.MODEL_NAME,
            contents=contents,
            config=config
        )
        
        response_text = ""
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            response_text = response.candidates[0].content.parts[0].text
        
        # Parse JSON response using robust extraction
        parsed_response = extract_json_from_text(response_text)
        
        if parsed_response:
            return (jsonify({'summary': parsed_response}), 200, headers)
        else:
            # Return raw text if JSON parsing fails
            logging.warning(f"Failed to extract JSON from session summary response: {response_text[:500]}...")
            return (jsonify({'summary': response_text}), 200, headers)
        
    except Exception as e:
        logging.exception(f"Error in handle_session_summary: {str(e)}")
        return (jsonify({'error': f'Session summary failed: {str(e)}'}), 500, headers)

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
