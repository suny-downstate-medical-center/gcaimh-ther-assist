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
Script to programmatically create a Vertex AI Search datastore with document chunking for RAG.
This datastore will be configured to process EBT therapy manuals with layout-aware chunking.
"""

import os
import time
import json
from google.auth import default
from google.auth.transport.requests import Request
import requests

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = "global"
DATASTORE_ID = "ebt-corpus"
DISPLAY_NAME = "EBT Therapy Manuals Corpus"

def get_access_token():
    """Get access token for API calls."""
    credentials, _ = default()
    credentials.refresh(Request())
    return credentials.token

def create_datastore():
    """Create a Vertex AI Search datastore with document chunking enabled."""
    
    url = f"https://discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/dataStores?dataStoreId={DATASTORE_ID}"
    
    headers = {
        "Authorization": f"Bearer {get_access_token()}",
        "Content-Type": "application/json",
        "X-Goog-User-Project": PROJECT_ID
    }
    
    # Configure datastore with layout-aware chunking for RAG
    data = {
        "displayName": DISPLAY_NAME,
        "industryVertical": "GENERIC",
        "solutionTypes": ["SOLUTION_TYPE_SEARCH"],
        "contentConfig": "CONTENT_REQUIRED",
        "documentProcessingConfig": {
            # Enable document chunking for RAG
            "chunkingConfig": {
                "layoutBasedChunkingConfig": {
                    "chunkSize": 500,  # Token size limit per chunk (100-500)
                    "includeAncestorHeadings": True  # Include headings for context
                }
            },
            # Use layout parser as default for better document understanding
            "defaultParsingConfig": {
                "layoutParsingConfig": {}
            },
            # File-specific parser overrides
            "parsingConfigOverrides": {
                # Use layout parser for PDFs (therapy manuals)
                "pdf": {
                    "layoutParsingConfig": {}
                },
                # Use layout parser for DOCX files
                "docx": {
                    "layoutParsingConfig": {}
                },
                # Use layout parser for HTML if we have any
                "html": {
                    "layoutParsingConfig": {}
                }
            }
        }
    }
    
    print(f"Creating datastore '{DATASTORE_ID}' with layout-aware chunking...")
    
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
    """Create a GCS bucket for storing the EBT corpus documents."""
    from google.cloud import storage
    
    bucket_name = f"{PROJECT_ID}-ebt-corpus"
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

def upload_corpus_to_gcs(bucket_name):
    """Upload EBT corpus files to GCS bucket."""
    from google.cloud import storage
    
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(bucket_name)
    
    corpus_dir = "corpus"  # Since we run from backend/rag
    
    if not os.path.exists(corpus_dir):
        print(f"❌ Corpus directory '{corpus_dir}' not found!")
        print(f"   Current directory: {os.getcwd()}")
        print(f"   Available directories: {os.listdir('.')}")
        return False
    
    files_uploaded = 0
    files_failed = 0
    for filename in os.listdir(corpus_dir):
        if filename.endswith(('.pdf', '.docx', '.txt')):
            local_path = os.path.join(corpus_dir, filename)
            blob_name = f"corpus/{filename}"
            blob = bucket.blob(blob_name)
            
            try:
                print(f"📤 Uploading {filename}...")
                blob.upload_from_filename(local_path)
                files_uploaded += 1
                print(f"  ✅ Successfully uploaded {filename}")
            except Exception as e:
                print(f"  ❌ Failed to upload {filename}: {e}")
                files_failed += 1
    
    print(f"\n📊 Upload Summary:")
    print(f"  ✅ Successfully uploaded: {files_uploaded} files")
    if files_failed > 0:
        print(f"  ❌ Failed to upload: {files_failed} files")
    return files_uploaded > 0

def import_documents_to_datastore(bucket_name):
    """Import documents from GCS to the datastore."""
    from google.cloud import storage
    
    # First, create a metadata JSONL file for document import
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(bucket_name)
    
    # List all corpus files
    corpus_files = []
    for blob in bucket.list_blobs(prefix="corpus/"):
        if blob.name.endswith(('.pdf', '.docx', '.txt')):
            corpus_files.append(blob.name)
    
    if not corpus_files:
        print("❌ No corpus files found in bucket!")
        return None
    
    # Create metadata for each document
    metadata_lines = []
    for file_path in corpus_files:
        filename = file_path.split('/')[-1]
        doc_id = filename.replace('.', '_').replace(' ', '_')
        
        metadata = {
            "id": doc_id,
            "structData": {
                "title": filename,
                "content_uri": f"gs://{bucket_name}/{file_path}",
                "source": "EBT Manual",
                "type": "therapy_manual"
            },
            "content": {
                "uri": f"gs://{bucket_name}/{file_path}",
                "mimeType": "application/pdf" if file_path.endswith('.pdf') else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            }
        }
        
        import json
        metadata_lines.append(json.dumps(metadata))
    
    # Upload metadata file
    metadata_content = '\n'.join(metadata_lines)
    metadata_blob = bucket.blob("import_metadata.jsonl")
    metadata_blob.upload_from_string(metadata_content)
    print(f"✅ Created metadata file with {len(corpus_files)} documents")
    
    # Now import using the metadata file
    url = f"https://discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/dataStores/{DATASTORE_ID}/branches/0/documents:import"
    
    headers = {
        "Authorization": f"Bearer {get_access_token()}",
        "Content-Type": "application/json",
        "X-Goog-User-Project": PROJECT_ID
    }
    
    # Configure import from GCS using metadata file
    data = {
        "gcsSource": {
            "inputUris": [f"gs://{bucket_name}/import_metadata.jsonl"],
            "dataSchema": "document"
        },
        "reconciliationMode": "INCREMENTAL"
    }
    
    print(f"Importing {len(corpus_files)} documents from GCS to datastore...")
    for file in corpus_files:
        print(f"  - {file}")
    
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
    elapsed = 0
    
    while time.time() - start_time < timeout:
        url = f"https://discoveryengine.googleapis.com/v1/{operation_name}"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            operation = response.json()
            if operation.get("done"):
                if "error" in operation:
                    error_detail = operation.get('error', {})
                    print(f"\n❌❌❌ IMPORT OPERATION FAILED ❌❌❌")
                    print(f"Error Code: {error_detail.get('code', 'Unknown')}")
                    print(f"Error Message: {error_detail.get('message', 'No message provided')}")
                    if 'details' in error_detail:
                        print(f"Error Details: {json.dumps(error_detail['details'], indent=2)}")
                    print("❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌")
                    return False
                else:
                    # Check for partial failures in metadata
                    metadata = operation.get('metadata', {})
                    if metadata.get('successCount'):
                        print(f"\n✅ Operation completed!")
                        print(f"  📊 Import Statistics:")
                        print(f"    - Success Count: {metadata.get('successCount', 0)}")
                        print(f"    - Failure Count: {metadata.get('failureCount', 0)}")
                        print(f"    - Update Time: {metadata.get('updateTime', 'N/A')}")
                        
                        # Check for any partial failures
                        if metadata.get('failureCount', 0) > 0:
                            print(f"\n  ⚠️  Warning: {metadata.get('failureCount')} documents failed to import")
                            print(f"     Check the Google Cloud Console for details")
                    else:
                        print(f"✅ Operation completed successfully!")
                    return True
        else:
            print(f"❌ Error checking operation status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        elapsed = int(time.time() - start_time)
        print(f"⏳ Waiting for operation to complete... ({elapsed}/{timeout} seconds)")
        time.sleep(10)
    
    print(f"❌ Operation timed out after {timeout} seconds")
    print(f"   Operation name: {operation_name}")
    print(f"   Check the Google Cloud Console for status")
    return False

def update_datastore_path_in_code():
    """Update the datastore path in the therapy analysis function."""
    
    datastore_path = f"projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/dataStores/{DATASTORE_ID}"
    
    print(f"\n📝 Datastore path: {datastore_path}")
    print("\nThis path is already configured in backend/therapy-analysis-function/main.py")
    
    return datastore_path

def main():
    """Main function to set up the RAG datastore."""
    
    print(f"🚀 Setting up Vertex AI Search datastore for Ther-Assist")
    print(f"Project ID: {PROJECT_ID}")
    print(f"Datastore ID: {DATASTORE_ID}\n")
    
    try:
        # Create datastore with chunking enabled
        datastore = create_datastore()
        
        # Create GCS bucket
        bucket_name = create_gcs_bucket()
        
        # Upload corpus files
        if upload_corpus_to_gcs(bucket_name):
            # Import documents to datastore
            operation = import_documents_to_datastore(bucket_name)
            
            if operation:
                # Wait for import to complete
                if wait_for_operation(operation['name']):
                    print("\n✅✅✅ RAG DATASTORE SETUP COMPLETE! ✅✅✅")
                    
                    # Update datastore path
                    datastore_path = update_datastore_path_in_code()
                    
                    print("\n📚 Your EBT corpus has been:")
                    print("   ✅ Uploaded to GCS bucket")
                    print("   ✅ Imported into Vertex AI Search")
                    print("   ✅ Configured with layout-aware chunking (500 tokens per chunk)")
                    print("   ✅ Optimized for RAG with ancestor headings included")
                    
                    print("\n🎯 Files in EBT corpus:")
                    corpus_dir = "corpus"
                    if os.path.exists(corpus_dir):
                        for filename in os.listdir(corpus_dir):
                            if filename.endswith(('.pdf', '.docx', '.txt')):
                                print(f"   - {filename}")
                    
                    print("\n✨ You can now use this datastore for real-time therapy guidance!")
                else:
                    print("\n❌❌❌ IMPORT OPERATION FAILED OR TIMED OUT ❌❌❌")
                    print("⚠️  Troubleshooting steps:")
                    print("   1. Check the operation status in Google Cloud Console:")
                    print(f"      https://console.cloud.google.com/gen-app-builder/data-stores")
                    print("   2. Verify the GCS bucket has the files:")
                    print(f"      https://console.cloud.google.com/storage/browser/{bucket_name}")
                    print("   3. Check for API quotas or permissions issues")
        
    except Exception as e:
        print(f"\n❌ Setup failed: {str(e)}")
        raise

if __name__ == "__main__":
    # Check for required libraries
    try:
        import google.auth
        from google.cloud import storage
    except ImportError:
        print("Installing required dependencies...")
        os.system("pip install google-auth google-auth-httplib2 google-cloud-storage requests")
        print("Dependencies installed. Please run the script again.")
        exit(0)
    
    main()
