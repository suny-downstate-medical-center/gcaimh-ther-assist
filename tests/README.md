# Local Testing with Live RAG Datastores

This guide explains how to run the local test script (`local_test.py`) and ensure it queries the most up-to-date RAG (Retrieval-Augmented Generation) datastores in Vertex AI Search.

## Important: Local Tests Connect to Live Cloud Services

The `local_test.py` script executes Python code on your local machine, but it is **not** a completely offline unit test. The script calls functions that connect to and query **live Google Cloud services**, including:
*   The Gemini Large Language Model
*   The Vertex AI Search datastores (`ebt-corpus` and `transcript-patterns`)

This means that to test changes to your RAG documents, you must first update the cloud-based datastores. Running the local tests will incur costs on your Google Cloud project.

## Workflow for Testing with Updated RAG Documents

Follow these steps to update your RAG datastore and then run the local tests against it.

### Prerequisites

1.  **Google Cloud Project**: An active GCP project with billing enabled.
2.  **gcloud CLI**: The Google Cloud command-line tool must be installed and configured.
3.  **Python**: Python 3.8+ is recommended.
4.  **Permissions**: The user or service account running the scripts needs the following IAM roles on the project:
    *   `Vertex AI Admin` (or a role with `discoveryengine.datastore.*` permissions)
    *   `Storage Admin` (to create buckets and upload files)
    *   `Service Usage Consumer`

### Step 1: Authenticate with gcloud

You need to authenticate both for general CLI use and for Application Default Credentials (ADC), which the Python client libraries use.

```bash
# 1. Log in to the gcloud CLI
gcloud auth login

# 2. Set up Application Default Credentials for the client libraries
gcloud auth application-default login
```

### Step 2: Set Environment Variable

The setup scripts and the backend code rely on the `GOOGLE_CLOUD_PROJECT` environment variable.

```bash
# Replace "your-gcp-project-id" with your actual project ID
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
```

### Step 3: Install Dependencies

The RAG setup script has its own set of dependencies. Install them using `pip`.

```bash
pip install -r setup_services/rag/requirements.txt
```
*(Note: You only need to do this once or when the requirements file changes.)*

### Step 4: Add or Update Corpus Documents

Place the PDF, DOCX, or TXT files you want to include in your RAG knowledge base into the following directory:

`setup_services/rag/corpus/`

The setup script will automatically find and upload all supported files from this location.

### Step 5: Run the Datastore Setup Script

This script handles everything: creating the GCS bucket, uploading files, and importing them into the Vertex AI Search datastore.

**Navigate to the script's directory and run it:**

```bash
cd setup_services/rag/
python setup_rag_datastore.py
cd ../../
```

The script will provide detailed output of its progress. It can take several minutes to complete, as it waits for the cloud import operation to finish. Wait for the `✅✅✅ RAG DATASTORE SETUP COMPLETE! ✅✅✅` message before proceeding.

### Step 6: Run the Local Tests

Once the datastore is updated, you can run the `local_test.py` script. It will now use the new data for its RAG queries.

```bash
# Make sure you are in the project root directory
python tests/local_test.py
```

The output from the test script's "Segment Analysis Response" will now be grounded in the documents you just uploaded.
