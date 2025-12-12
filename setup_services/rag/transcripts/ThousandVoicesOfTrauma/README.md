---
license: cc-by-nc-4.0
tags:
  - mental-health
  - therapy
  - synthetic-data
  - PTSD
  - LLM
pretty_name: Thousand Voices of Trauma
---

# Thousand Voices of Trauma: Synthetic PE Therapy Dataset

Thousand Voices of Trauma is a large-scale, privacy-preserving benchmark dataset designed to advance AI-driven research in trauma therapy, particularly Prolonged Exposure (PE) therapy for PTSD. It comprises 3,000 structured therapy conversations generated using Claude Sonnet 3.5, spanning 500 unique simulated clients, each undergoing six core therapy phases.

...

```
Thousand Voices of Trauma is a large-scale, privacy-preserving benchmark dataset designed to advance AI-driven research in trauma therapy,
particularly Prolonged Exposure (PE) therapy for PTSD. It comprises 3,000 structured therapy conversations generatedusing Claude Sonnet 3.5,
spanning 500 unique simulated clients, each undergoing six core therapy phases.

Dataset Structure
│
├── conversations/          # 3,000 JSON files with synthetic therapist-client dialogues
│   ├── 1_P5_conversations.json
│   ├── 1_P6_conversations.json
│   ├── ...
│
├── metadata/               # Matched metadata for each conversation
│   ├── 1_P5_metadata.json
│   ├── 1_P6_metadata.json
│   ├── ...
│
├── README.md               # Dataset description (you are here)
├── croissant.json          # Metadata schema file (for NeurIPS validation)
Each conversation is named as subjectID_phase_conversations.json, and its corresponding metadata file follows the same convention. 
```


The P5–P11 labels refer to six core stages of PE therapy:

```
P5: Orientation to Imaginal Exposure
P6: Monitoring SUDS Ratings
P7: Reinforcing During Exposure
P8: Eliciting Thoughts and Feelings
P10: Full Imaginal Exposure
P11: Processing the Exposure
```

__Description__

Each subject's conversation traces a progression through PTSD treatment, from initial anxiety to peak distress to cognitive-emotional processing. 

```
The dataset includes:
-> 500 subject profiles with diverse demographics (age, gender, ethnicity)
-> 20 trauma types (e.g., abuse, war, medical trauma, bullying)
-> 10 trauma-related behaviors (e.g., nightmares, dissociation)
-> Matching therapist metadata (age, gender, profile)
-> Prompt-driven generation using clinically grounded templates
-> The dialogues are emotionally rich and therapeutically aligned, validated by licensed clinicians for realism, narrative coherence, and alignment with PE protocols.
```

__Use Cases__

This dataset is designed for:
```
-> Benchmarking emotional trajectory modeling
-> Training AI agents for therapist simulation or support
-> Studying therapeutic structure, language use, and client engagement
-> Enhancing model evaluation for empathy, structure, and diversity
```

A benchmark suite for emotional trajectory prediction is available, including:
```
-> Pearson correlation
-> Dynamic Time Warping (DTW)
-> Root Mean Squared Error (RMSE)
```

__Privacy & Ethics__

This is a fully synthetic dataset. No real patient data is used. Prompts were crafted with therapeutic realism but filtered to avoid sensational or harmful outputs. Use is restricted to research and educational purposes.

Please do not use this dataset for:
```
-> Consumer-facing mental health applications
-> Diagnostic or treatment claims
-> Deployment in unsupervised clinical settings
```

__License__

This dataset is released under a Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) license.

__Citation__

```
If you use this dataset in your research, please cite:

Suhas BN, Sherrill AM, Arriaga RI, Wiese CW, Abdullah S. Thousand Voices of Trauma: A Large-Scale Synthetic Dataset
for Modeling Prolonged Exposure Therapy. NeurIPS 2025 (under review).
```