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

"""
Therapy Session Streaming Service — Speech-to-Text v2

Receives raw PCM 16kHz 16-bit mono audio from the browser via WebSocket,
streams it to Google Cloud Speech-to-Text v2 for real-time transcription,
and sends transcripts back to the frontend. Clinical analysis is handled
by the separate therapy-analysis HTTP backend (Gemini Pro + RAG).

Also runs a deterministic safety keyword scanner on every transcript
to flag crisis language immediately.
"""

import os
import json
import asyncio
import logging
import threading
import queue
from typing import Generator, Optional
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from google.cloud import speech_v2
from google.cloud.speech_v2 import types
import google.auth
import firebase_admin
from firebase_admin import auth, credentials

from prompts import SAFETY_KEYWORDS

# Load environment variables
load_dotenv('.env')
if os.path.exists('.env.development'):
    load_dotenv('.env.development', override=True)
    logger_env = "development"
else:
    logger_env = "production"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Initialize Firebase Admin ---
try:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    logger.info("Firebase Admin SDK initialized")
except Exception as e:
    logger.error(f"Error initializing Firebase Admin SDK: {e}", exc_info=True)

# --- Load Authorization Configuration from Environment ---
ALLOWED_DOMAINS = set(os.environ.get('AUTH_ALLOWED_DOMAINS', '').split(',')) if os.environ.get('AUTH_ALLOWED_DOMAINS') else set()
ALLOWED_EMAILS = set(os.environ.get('AUTH_ALLOWED_EMAILS', '').split(',')) if os.environ.get('AUTH_ALLOWED_EMAILS') else set()


def is_email_authorized(email: str) -> bool:
    if not email:
        return False
    if email in ALLOWED_EMAILS:
        return True
    email_domain = email.split('@')[-1] if '@' in email else ''
    return email_domain in ALLOWED_DOMAINS


def verify_firebase_token(token: str) -> Optional[dict]:
    try:
        decoded_token = auth.verify_id_token(token)
        email = decoded_token.get('email')
        if not is_email_authorized(email):
            logger.warning(f"Unauthorized email attempted access: {email}")
            return None
        logger.info(f"Authorized user authenticated: {email}")
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None


# Initialize FastAPI app
app = FastAPI(title="Therapy Session Streaming Service — STT v2")

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    decoded_token = verify_firebase_token(credentials.credentials)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid or unauthorized token")
    return decoded_token


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Google Cloud Configuration ---
# .strip() guards against CRLF-corrupted .env files on Windows
project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
if not project_id:
    raise ValueError("GOOGLE_CLOUD_PROJECT environment variable must be set")

location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1").strip()
logger.info(f"Using Google Cloud project: {project_id}, location: {location}")

# Initialize Speech client with regional endpoint (required by org policy)
speech_client = speech_v2.SpeechClient(
    client_options={"api_endpoint": f"{location}-speech.googleapis.com"}
)
logger.info(f"Speech client initialized: {location}-speech.googleapis.com")


def scan_safety_keywords(text: str) -> list[dict]:
    """Deterministic safety keyword scan."""
    text_lower = text.lower()
    matches = []
    for category, keywords in SAFETY_KEYWORDS.items():
        found = [kw for kw in keywords if kw in text_lower]
        if found:
            matches.append({"category": category, "keywords": found})
    return matches


