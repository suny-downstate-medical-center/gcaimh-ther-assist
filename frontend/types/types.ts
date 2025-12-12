// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export interface SessionContext {
  session_type: string;
  primary_concern: string;
  current_approach: string;
}

export interface Alert {
  timing: 'now' | 'pause' | 'info';  // Simplified!
  category: 'safety' | 'technique' | 'pathway_change' | 'engagement' | 'process';
  title: string;
  message: string;
  evidence?: string[];
  recommendation?: string[]; // Array of recommendation strings
  immediateActions?: string[];
  contraindications?: string[];
  manual_reference?: {
    source: string;
    page?: number;
    section?: string;
  };
  timestamp?: string;
  sessionTime?: number;
  
  // Legacy fields for backward compatibility (to be removed)
  level?: 'critical' | 'suggestion' | 'info';
  urgency?: 'immediate' | 'next_pause' | 'end_of_topic';
}

export interface SessionMetrics {
  engagement_level: number;
  therapeutic_alliance: 'weak' | 'moderate' | 'strong';
  techniques_detected: string[];
  emotional_state: 'calm' | 'anxious' | 'distressed' | 'dissociated' | 'engaged' | 'unknown';
  phase_appropriate: boolean;
}

export interface PathwayIndicators {
  current_approach_effectiveness: 'effective' | 'struggling' | 'ineffective' | 'unknown';
  alternative_pathways: string[];
  change_urgency: 'none' | 'monitor' | 'consider' | 'recommended';
}

export interface Citation {
  citation_number: number;
  source?: {
    title?: string;
    uri?: string;
    excerpt?: string;
    pages?: {
      first: number;
      last: number;
    };
  };
}

export interface AnalysisResponse {
  alerts?: Alert[];
  alert?: Alert; // New single alert property
  session_metrics?: SessionMetrics;
  pathway_indicators?: PathwayIndicators;
  citations?: Citation[];
  timestamp?: string;
  session_phase?: string;
  analysis_type?: 'realtime' | 'comprehensive';
}

export interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: string;
}

export interface TranscriptionConfig {
  sample_rate: number;
  encoding: string;
  chunk_size_ms: number;
}

export interface SessionSummary {
  session_date: string;
  duration_minutes: number;
  key_moments: Array<{
    time: string;
    description: string;
    significance: string;
  }>;
  techniques_used: string[];
  progress_indicators: string[];
  areas_for_improvement: string[];
  homework_assignments: Array<{
    task: string;
    rationale: string;
    manual_reference?: string;
  }>;
  follow_up_recommendations: string[];
  risk_assessment: {
    level: 'low' | 'moderate' | 'high';
    factors: string[];
  };
}

export interface SessionHistory {
  id: string;
  date: string;
  duration: number; // in minutes
  summary: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  nextVisit: string | null;
  lastVisit: string | null;
  patientSince: string;
  focusTopics?: string;
  status: 'active' | 'inactive' | 'paused';
  sessionHistory?: SessionHistory[];
  contactInfo?: {
    phone?: string;
    email?: string;
  };
}
