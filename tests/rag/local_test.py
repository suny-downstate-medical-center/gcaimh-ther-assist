# local_test.py
import os
import json
from unittest.mock import patch

# Before importing the main module, we need to set up environment variables
# and mock the authentication.

# --- 1. Set Environment Variables ---
# These are needed for the Google GenAI client and RAG tools to initialize.
# You should replace "your-gcp-project-id" with your actual project ID.
# Ensure this matches your GCP project where the function is deployed
os.environ["GOOGLE_CLOUD_PROJECT"] = "your-gcp-project-id"

# --- 2. Mock Firebase Authentication ---
# We use patch to temporarily replace the verify_firebase_token function.
# This bypasses the need for a real Firebase token during our local test.
# We make it return a dummy user so the authorization checks pass.
mock_decoded_token = {
    'uid': 'test-user-id',
    'email': 'test@example.com'
}

# The patch needs to target where the function is *looked up*.
# Since main.py is in backend/therapy-analysis-function, the import path for patching is:
# backend.therapy-analysis-function.main.verify_firebase_token
@patch('backend.therapy-analysis-function.main.verify_firebase_token', return_value=mock_decoded_token)
def run_analysis_tests(mock_verify_token):
    """
    This function will run with the firebase token verification patched.
    """
    # Now that setup is done, we can import the functions from main
    # Adjust this import path if you move the main.py file
    from backend.therapy-analysis-function import main

    print("--- Running handle_segment_analysis test ---")

    # --- 3. Craft Dummy Inputs for handle_segment_analysis ---
    dummy_request_json_segment = {
        "action": "analyze_segment",
        "transcript_segment": [
            {
                "speaker": "Therapist",
                "text": "Welcome. What's been on your mind?",
                "timestamp": "2024-01-01T10:00:00Z"
            },
            {
                "speaker": "Client",
                "text": "I've been feeling overwhelmed with work.",
                "timestamp": "2024-01-01T10:00:05Z"
            }
        ],
        "session_context": {
            "session_type": "CBT",
            "primary_concern": "Work-related Stress",
            "current_approach": "Cognitive Behavioral Therapy"
        },
        "session_duration_minutes": 10,
        "is_realtime": False, # Set to False for comprehensive RAG analysis
        "previous_alert": None
    }

    # The actual handle_segment_analysis function receives headers, but they are not used
    # in the function's direct logic for processing the request_json.
    # We still need to pass an empty dict as a placeholder.
    dummy_headers = {}

    # --- 4. Call the Function Directly ---
    # The function returns a Flask Response object containing a generator.
    # To get the actual content, we need to iterate through its 'response' attribute.
    response_generator_segment = main.handle_segment_analysis(dummy_request_json_segment, dummy_headers)

    print("Segment Analysis Response:")
    for chunk in response_generator_segment.response:
        # The chunk is a bytes string, so we decode it and then parse JSON
        analysis_result = json.loads(chunk.decode('utf-8'))
        print(json.dumps(analysis_result, indent=2))


    print("\n--- Running handle_session_summary test ---")

    # --- 5. Craft Dummy Inputs for handle_session_summary ---
    dummy_request_json_summary = {
        "action": "session_summary",
        "full_transcript": [
             {
                "speaker": "Therapist",
                "text": "Welcome. What's been on your mind?",
                "timestamp": "2024-01-01T10:00:00Z"
            },
            {
                "speaker": "Client",
                "text": "I've been feeling overwhelmed with work.",
                "timestamp": "2024-01-01T10:00:05Z"
            },
            {
                "speaker": "Therapist",
                "text": "It sounds like it's been a tough week.",
                "timestamp": "2024-01-01T10:01:00Z"
            }
        ],
        "session_metrics": {
            "engagement_level": 0.75,
            "therapeutic_alliance": "moderate",
            "techniques_detected": ["goal setting"]
        }
    }

    # --- 6. Call the Function Directly ---
    # This function returns a tuple (response_data, status_code, headers)
    # The response_data here is already a Flask.jsonify result which contains the dict.
    summary_data_response, status_code, _ = main.handle_session_summary(dummy_request_json_summary, dummy_headers)

    print(f"Session Summary Response (Status: {status_code}):")
    # summary_data_response.get_json() extracts the underlying dictionary from the Flask Response.
    print(json.dumps(summary_data_response.get_json(), indent=2))


if __name__ == '__main__':
    # Before running, make sure you have installed dependencies from the backend function:
    # pip install -r backend/therapy-analysis-function/requirements.txt
    
    # Also ensure you are authenticated for Google Cloud services (for GenAI client):
    # gcloud auth application-default login

    run_analysis_tests()
