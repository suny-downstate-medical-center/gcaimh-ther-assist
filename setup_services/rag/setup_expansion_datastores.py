#!/usr/bin/env python3
"""
RAG Corpus Expansion — Motivational Interviewing & Trauma-Informed Care
========================================================================
Creates two new Vertex AI Search datastores to expand TherAssist's
clinical knowledge base:

1. mi-corpus: Motivational Interviewing (MI) — one of the most common
   therapy modalities, currently missing from our RAG system
2. trauma-corpus: Trauma-Informed Care — PTSD, complex trauma, trauma-
   focused CBT, EMDR psychoeducation

Usage:
    export GOOGLE_CLOUD_PROJECT="brk-prj-salvador-dura-bern-sbx"

    # Step 1: Upload documents to GCS
    gsutil -m cp corpus_mi/*.pdf gs://${GOOGLE_CLOUD_PROJECT}-mi-corpus/
    gsutil -m cp corpus_trauma/*.pdf gs://${GOOGLE_CLOUD_PROJECT}-trauma-corpus/

    # Step 2: Create datastores and import
    python setup_expansion_datastores.py

    # Step 3: Update constants.py to route MI and trauma sessions to these datastores

After running this script, update backend/therapy-analysis-function/constants.py:
    - Add "mi-corpus" datastore ID to MI modality routing
    - Add "trauma-corpus" datastore ID to trauma/PTSD routing
    - Add MI to the modality detection prompt

Estimated cost: ~$200-500 for Discovery Engine indexing + ongoing query costs

Recommended documents to acquire:
    MI Corpus:
    - Miller & Rollnick (2012) Motivational Interviewing 3rd Ed (key chapters)
    - SAMHSA TIP 35: Enhancing Motivation for Change
    - MI-STEP training manual
    - MINT (Motivational Interviewing Network of Trainers) practice guides

    Trauma Corpus:
    - VA/DoD Clinical Practice Guideline for PTSD
    - ISTSS Treatment Guidelines
    - Judith Herman - Trauma and Recovery (key chapters)
    - Cohen et al. - Treating Trauma and Traumatic Grief in Children
    - SAMHSA TIP 57: Trauma-Informed Care
"""

import os
import sys
import time
import json
from google.auth import default
from google.auth.transport.requests import Request
import requests

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "brk-prj-salvador-dura-bern-sbx")
LOCATION = "us"

NEW_DATASTORES = [
    {
        "datastore_id": "mi-corpus",
        "display_name": "Motivational Interviewing Clinical Corpus",
        "gcs_uri": f"gs://{PROJECT_ID}-mi-corpus/",
        "description": (
            "Motivational Interviewing (MI) evidence-based practice materials: "
            "OARS techniques, change talk, sustain talk, rolling with resistance, "
            "stages of change, decisional balance, MI spirit, reflective listening"
        ),
    },
    {
        "datastore_id": "trauma-corpus",
        "display_name": "Trauma-Informed Care Clinical Corpus",
        "gcs_uri": f"gs://{PROJECT_ID}-trauma-corpus/",
        "description": (
            "Trauma-informed care resources: PTSD assessment and treatment, "
            "complex trauma, TF-CBT, CPT (Cognitive Processing Therapy), "
            "PE (Prolonged Exposure), EMDR psychoeducation, trauma-sensitive approaches, "
            "adverse childhood experiences (ACEs), re-traumatization prevention"
        ),
    },
]


def get_access_token():
    credentials, _ = default()
    credentials.refresh(Request())
    return credentials.token


def create_datastore(config):
    """Create a Discovery Engine datastore with layout-based chunking."""
    token = get_access_token()
    url = (
        f"https://us-discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}"
        f"/locations/{LOCATION}/collections/default_collection"
        f"/dataStores?dataStoreId={config['datastore_id']}"
    )

    body = {
        "displayName": config["display_name"],
        "industryVertical": "GENERIC",
        "contentConfig": "CONTENT_REQUIRED",
        "solutionTypes": ["SOLUTION_TYPE_SEARCH"],
        "documentProcessingConfig": {
            "chunkingConfig": {
                "layoutBasedChunkingConfig": {
                    "chunkSize": 500,
                    "includeAncestorHeadings": True,
                }
            }
        },
    }

    resp = requests.post(url, json=body, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-goog-user-project": PROJECT_ID,
    })

    if resp.status_code == 200 or resp.status_code == 409:
        print(f"  Datastore '{config['datastore_id']}' ready")
        return True
    else:
        print(f"  ERROR creating datastore: {resp.status_code} {resp.text}")
        return False


def import_documents(config):
    """Import documents from GCS into the datastore."""
    token = get_access_token()
    url = (
        f"https://us-discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}"
        f"/locations/{LOCATION}/collections/default_collection"
        f"/dataStores/{config['datastore_id']}/branches/default_branch"
        f"/documents:import"
    )

    body = {
        "gcsSource": {
            "inputUris": [config["gcs_uri"] + "*.pdf"],
            "dataSchema": "content",
        },
        "reconciliationMode": "INCREMENTAL",
    }

    resp = requests.post(url, json=body, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-goog-user-project": PROJECT_ID,
    })

    if resp.status_code == 200:
        operation = resp.json()
        print(f"  Import started: {operation.get('name', 'unknown')}")
        return True
    else:
        print(f"  ERROR importing: {resp.status_code} {resp.text}")
        return False


def print_constants_update():
    """Print the code changes needed in constants.py after datastore creation."""
    print("\n" + "=" * 60)
    print("NEXT STEPS: Update constants.py")
    print("=" * 60)
    print("""
Add these datastore IDs to backend/therapy-analysis-function/constants.py:

1. In the RAG_DATASTORES dict, add:
    "mi-corpus": "projects/{PROJECT_ID}/locations/us/collections/default_collection/dataStores/mi-corpus",
    "trauma-corpus": "projects/{PROJECT_ID}/locations/us/collections/default_collection/dataStores/trauma-corpus",

2. In the modality routing logic (get_rag_tools_for_session), add:
    - MI modality -> include mi-corpus datastore
    - Any session with trauma indicators -> include trauma-corpus datastore

3. In COMPREHENSIVE_ANALYSIS_PROMPT, add "Motivational Interviewing" to the
   modality options list so Gemini can identify MI sessions.
""")


if __name__ == "__main__":
    print(f"=== RAG Corpus Expansion ===")
    print(f"Project: {PROJECT_ID}")
    print(f"Location: {LOCATION}")
    print()

    for config in NEW_DATASTORES:
        print(f"\n--- {config['display_name']} ---")
        print(f"  Datastore ID: {config['datastore_id']}")
        print(f"  GCS source: {config['gcs_uri']}")

        print("  Creating datastore...")
        if create_datastore(config):
            print("  Importing documents...")
            import_documents(config)

    print_constants_update()
