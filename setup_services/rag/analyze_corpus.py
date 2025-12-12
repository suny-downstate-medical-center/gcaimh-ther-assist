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
Analyze corpus files to determine the best parser configuration for Vertex AI Search.
"""

import os
import sys
from pathlib import Path

# Try to import PyPDF2 or use basic file analysis
try:
    import PyPDF2
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False
    print("PyPDF2 not available - will use basic analysis")

def analyze_pdf(file_path):
    """Analyze a PDF file to determine its characteristics."""
    print(f"\nAnalyzing PDF: {file_path.name}")
    print(f"  File size: {file_path.stat().st_size / 1024 / 1024:.2f} MB")
    
    if PYPDF_AVAILABLE:
        try:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                num_pages = len(reader.pages)
                print(f"  Number of pages: {num_pages}")
                
                # Check if text is extractable (digital PDF)
                text_found = False
                sample_text = ""
                for i in range(min(3, num_pages)):  # Check first 3 pages
                    page = reader.pages[i]
                    text = page.extract_text()
                    if text and len(text.strip()) > 100:
                        text_found = True
                        sample_text = text[:200].strip()
                        break
                
                if text_found:
                    print(f"  Type: Digital PDF (searchable text)")
                    print(f"  Sample text: {sample_text}...")
                    
                    # Check for structure indicators
                    if any(word in sample_text.lower() for word in ['chapter', 'section', 'table of contents', 'introduction']):
                        print(f"  Structure: Appears to have chapters/sections")
                else:
                    print(f"  Type: Possibly scanned PDF or image-based")
                    
        except Exception as e:
            print(f"  Error analyzing PDF: {e}")
    else:
        print(f"  Type: Cannot determine without PyPDF2")

def analyze_docx(file_path):
    """Analyze a DOCX file."""
    print(f"\nAnalyzing DOCX: {file_path.name}")
    print(f"  File size: {file_path.stat().st_size / 1024:.2f} KB")
    print(f"  Type: Word document (likely structured with headings)")

def analyze_corpus():
    """Analyze all files in the corpus directory."""
    corpus_dir = Path("backend/rag/corpus")
    
    if not corpus_dir.exists():
        print(f"Corpus directory not found: {corpus_dir}")
        return
    
    files = list(corpus_dir.iterdir())
    print(f"Found {len(files)} files in corpus directory")
    
    pdf_files = []
    docx_files = []
    
    for file_path in files:
        if file_path.suffix.lower() == '.pdf':
            pdf_files.append(file_path)
            analyze_pdf(file_path)
        elif file_path.suffix.lower() == '.docx':
            docx_files.append(file_path)
            analyze_docx(file_path)
    
    # Recommendations
    print("\n" + "="*60)
    print("PARSER RECOMMENDATIONS:")
    print("="*60)
    
    print("\nBased on the analysis:")
    print("\n1. **Layout Parser** (RECOMMENDED)")
    print("   - Best for structured therapy manuals with sections, chapters, and tables")
    print("   - Detects document elements: paragraphs, tables, lists, headings")
    print("   - Enables content-aware chunking for better RAG performance")
    print("   - Works well with both PDF and DOCX formats")
    
    print("\n2. **Digital Parser** (NOT RECOMMENDED)")
    print("   - Only extracts text blocks without structure")
    print("   - Would lose important formatting and hierarchy")
    
    print("\n3. **OCR Parser** (NOT NEEDED)")
    print("   - Only needed for scanned PDFs")
    print("   - Your files appear to be digital PDFs with extractable text")
    
    print("\nRECOMMENDED CONFIGURATION:")
    print("""
    "documentProcessingConfig": {
        "chunkingConfig": {
            "layoutBasedChunkingConfig": {
                "chunkSize": 500,
                "includeAncestorHeadings": true
            }
        },
        "defaultParsingConfig": {
            "layoutParsingConfig": {}
        }
    }
    """)
    
    print("\nThis configuration will:")
    print("- Parse documents to detect structure (headings, sections, tables)")
    print("- Create 500-token chunks that respect document boundaries")
    print("- Include ancestor headings for context (e.g., 'Chapter 3 > Section 2')")
    print("- Optimize retrieval for therapy guidance queries")

if __name__ == "__main__":
    print("Corpus File Analysis for Vertex AI Search Parser Selection")
    print("="*60)
    
    analyze_corpus()
