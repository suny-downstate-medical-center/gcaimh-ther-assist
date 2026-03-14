// Client Portal types — used by patient-facing components

// ── Homework ────────────────────────────────────────────────────

export type HomeworkStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface HomeworkAssignment {
  id: string;
  moduleId: string;
  moduleTitle: string;
  assignedAt: string;
  dueAt?: string;
  dueDate?: string;       // alias used by some components
  completedAt?: string;    // top-level alias for progress.completedAt
  status: HomeworkStatus;
  note?: string;
  progress?: {
    lastOpenedAt?: string;
    completedAt?: string;
    percentComplete?: number;
  };
}

// ── Psychoeducation Modules ─────────────────────────────────────

export interface PsychoeducationModule {
  id: string;
  title: string;
  category: string;
  summary: string;
  description?: string;   // alias for summary (used by some components)
  estimatedMinutes: number;
  tags: string[];
  content?: string;
  sections?: { title: string; body: string }[];
  relatedInterventionIds?: string[];
  recommendedInterventions?: string[];  // alias for relatedInterventionIds
}

// ── Interventions / Tools ───────────────────────────────────────

export interface Intervention {
  id: string;
  title: string;
  name?: string;           // alias for title (used by some components)
  type: string;
  description: string;
  durationSeconds: number;
  durationMinutes?: number; // convenience alias (durationSeconds / 60)
  instructions?: string[];
  frequency?: string;
  recentUsageCount?: number;
  journalPrompt?: string;  // optional prompt for post-intervention journaling
}

export interface InterventionSession {
  id: string;
  interventionId: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  rating?: number;
  notes?: string;
}

// ── Journal ─────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  date: string;
  moduleId?: string;
  interventionId?: string;
  sessionId?: string;
  keyInsights: string;
  personalApplication: string;
  discussionTopics: string;
  createdAt: string;
  updatedAt: string;
}

// ── Client Progress ─────────────────────────────────────────────

export interface ClientProgress {
  completedModules: number;
  totalAssigned: number;
  streakDays: number;
  totalInterventionMinutes: number;
  journalEntryCount: number;
  lastActiveAt: string;
}

// ── Therapy Sessions (for analysis) ─────────────────────────────

export interface TherapySession {
  id: string;
  date: string;
  durationMinutes: number;
  summary: string;
  themes: string[];
  keyMoments: string[];
  techniques: string[];
  homework: string[];
  insights: string[];
  emotionalState?: {
    start: string;
    end: string;
    shift: string;
  };
}

// ── Integrative Analysis ────────────────────────────────────────

export interface IntegrativeAnalysis {
  overallProgress: string;
  strengthAreas: string[];
  growthAreas: string[];
  patterns: string[];
  therapeuticInsights: string[];
  recommendations: string[];
  sessionCount: number;
  timeframeWeeks: number;
}

// ── Outcome Measures ────────────────────────────────────────────

export interface OutcomeThreshold {
  label: string;
  min: number;
  max: number;
  color: string;
}

export interface OutcomeMeasureItem {
  id: string;
  text: string;
  options: { value: number; label: string }[];
}

export interface OutcomeMeasure {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: string;
  items: OutcomeMeasureItem[];
  maxScore: number;
  scoring: 'sum' | 'average';
  thresholds: OutcomeThreshold[];
  cadence: 'weekly' | 'biweekly' | 'monthly';
}

export interface OutcomeResponse {
  id: string;
  measureId: string;
  weekOf: string;
  responses: number[];
  score: number;
  completedAt: string;
  createdAt?: string;  // alias for completedAt (used by some components)
}

export interface OutcomeSchedule {
  measures: { measureId: string; cadence: 'weekly' | 'biweekly' | 'monthly'; nextDue: string }[];
  reminderEnabled: boolean;
}