class StreamingTranscriptionSession:
    """Manages a streaming STT v2 transcription session.

    Receives PCM 16kHz 16-bit mono audio from the browser, streams it
    to Speech-to-Text v2, and sends transcripts back via WebSocket.
    """

    # Max STT v2 streaming duration before auto-reconnect (~4.5 min, under 5-min hard limit)
    MAX_STREAM_DURATION_SECONDS = 270

    def __init__(self, session_id: str, websocket: WebSocket):
        self.session_id = session_id
        self.websocket = websocket
        self.is_active = True
        self.recognizer_name = f"projects/{project_id}/locations/{location}/recognizers/_"
        self.audio_queue = queue.Queue()
        self.response_queue = asyncio.Queue()
        self.streaming_thread = None
        self.main_loop = asyncio.get_event_loop()
        self.stream_generation = 0  # tracks reconnect cycles

    def get_streaming_config(self) -> types.StreamingRecognitionConfig:
        # Clinical terminology phrase set for medical STT adaptation
        # Biases recognizer toward therapy/psychiatric vocabulary
        clinical_phrases = types.SpeechAdaptation(
            phrase_sets=[
                types.SpeechAdaptation.AdaptationPhraseSet(
                    inline_phrase_set=types.PhraseSet(
                        phrases=[
                            # Therapy modalities
                            types.PhraseSet.Phrase(value="cognitive behavioral therapy", boost=15),
                            types.PhraseSet.Phrase(value="CBT", boost=18),
                            types.PhraseSet.Phrase(value="dialectical behavior therapy", boost=15),
                            types.PhraseSet.Phrase(value="DBT", boost=18),
                            types.PhraseSet.Phrase(value="interpersonal therapy", boost=15),
                            types.PhraseSet.Phrase(value="IPT", boost=15),
                            types.PhraseSet.Phrase(value="behavioral activation", boost=15),
                            types.PhraseSet.Phrase(value="motivational interviewing", boost=15),
                            types.PhraseSet.Phrase(value="exposure therapy", boost=12),
                            types.PhraseSet.Phrase(value="psychoeducation", boost=15),
                            types.PhraseSet.Phrase(value="mindfulness", boost=10),
                            types.PhraseSet.Phrase(value="grounding techniques", boost=12),
                            types.PhraseSet.Phrase(value="distress tolerance", boost=15),
                            types.PhraseSet.Phrase(value="emotion regulation", boost=12),
                            types.PhraseSet.Phrase(value="interpersonal effectiveness", boost=12),
                            types.PhraseSet.Phrase(value="cognitive restructuring", boost=15),
                            types.PhraseSet.Phrase(value="thought record", boost=12),
                            types.PhraseSet.Phrase(value="behavioral experiment", boost=12),
                            types.PhraseSet.Phrase(value="chain analysis", boost=12),
                            types.PhraseSet.Phrase(value="safety plan", boost=15),
                            # Clinical assessments
                            types.PhraseSet.Phrase(value="PHQ-9", boost=20),
                            types.PhraseSet.Phrase(value="GAD-7", boost=20),
                            types.PhraseSet.Phrase(value="C-SSRS", boost=20),
                            types.PhraseSet.Phrase(value="Columbia Suicide Severity Rating Scale", boost=15),
                            types.PhraseSet.Phrase(value="Beck Depression Inventory", boost=15),
                            types.PhraseSet.Phrase(value="suicidal ideation", boost=18),
                            types.PhraseSet.Phrase(value="self-harm", boost=18),
                            types.PhraseSet.Phrase(value="homicidal ideation", boost=18),
                            # Diagnoses
                            types.PhraseSet.Phrase(value="major depressive disorder", boost=12),
                            types.PhraseSet.Phrase(value="generalized anxiety disorder", boost=12),
                            types.PhraseSet.Phrase(value="PTSD", boost=18),
                            types.PhraseSet.Phrase(value="post-traumatic stress disorder", boost=12),
                            types.PhraseSet.Phrase(value="borderline personality disorder", boost=12),
                            types.PhraseSet.Phrase(value="bipolar disorder", boost=12),
                            types.PhraseSet.Phrase(value="schizophrenia", boost=12),
                            types.PhraseSet.Phrase(value="panic disorder", boost=12),
                            types.PhraseSet.Phrase(value="obsessive compulsive disorder", boost=12),
                            types.PhraseSet.Phrase(value="OCD", boost=18),
                            types.PhraseSet.Phrase(value="ADHD", boost=18),
                            types.PhraseSet.Phrase(value="substance use disorder", boost=12),
                            types.PhraseSet.Phrase(value="anorexia nervosa", boost=12),
                            types.PhraseSet.Phrase(value="bulimia nervosa", boost=12),
                            # Medications (common psychiatric)
                            types.PhraseSet.Phrase(value="sertraline", boost=15),
                            types.PhraseSet.Phrase(value="fluoxetine", boost=15),
                            types.PhraseSet.Phrase(value="escitalopram", boost=15),
                            types.PhraseSet.Phrase(value="Lexapro", boost=15),
                            types.PhraseSet.Phrase(value="Zoloft", boost=15),
                            types.PhraseSet.Phrase(value="Prozac", boost=15),
                            types.PhraseSet.Phrase(value="venlafaxine", boost=15),
                            types.PhraseSet.Phrase(value="Effexor", boost=15),
                            types.PhraseSet.Phrase(value="bupropion", boost=15),
                            types.PhraseSet.Phrase(value="Wellbutrin", boost=15),
                            types.PhraseSet.Phrase(value="quetiapine", boost=15),
                            types.PhraseSet.Phrase(value="Seroquel", boost=15),
                            types.PhraseSet.Phrase(value="aripiprazole", boost=15),
                            types.PhraseSet.Phrase(value="Abilify", boost=15),
                            types.PhraseSet.Phrase(value="lithium", boost=12),
                            types.PhraseSet.Phrase(value="lamotrigine", boost=15),
                            types.PhraseSet.Phrase(value="Lamictal", boost=15),
                            types.PhraseSet.Phrase(value="clonazepam", boost=15),
                            types.PhraseSet.Phrase(value="lorazepam", boost=15),
                            types.PhraseSet.Phrase(value="Ativan", boost=15),
                            types.PhraseSet.Phrase(value="benzodiazepine", boost=12),
                            types.PhraseSet.Phrase(value="SSRI", boost=18),
                            types.PhraseSet.Phrase(value="SNRI", boost=18),
                            # Clinical terms
                            types.PhraseSet.Phrase(value="therapeutic alliance", boost=15),
                            types.PhraseSet.Phrase(value="treatment plan", boost=12),
                            types.PhraseSet.Phrase(value="differential diagnosis", boost=12),
                            types.PhraseSet.Phrase(value="comorbidity", boost=12),
                            types.PhraseSet.Phrase(value="psychomotor retardation", boost=15),
                            types.PhraseSet.Phrase(value="anhedonia", boost=18),
                            types.PhraseSet.Phrase(value="affect", boost=8),
                            types.PhraseSet.Phrase(value="flat affect", boost=15),
                            types.PhraseSet.Phrase(value="labile affect", boost=15),
                            types.PhraseSet.Phrase(value="dissociation", boost=15),
                            types.PhraseSet.Phrase(value="hypervigilance", boost=15),
                            types.PhraseSet.Phrase(value="flashback", boost=12),
                            types.PhraseSet.Phrase(value="rumination", boost=12),
                            types.PhraseSet.Phrase(value="catastrophizing", boost=15),
                            types.PhraseSet.Phrase(value="cognitive distortion", boost=15),
                            types.PhraseSet.Phrase(value="maladaptive", boost=12),
                            types.PhraseSet.Phrase(value="psychosocial", boost=12),
                            types.PhraseSet.Phrase(value="agoraphobia", boost=15),
                            # Additional clinical terms
                            types.PhraseSet.Phrase(value="somatization", boost=15),
                            types.PhraseSet.Phrase(value="derealization", boost=15),
                            types.PhraseSet.Phrase(value="depersonalization", boost=15),
                            types.PhraseSet.Phrase(value="alexithymia", boost=15),
                            types.PhraseSet.Phrase(value="psychosomatic", boost=12),
                            types.PhraseSet.Phrase(value="dysregulation", boost=12),
                            types.PhraseSet.Phrase(value="hyperarousal", boost=15),
                            types.PhraseSet.Phrase(value="hypoarousal", boost=15),
                            types.PhraseSet.Phrase(value="window of tolerance", boost=15),
                            types.PhraseSet.Phrase(value="polyvagal", boost=15),
                            types.PhraseSet.Phrase(value="vagal tone", boost=12),
                            types.PhraseSet.Phrase(value="somatic experiencing", boost=15),
                            types.PhraseSet.Phrase(value="interoception", boost=15),
                            types.PhraseSet.Phrase(value="attachment style", boost=12),
                            types.PhraseSet.Phrase(value="secure attachment", boost=12),
                            types.PhraseSet.Phrase(value="anxious attachment", boost=12),
                            types.PhraseSet.Phrase(value="avoidant attachment", boost=12),
                            types.PhraseSet.Phrase(value="transference", boost=15),
                            types.PhraseSet.Phrase(value="countertransference", boost=15),
                            # Commonly misrecognized patient vocabulary
                            types.PhraseSet.Phrase(value="Xanax", boost=18),
                            types.PhraseSet.Phrase(value="alprazolam", boost=15),
                            types.PhraseSet.Phrase(value="Adderall", boost=18),
                            types.PhraseSet.Phrase(value="Klonopin", boost=18),
                            types.PhraseSet.Phrase(value="Ambien", boost=15),
                            types.PhraseSet.Phrase(value="Trazodone", boost=15),
                            types.PhraseSet.Phrase(value="Risperdal", boost=15),
                            types.PhraseSet.Phrase(value="risperidone", boost=15),
                            types.PhraseSet.Phrase(value="olanzapine", boost=15),
                            types.PhraseSet.Phrase(value="Zyprexa", boost=15),
                            types.PhraseSet.Phrase(value="naltrexone", boost=15),
                            types.PhraseSet.Phrase(value="Suboxone", boost=18),
                            types.PhraseSet.Phrase(value="buprenorphine", boost=15),
                            types.PhraseSet.Phrase(value="methadone", boost=15),
                            # Therapeutic techniques (patient language)
                            types.PhraseSet.Phrase(value="grounding exercise", boost=12),
                            types.PhraseSet.Phrase(value="breathing exercise", boost=10),
                            types.PhraseSet.Phrase(value="coping skills", boost=10),
                            types.PhraseSet.Phrase(value="trigger warning", boost=10),
                            types.PhraseSet.Phrase(value="safe space", boost=10),
                            types.PhraseSet.Phrase(value="inner child", boost=12),
                            types.PhraseSet.Phrase(value="emotional flashback", boost=15),
                            types.PhraseSet.Phrase(value="body scan", boost=12),
                            types.PhraseSet.Phrase(value="progressive muscle relaxation", boost=12),
                            types.PhraseSet.Phrase(value="DBT skills", boost=15),
                            types.PhraseSet.Phrase(value="wise mind", boost=15),
                            types.PhraseSet.Phrase(value="radical acceptance", boost=15),
                            types.PhraseSet.Phrase(value="opposite action", boost=12),
                            types.PhraseSet.Phrase(value="TIPP skills", boost=18),
                            types.PhraseSet.Phrase(value="DEAR MAN", boost=18),
                            types.PhraseSet.Phrase(value="Socratic questioning", boost=15),
                            types.PhraseSet.Phrase(value="downward arrow", boost=12),
                            types.PhraseSet.Phrase(value="core belief", boost=12),
                            types.PhraseSet.Phrase(value="schema", boost=10),
                            types.PhraseSet.Phrase(value="automatic thought", boost=12),
                        ]
                    )
                )
            ]
        )

        return types.StreamingRecognitionConfig(
            config=types.RecognitionConfig(
                explicit_decoding_config=types.ExplicitDecodingConfig(
                    encoding=types.ExplicitDecodingConfig.AudioEncoding.LINEAR16,
                    sample_rate_hertz=16000,
                    audio_channel_count=1,
                ),
                language_codes=["en-US"],
                model="latest_long",
                adaptation=clinical_phrases,
                features=types.RecognitionFeatures(
                    enable_automatic_punctuation=True,
                    profanity_filter=False,
                    enable_word_time_offsets=True,
                    enable_word_confidence=True,
                    max_alternatives=1,
                ),
            ),
            streaming_features=types.StreamingRecognitionFeatures(
                interim_results=True,
                enable_voice_activity_events=True,
                voice_activity_timeout=types.StreamingRecognitionFeatures.VoiceActivityTimeout(
                    speech_start_timeout={"seconds": 60},
                    speech_end_timeout={"seconds": 60},
                ),
            ),
        )

    def audio_generator(self) -> Generator[types.StreamingRecognizeRequest, None, None]:
        # First request: config
        yield types.StreamingRecognizeRequest(
            recognizer=self.recognizer_name,
            streaming_config=self.get_streaming_config(),
        )
        # Subsequent: audio data
        while self.is_active:
            try:
                audio_data = self.audio_queue.get(timeout=0.1)
                if audio_data is None:
                    break
                yield types.StreamingRecognizeRequest(audio=audio_data)
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Audio generator error: {e}")
                break

    def streaming_recognize_thread(self):
        """Run STT streaming with auto-reconnect on stream end or timeout.

        Google STT v2 streaming has a ~5-minute hard limit and will also
        close when voice-activity timeouts fire.  This loop transparently
        re-establishes the stream so the caller never notices a gap.
        """
        import time as _time

        while self.is_active:
            self.stream_generation += 1
            gen = self.stream_generation
            stream_start = _time.monotonic()
            try:
                logger.info(
                    f"[{self.session_id}] Starting STT v2 stream (gen {gen})"
                )
                responses = speech_client.streaming_recognize(
                    requests=self.audio_generator(),
                )
                for response in responses:
                    if not self.is_active:
                        break
                    asyncio.run_coroutine_threadsafe(
                        self.response_queue.put(response),
                        self.main_loop
                    )
                    # Proactive reconnect before the 5-min hard limit
                    elapsed = _time.monotonic() - stream_start
                    if elapsed >= self.MAX_STREAM_DURATION_SECONDS:
                        logger.info(
                            f"[{self.session_id}] Approaching 5-min limit "
                            f"({elapsed:.0f}s), reconnecting..."
                        )
                        break

                # Stream ended normally (timeout or limit) — reconnect
                if self.is_active:
                    logger.info(
                        f"[{self.session_id}] STT stream ended (gen {gen}), "
                        f"reconnecting..."
                    )
                    # Drain the audio queue so the new generator starts
                    # with a fresh config request
                    while not self.audio_queue.empty():
                        try:
                            self.audio_queue.get_nowait()
                        except queue.Empty:
                            break
                    continue  # loop back to start a new stream

            except Exception as e:
                if not self.is_active:
                    break
                error_str = str(e)
                logger.error(
                    f"[{self.session_id}] STT streaming error (gen {gen}): {e}",
                    exc_info=True,
                )

                # Detect auth/credential errors — don't retry, they won't self-heal
                is_auth_error = any(phrase in error_str.lower() for phrase in [
                    'invalid_grant', 'refresh token', 'credentials',
                    'token has expired', 'unauthorized', 'permission denied',
                ])

                if is_auth_error:
                    logger.error(
                        f"[{self.session_id}] AUTH ERROR — credentials expired or invalid. "
                        f"Stopping retries. Run: gcloud auth application-default login"
                    )
                    asyncio.run_coroutine_threadsafe(
                        self.response_queue.put({
                            "error": "auth_error",
                            "message": "Your Google Cloud login has expired. Please double-click 'REFRESH-Login-Mac' on your desktop to sign in again, then restart the session.",
                        }),
                        self.main_loop,
                    )
                    break  # Do NOT retry — auth errors won't self-heal

                asyncio.run_coroutine_threadsafe(
                    self.response_queue.put({"error": error_str}),
                    self.main_loop,
                )
                # Brief backoff before reconnect attempt
                _time.sleep(1)
                if self.is_active:
                    logger.info(
                        f"[{self.session_id}] Retrying STT stream after error..."
                    )
                    continue
                break

    async def process_responses(self):
        try:
            while self.is_active:
                try:
                    response = await asyncio.wait_for(
                        self.response_queue.get(), timeout=0.1
                    )

                    if isinstance(response, dict) and "error" in response:
                        # Auth errors get a distinct type so frontend can show a clear message
                        if response["error"] == "auth_error":
                            await self.websocket.send_json({
                                "type": "auth_error",
                                "error": response.get("message", "Authentication failed"),
                                "timestamp": datetime.now().isoformat(),
                            })
                        else:
                            await self.websocket.send_json({
                                "type": "error",
                                "error": response["error"],
                                "timestamp": datetime.now().isoformat(),
                            })
                        continue

                    for result in response.results:
                        for alternative in result.alternatives:
                            transcript_text = alternative.transcript
                            is_final = result.is_final

                            logger.info(
                                f"[{self.session_id}] {'[FINAL]' if is_final else '[INTERIM]'} "
                                f"{transcript_text[:80]}"
                            )

                            result_data = {
                                "type": "transcript",
                                "transcript": transcript_text,
                                "confidence": alternative.confidence if hasattr(alternative, 'confidence') else 1.0,
                                "is_final": is_final,
                                "speaker": "conversation",
                                "timestamp": datetime.now().isoformat(),
                                "result_end_offset": result.result_end_offset.total_seconds() if hasattr(result, 'result_end_offset') else 0,
                            }

                            if is_final and hasattr(alternative, 'words'):
                                result_data["words"] = [
                                    {
                                        "word": word.word,
                                        "start_time": word.start_offset.total_seconds() if hasattr(word, 'start_offset') else 0,
                                        "end_time": word.end_offset.total_seconds() if hasattr(word, 'end_offset') else 0,
                                        "confidence": word.confidence if hasattr(word, 'confidence') else 1.0,
                                    }
                                    for word in alternative.words
                                ]

                            await self.websocket.send_json(result_data)

                            # Safety keyword scan on final transcripts
                            if is_final:
                                safety_matches = scan_safety_keywords(transcript_text)
                                if safety_matches:
                                    logger.warning(
                                        f"[{self.session_id}] Safety keywords: {safety_matches}"
                                    )
                                    categories = [m["category"] for m in safety_matches]
                                    keywords = []
                                    for m in safety_matches:
                                        keywords.extend(m["keywords"])
                                    await self.websocket.send_json({
                                        "type": "analysis",
                                        "alert": {
                                            "timing": "now",
                                            "category": "safety",
                                            "title": f"Safety Concern: {', '.join(categories)}",
                                            "message": f"Safety keywords detected: {', '.join(keywords[:5])}",
                                            "evidence": [transcript_text[:200]],
                                            "recommendation": [
                                                "Assess current risk level immediately",
                                                "Follow clinical protocol",
                                            ],
                                            "immediateActions": ["Conduct safety assessment"],
                                            "contraindications": ["Do not ignore or dismiss"],
                                            "crisis_resources": [
                                                "988 Suicide & Crisis Lifeline: call or text 988",
                                                "Crisis Text Line: text HOME to 741741",
                                                "SAMHSA Helpline: 1-800-662-4357",
                                            ],
                                        },
                                        "session_metrics": None,
                                        "session_phase": None,
                                    })

                    # Voice activity events
                    if hasattr(response, 'speech_event_type'):
                        event_type = response.speech_event_type
                        if event_type == types.StreamingRecognizeResponse.SpeechEventType.SPEECH_ACTIVITY_BEGIN:
                            await self.websocket.send_json({
                                "type": "speech_event",
                                "event": "speech_start",
                                "timestamp": datetime.now().isoformat(),
                            })
                        elif event_type == types.StreamingRecognizeResponse.SpeechEventType.SPEECH_ACTIVITY_END:
                            await self.websocket.send_json({
                                "type": "speech_event",
                                "event": "speech_end",
                                "timestamp": datetime.now().isoformat(),
                            })

                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"[{self.session_id}] Response processing error: {e}")

        except Exception as e:
            logger.error(f"[{self.session_id}] Response processor error: {e}")

    def start_streaming(self):
        self.streaming_thread = threading.Thread(
            target=self.streaming_recognize_thread, daemon=True
        )
        self.streaming_thread.start()

    def add_audio(self, audio_data: bytes):
        try:
            self.audio_queue.put(audio_data, block=False)
        except queue.Full:
            logger.warning(f"[{self.session_id}] Audio queue full, dropping chunk")

    def stop(self):
        self.is_active = False
        self.audio_queue.put(None)
        if self.streaming_thread:
            self.streaming_thread.join(timeout=2)


