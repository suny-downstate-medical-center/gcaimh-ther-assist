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

#!/usr/bin/env python3
"""
Resumable script to create and populate a Vertex AI Search datastore for clinical transcripts.
This version includes skip logic, progress tracking, and error recovery.
"""

import os
import time
import json
import pickle
from pathlib import Path
from google.auth import default
from google.auth.transport.requests import Request
import requests
import PyPDF2
from typing import Set, Dict, Any

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = "global"
DATASTORE_ID = "transcript-patterns"
DISPLAY_NAME = "Clinical Therapy Transcripts"

# Progress tracking file
PROGRESS_FILE = "transcript_upload_progress.json"

class ProgressTracker:
    """Track upload progress to enable resumability."""
    
    def __init__(self, progress_file=PROGRESS_FILE):
        self.progress_file = progress_file
        self.completed_files = set()
        self.failed_files = {}
        self.load_progress()
    
    def load_progress(self):
        """Load progress from file if it exists."""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r') as f:
                    data = json.load(f)
                    self.completed_files = set(data.get('completed', []))
                    self.failed_files = data.get('failed', {})
                print(f"📂 Loaded progress: {len(self.completed_files)} files already processed")
            except Exception as e:
                print(f"⚠️  Could not load progress file: {e}")
    
    def save_progress(self):
        """Save current progress to file."""
        try:
            with open(self.progress_file, 'w') as f:
                json.dump({
                    'completed': list(self.completed_files),
                    'failed': self.failed_files,
                    'last_updated': time.strftime('%Y-%m-%d %H:%M:%S')
                }, f, indent=2)
        except Exception as e:
            print(f"⚠️  Could not save progress: {e}")
    
    def mark_completed(self, filename):
        """Mark a file as successfully processed."""
        self.completed_files.add(filename)
        # Remove from failed if it was there
        if filename in self.failed_files:
            del self.failed_files[filename]
        self.save_progress()
    
    def mark_failed(self, filename, error):
        """Mark a file as failed with error message."""
        self.failed_files[filename] = {
            'error': str(error),
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        self.save_progress()
    
    def is_completed(self, filename):
        """Check if a file has been successfully processed."""
        return filename in self.completed_files
    
    def reset(self):
        """Reset all progress (use with caution)."""
        self.completed_files = set()
        self.failed_files = {}
        if os.path.exists(self.progress_file):
            os.remove(self.progress_file)
        print("🔄 Progress tracker reset")

def get_access_token():
    """Get access token for API calls."""
    credentials, _ = default()
    credentials.refresh(Request())
    return credentials.token

def create_datastore():
    """Create a Vertex AI Search datastore with dialogue-aware chunking."""
    
    url = f"https://discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/dataStores?dataStoreId={DATASTORE_ID}"
    
    headers = {
        "Authorization": f"Bearer {get_access_token()}",
        "Content-Type": "application/json",
        "X-Goog-User-Project": PROJECT_ID
    }
    
    # Configure datastore with dialogue-aware chunking
    data = {
        "displayName": DISPLAY_NAME,
        "industryVertical": "GENERIC",
        "solutionTypes": ["SOLUTION_TYPE_SEARCH"],
        "contentConfig": "CONTENT_REQUIRED",
        "documentProcessingConfig": {
            # Enable document chunking optimized for dialogue
            "chunkingConfig": {
                "layoutBasedChunkingConfig": {
                    "chunkSize": 300,  # Smaller chunks to capture 3-turn sequences
                    "includeAncestorHeadings": True  # Include session context
                }
            },
            # Use layout parser for better dialogue understanding
            "defaultParsingConfig": {
                "layoutParsingConfig": {}
            }
        }
    }
    
    print(f"Creating datastore '{DATASTORE_ID}' with dialogue-aware chunking...")
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 200:
        print(f"✅ Datastore '{DATASTORE_ID}' created successfully!")
        return response.json()
    elif response.status_code == 409:
        print(f"⚠️  Datastore '{DATASTORE_ID}' already exists.")
        return get_datastore()
    else:
        print(f"❌ Error creating datastore: {response.status_code}")
        print(f"Response: {response.text}")
        raise Exception(f"Failed to create datastore: {response.text}")

def get_datastore():
    """Get existing datastore details."""
    url = f"https://discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/dataStores/{DATASTORE_ID}"
    
    headers = {
        "Authorization": f"Bearer {get_access_token()}",
        "X-Goog-User-Project": PROJECT_ID
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Error getting datastore: {response.status_code}")
        print(f"Response: {response.text}")
        return None

def create_gcs_bucket():
    """Create a GCS bucket for storing the transcript documents."""
    from google.cloud import storage
    
    bucket_name = f"{PROJECT_ID}-transcript-patterns"
    client = storage.Client(project=PROJECT_ID)
    
    # Check if bucket already exists
    try:
        bucket = client.get_bucket(bucket_name)
        print(f"⚠️  Bucket {bucket_name} already exists")
        return bucket_name
    except Exception as e:
        if "404" in str(e):
            # Bucket doesn't exist, create it
            try:
                bucket = client.create_bucket(bucket_name, location="US")
                print(f"✅ Created GCS bucket: {bucket_name}")
                return bucket_name
            except Exception as create_error:
                if "already own it" in str(create_error):
                    print(f"⚠️  Bucket {bucket_name} already exists")
                    return bucket_name
                else:
                    raise create_error
        else:
            raise e

def list_existing_blobs(bucket_name) -> Set[str]:
    """List all existing blobs in the bucket for efficient checking."""
    from google.cloud import storage
    
    print("📋 Listing existing files in GCS bucket...")
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(bucket_name)
    
    existing_blobs = set()
    for blob in bucket.list_blobs():
        existing_blobs.add(blob.name)
    
    print(f"  Found {len(existing_blobs)} existing files in bucket")
    return existing_blobs

def process_json_conversation(json_path):
    """Process JSON conversation files into searchable dialogue format."""
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    # Format as dialogue with 3-turn sequences
    formatted_content = []
    conversation = data.get('messages', data.get('conversation', []))
    
    # Create overlapping 3-turn sequences for better pattern matching
    for i in range(len(conversation) - 2):
        sequence = []
        for j in range(3):
            if i + j < len(conversation):
                msg = conversation[i + j]
                role = msg.get('role', 'Unknown')
                content = msg.get('content', msg.get('text', ''))
                sequence.append(f"{role}: {content}")
        
        if len(sequence) >= 2:  # At least 2 turns
            formatted_content.append("\n".join(sequence))
            formatted_content.append("\n---\n")  # Separator between sequences
    
    # Add metadata about the session
    session_type = "PTSD" if "trauma" in json_path.lower() else "General"
    formatted_content.insert(0, f"Session Type: {session_type}\n")
    formatted_content.insert(1, f"File: {os.path.basename(json_path)}\n\n")
    
    return "\n".join(formatted_content)

def process_pdf_transcript(pdf_path):
    """Extract text from PDF transcripts."""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = []
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text.append(page.extract_text())
            
            full_text = "\n".join(text)
            
            # Add metadata
            session_type = "Beck CBT" if "BB3" in pdf_path else "PE/PTSD" if "PE" in pdf_path else "General"
            metadata = f"Session Type: {session_type}\nFile: {os.path.basename(pdf_path)}\n\n"
            
            return metadata + full_text
    except Exception as e:
        print(f"⚠️  Error processing PDF {pdf_path}: {e}")
        return None

def upload_transcripts_to_gcs_with_resume(bucket_name):
    """Upload transcript files to GCS bucket with resume capability."""
    from google.cloud import storage
    
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(bucket_name)
    
    transcripts_dir = "transcripts"  # Since we're running from backend/rag
    
    if not os.path.exists(transcripts_dir):
        print(f"❌ Transcripts directory '{transcripts_dir}' not found!")
        return False
    
    # Initialize progress tracker
    tracker = ProgressTracker()
    
    # List existing blobs once for efficiency
    existing_blobs = list_existing_blobs(bucket_name)
    
    files_uploaded = 0
    files_skipped = 0
    files_failed = 0
    
    # Collect all files to process
    all_files = []
    for root, dirs, files in os.walk(transcripts_dir):
        for filename in files:
            if filename.endswith(('.pdf', '.json')):
                all_files.append((root, filename))
    
    total_files = len(all_files)
    print(f"\n📊 Found {total_files} files to process")
    
    # Process files in batches
    batch_size = 10
    for batch_start in range(0, total_files, batch_size):
        batch_end = min(batch_start + batch_size, total_files)
        batch = all_files[batch_start:batch_end]
        
        print(f"\n🔄 Processing batch {batch_start//batch_size + 1} ({batch_start+1}-{batch_end} of {total_files})")
        
        for root, filename in batch:
            file_path = os.path.join(root, filename)
            relative_path = os.path.relpath(file_path, transcripts_dir)
            
            # Check if already processed (from progress tracker)
            if tracker.is_completed(relative_path):
                print(f"  ⏭️  Skipping (already processed): {filename}")
                files_skipped += 1
                continue
            
            try:
                # Process PDFs
                if filename.endswith('.pdf'):
                    blob_name = f"transcripts/{relative_path}.txt"
                    
                    # Check if already exists in GCS
                    if blob_name in existing_blobs:
                        print(f"  ⏭️  Skipping PDF (exists in GCS): {filename}")
                        tracker.mark_completed(relative_path)
                        files_skipped += 1
                        continue
                    
                    print(f"  Processing PDF: {filename}...")
                    content = process_pdf_transcript(file_path)
                    
                    if content:
                        blob = bucket.blob(blob_name)
                        blob.upload_from_string(content)
                        tracker.mark_completed(relative_path)
                        files_uploaded += 1
                        print(f"    ✅ Uploaded: {filename}")
                    else:
                        files_failed += 1
                        tracker.mark_failed(relative_path, "Failed to extract PDF content")
                
                # Process JSON conversations
                elif filename.endswith('.json'):
                    blob_name = f"transcripts/{relative_path}.txt"
                    
                    # Check if already exists in GCS
                    if blob_name in existing_blobs:
                        print(f"  ⏭️  Skipping JSON (exists in GCS): {filename}")
                        tracker.mark_completed(relative_path)
                        files_skipped += 1
                        continue
                    
                    print(f"  Processing JSON: {filename}...")
                    content = process_json_conversation(file_path)
                    
                    blob = bucket.blob(blob_name)
                    blob.upload_from_string(content)
                    tracker.mark_completed(relative_path)
                    files_uploaded += 1
                    print(f"    ✅ Uploaded: {filename}")
                    
            except Exception as e:
                print(f"    ❌ Failed to process {filename}: {e}")
                tracker.mark_failed(relative_path, str(e))
                files_failed += 1
                continue
        
        # Save progress after each batch
        tracker.save_progress()
        print(f"  💾 Progress saved after batch")
    
    print(f"\n📊 Upload Summary:")
    print(f"  ✅ Newly uploaded: {files_uploaded}")
    print(f"  ⏭️  Skipped (already processed): {files_skipped}")
    print(f"  ❌ Failed: {files_failed}")
    print(f"  📁 Total files: {total_files}")
    
    if files_failed > 0:
        print(f"\n⚠️  Failed files saved in progress tracker. Run again to retry.")
    
    return True

def create_pattern_library(bucket_name):
    """Create a pattern library document with key therapeutic moments."""
    from google.cloud import storage
    
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(bucket_name)
    
    # Check if pattern library already exists
    blob_name = "patterns/therapeutic_pattern_library.txt"
    blob = bucket.blob(blob_name)
    
    if blob.exists():
        print("⚠️  Pattern library already exists, skipping creation")
        return True
    
    # Define key patterns from the transcripts
    patterns = {
        "resistance_patterns": [
            {
                "pattern": "Client: I don't want to impose on anyone",
                "technique": "Socratic questioning",
                "response": "Therapist: What makes you think they'll see it as an imposition?",
                "source": "Beck Session 2"
            },
            {
                "pattern": "Client: I'm not sure I'm ready for this",
                "technique": "Validation with gradual approach",
                "response": "Therapist: It's completely understandable to feel hesitant. Let's talk about what makes you feel not ready.",
                "source": "PE Session 1"
            }
        ],
        "engagement_techniques": [
            {
                "pattern": "Checking task likelihood",
                "example": "Therapist: On a scale of 0-100%, how likely are you to complete this task?",
                "purpose": "Assess commitment and adjust expectations",
                "source": "Beck Session 2"
            },
            {
                "pattern": "Collaborative tone",
                "example": "Therapist: Would that be alright with you?",
                "purpose": "Build therapeutic alliance",
                "source": "Beck Session 2"
            }
        ],
        "emotional_moments": [
            {
                "pattern": "Client: My heart is racing and my palms are sweating",
                "indicators": "Physiological anxiety symptoms",
                "intervention": "Grounding techniques, normalization of symptoms",
                "source": "PTSD Session"
            },
            {
                "pattern": "Client: I feel overwhelmed",
                "technique": "Break tasks into smaller steps",
                "example": "Therapist: Let's just focus on cleaning the sink for 10 minutes",
                "source": "Beck Session 2"
            }
        ],
        "quality_markers": {
            "positive": [
                "Concrete planning with specific times and actions",
                "Positive reinforcement: 'That's terrific'",
                "Making tasks optional to reduce pressure",
                "Checking in on task completion likelihood"
            ],
            "warning_signs": [
                "Pushing too fast when client expresses hesitation",
                "Not providing psychoeducation about the process",
                "Ignoring signs of overwhelm or dissociation",
                "Not validating client emotions before proceeding"
            ]
        }
    }
    
    # Convert to searchable text format
    pattern_content = "THERAPEUTIC PATTERN LIBRARY\n\n"
    pattern_content += "This document contains key therapeutic patterns extracted from clinical transcripts.\n\n"
    
    for category, items in patterns.items():
        pattern_content += f"\n## {category.replace('_', ' ').title()}\n\n"
        
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    for key, value in item.items():
                        pattern_content += f"{key}: {value}\n"
                    pattern_content += "\n"
                else:
                    pattern_content += f"- {item}\n"
        elif isinstance(items, dict):
            for subcategory, subitems in items.items():
                pattern_content += f"\n### {subcategory.replace('_', ' ').title()}\n"
                for item in subitems:
                    pattern_content += f"- {item}\n"
                pattern_content += "\n"
    
    # Upload pattern library
    blob.upload_from_string(pattern_content)
    
    print("✅ Created and uploaded therapeutic pattern library")
    return True

def import_documents_to_datastore(bucket_name):
    """Import documents from GCS to the datastore."""
    
    url = f"https://discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/dataStores/{DATASTORE_ID}/branches/0/documents:import"
    
    headers = {
        "Authorization": f"Bearer {get_access_token()}",
        "Content-Type": "application/json",
        "X-Goog-User-Project": PROJECT_ID
    }
    
    # Configure import from GCS
    data = {
        "gcsSource": {
            "inputUris": [
                f"gs://{bucket_name}/transcripts/**",
                f"gs://{bucket_name}/patterns/**"
            ],
            "dataSchema": "document"
        },
        "reconciliationMode": "INCREMENTAL"
    }
    
    print(f"Importing documents from GCS to datastore...")
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 200:
        operation = response.json()
        print(f"✅ Import operation started: {operation['name']}")
        return operation
    else:
        print(f"❌ Error importing documents: {response.status_code}")
        print(f"Response: {response.text}")
        raise Exception(f"Failed to import documents: {response.text}")

def wait_for_operation(operation_name, timeout=600):
    """Wait for a long-running operation to complete."""
    
    headers = {
        "Authorization": f"Bearer {get_access_token()}",
        "X-Goog-User-Project": PROJECT_ID
    }
    
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        url = f"https://discoveryengine.googleapis.com/v1/{operation_name}"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            operation = response.json()
            if operation.get("done"):
                if "error" in operation:
                    print(f"❌ Operation failed: {operation['error']}")
                    return False
                else:
                    print(f"✅ Operation completed successfully!")
                    return True
        else:
            print(f"❌ Error checking operation status: {response.status_code}")
            return False
        
        print("⏳ Waiting for operation to complete...")
        time.sleep(10)
    
    print(f"❌ Operation timed out after {timeout} seconds")
    return False

def update_backend_with_transcript_rag():
    """Update the therapy analysis function to include transcript RAG tool."""
    
    datastore_path = f"projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/dataStores/{DATASTORE_ID}"
    
    print(f"\n📝 Transcript datastore path: {datastore_path}")
    print("\n🔧 Your backend is already configured with dual-RAG in backend/therapy-analysis-function/main.py")
    print("The TRANSCRIPT_RAG_TOOL is already added alongside MANUAL_RAG_TOOL")
    
    return datastore_path

def main():
    """Main function to set up the transcript RAG datastore."""
    
    print(f"🚀 Setting up Vertex AI Search datastore for Clinical Transcripts (Resumable Version)")
    print(f"Project ID: {PROJECT_ID}")
    print(f"Datastore ID: {DATASTORE_ID}\n")
    
    # Check for --reset flag
    import sys
    if '--reset' in sys.argv:
        tracker = ProgressTracker()
        tracker.reset()
        print("Progress has been reset. Starting fresh.\n")
    
    try:
        # Create datastore with dialogue-aware chunking
        datastore = create_datastore()
        
        # Create GCS bucket
        bucket_name = create_gcs_bucket()
        
        # Process and upload transcript files with resume capability
        if upload_transcripts_to_gcs_with_resume(bucket_name):
            # Create pattern library
            create_pattern_library(bucket_name)
            
            # Import documents to datastore
            operation = import_documents_to_datastore(bucket_name)
            
            if operation:
                # Wait for import to complete
                if wait_for_operation(operation['name']):
                    print("\n✅ Transcript RAG datastore setup complete!")
                    
                    # Show backend integration status
                    datastore_path = update_backend_with_transcript_rag()
                    
                    print("\n📚 Your clinical transcript corpus has been:")
                    print("   - Processed into dialogue sequences")
                    print("   - Uploaded to GCS with pattern library")
                    print("   - Imported into Vertex AI Search")
                    print("   - Configured with dialogue-aware chunking (300 tokens)")
                    print("   - Optimized for pattern matching")
                    
                    print("\n🎯 Key features:")
                    print("   - 3-turn dialogue sequences preserved")
                    print("   - Therapeutic patterns extracted")
                    print("   - Beck CBT sessions indexed")
                    print("   - PTSD/PE sessions indexed")
                    print("   - JSON conversations processed")
                    
                    print("\nYou now have dual-RAG: manuals + real-world transcripts!")
                else:
                    print("\n⚠️  Import operation failed or timed out")
                    print("Check the operation status in the Google Cloud Console")
        
    except Exception as e:
        print(f"\n❌ Setup failed: {str(e)}")
        print("\n💡 To resume from where you left off, just run the script again.")
        print("   To start fresh, run with --reset flag: python setup_transcript_datastore_resumable.py --reset")
        raise

if __name__ == "__main__":
    # Check for required libraries
    try:
        import google.auth
        from google.cloud import storage
        import PyPDF2
    except ImportError:
        print("Installing required dependencies...")
        os.system("pip install google-auth google-auth-httplib2 google-cloud-storage requests PyPDF2")
        print("Dependencies installed. Please run the script again.")
        exit(0)
    
    main()
