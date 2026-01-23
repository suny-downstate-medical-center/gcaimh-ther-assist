## created by gemini CLI
# How to Add New Knowledge to the Ther-Assist RAG System

This guide explains how to extend the Ther-Assist application to include knowledge about new topics, using Obsessive Compulsive Disorder (OCD) as an example.

The process involves three main steps:
1.  **Add Documents**: Provide the new reference manuals and session transcripts.
2.  **Index Documents**: Run the processing scripts to add the new documents to the AI's searchable knowledge base.
3.  **Update Prompts**: Instruct the AI to use this new knowledge during its analysis.

---

### Step 1: Add Your New Documents

Place your new PDF documents into the appropriate folders within the `setup_services/rag/` directory.

1.  **For Reference Manuals**:
    *   **Location**: `setup_services/rag/corpus/`
    *   **Example**: Copy your manual, resulting in a path like `setup_services/rag/corpus/OCD-CBT-Manual.pdf`.

2.  **For Session Transcripts**:
    *   **Location**: `setup_services/rag/transcripts/`
    *   **Example**: Copy your transcript, resulting in a path like `setup_services/rag/transcripts/OCD-CBT-Session-Example.pdf`.

---

### Step 2: Re-run the Indexing Scripts

After adding the files, you must run the setup scripts to process and index them into their respective Vertex AI Search datastores. This makes them available for the RAG system to find.

**Prerequisites**:
*   Ensure you have authenticated your Google Cloud environment.
*   Install the necessary Python packages by running the following command from the root directory:
    ```bash
    pip install -r setup_services/rag/requirements.txt
    ```

**Commands**:
Run the following commands from the root directory of the project to index your new documents.

1.  **Index the New Manual**:
    *   This command processes the `corpus` directory and adds new documents to the `ebt-corpus` datastore.
    ```bash
    python setup_services/rag/setup_rag_datastore.py
    ```

2.  **Index the New Transcript**:
    *   This command processes the `transcripts` directory and adds new documents to the `transcript-patterns` datastore.
    ```bash
    python setup_services/rag/setup_transcript_datastore.py
    ```

---

### Step 3: Update the Prompt to Use New Knowledge

The final step is to tell the Gemini model to actively look for and use this new OCD-related information. You do this by editing the `COMPREHENSIVE_ANALYSIS_PROMPT` variable in the `backend/therapy-analysis-function/constants.py` file.

1.  **Open the file**: `backend/therapy-analysis-function/constants.py`

2.  **Locate the `COMPREHENSIVE_ANALYSIS_PROMPT`**: Find the multi-line string variable with this name.

3.  **Modify the instruction**: Change the line that instructs the model on what to search for. You need to add a reference to "OCD CBT sessions".

    **Change this line:**
    ```python
    4. Search for similar patterns in clinical transcripts (Beck sessions, PTSD sessions)
    ```

    **To this:**
    ```python
    4. Search for similar patterns in clinical transcripts (Beck sessions, PTSD sessions, OCD CBT sessions)
    ```

After saving the change and redeploying the `therapy-analysis-function`, the system will now be able to reference your newly added OCD manuals and transcripts during its comprehensive analysis.