# ─── WebSocket endpoint ─────────────────────────────────────────────

@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    await websocket.accept()
    session: Optional[StreamingTranscriptionSession] = None
    response_task = None

    try:
        init_message = await websocket.receive()

        if init_message["type"] == "websocket.receive" and "text" in init_message:
            init_data = json.loads(init_message["text"])

            is_local_dev = not os.environ.get("K_SERVICE")
            token = init_data.get("token")

            if is_local_dev:
                user_email = "local-dev@localhost"
                session_id = init_data.get("session_id", datetime.now().strftime("%Y%m%d-%H%M%S"))
                logger.info(f"[LOCAL DEV] Auth bypassed — session: {session_id}")
                logger.info(f"Client config: {init_data.get('config', {})}")
            elif token and token.startswith("mock-"):
                # In Cloud Run behind IAP, the user is already authenticated by IAP.
                # Accept mock tokens since Firebase Auth is not configured in the frontend.
                user_email = "iap-authenticated@downstate.edu"
                session_id = init_data.get("session_id", datetime.now().strftime("%Y%m%d-%H%M%S"))
                logger.info(f"[IAP AUTH] Firebase token not configured — IAP pre-authenticated. Session: {session_id}")
            else:
                if not token:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Authentication token required",
                        "timestamp": datetime.now().isoformat(),
                    })
                    await websocket.close(code=1008, reason="Authentication required")
                    return

                decoded_token = verify_firebase_token(token)
                if not decoded_token:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Invalid or unauthorized token",
                        "timestamp": datetime.now().isoformat(),
                    })
                    await websocket.close(code=1008, reason="Authentication failed")
                    return

                user_email = decoded_token.get('email')
                session_id = init_data.get("session_id", datetime.now().strftime("%Y%m%d-%H%M%S"))
                logger.info(f"Authenticated session: {session_id} for user: {user_email}")
        else:
            await websocket.send_json({
                "type": "error",
                "error": "Invalid initialization message format",
                "timestamp": datetime.now().isoformat(),
            })
            await websocket.close(code=1003, reason="Invalid message format")
            return

        session = StreamingTranscriptionSession(session_id, websocket)
        session.start_streaming()
        response_task = asyncio.create_task(session.process_responses())

        await websocket.send_json({
            "type": "ready",
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
            "config": {
                "sample_rate": 16000,
                "encoding": "PCM_16BIT",
                "model": "latest_long",
            },
        })

        while session.is_active:
            try:
                message = await websocket.receive()

                if message["type"] == "websocket.disconnect":
                    break

                if message["type"] == "websocket.receive":
                    if "bytes" in message:
                        session.add_audio(message["bytes"])
                    elif "text" in message:
                        data = json.loads(message["text"])
                        if data.get("type") == "stop":
                            logger.info(f"[{session_id}] Received stop signal")
                            break
                        elif data.get("type") == "pause":
                            logger.info(f"[{session_id}] Session paused — keeping connection alive")
                        elif data.get("type") == "resume":
                            logger.info(f"[{session_id}] Session resumed")
                        elif data.get("type") == "ping":
                            # Heartbeat keepalive — respond with pong
                            await websocket.send_json({"type": "pong"})

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"[{session_id}] Error receiving message: {e}")
                continue

    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            })
        except Exception:
            pass
    finally:
        if session:
            session.stop()
        if response_task:
            response_task.cancel()
            try:
                await response_task
            except asyncio.CancelledError:
                pass


# ─── REST endpoints ──────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": "Therapy Session Streaming Service — STT v2",
        "model": "latest_long",
        "features": {
            "streaming": True,
            "interim_results": True,
            "safety_keyword_scan": True,
            "pcm_16khz": True,
        },
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/health")
async def health(current_user: dict = Depends(get_current_user)):
    return {
        "status": "healthy",
        "stt_endpoint": f"{location}-speech.googleapis.com",
        "project_id": project_id,
        "location": location,
        "authenticated_user": current_user.get('email'),
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/auth/test")
async def test_auth(current_user: dict = Depends(get_current_user)):
    return {
        "message": "Authentication successful",
        "user": {
            "email": current_user.get('email'),
            "uid": current_user.get('uid'),
            "name": current_user.get('name'),
        },
        "timestamp": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8082))
    uvicorn.run(app, host="0.0.0.0", port=port)
