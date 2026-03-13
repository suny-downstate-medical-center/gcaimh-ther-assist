/**
 * Mock Provider — Therapist ↔ Client Portal Bridge
 *
 * localStorage-persisted. No backend required.
 * Seeds demo data for clients 1 (Sarah Johnson), 2 (Michael Chen), 3 (Jane Doe).
 *
 * Storage key : therapist-bridge-v1
 * Feature flag: THERAPIST_CLIENT_PORTAL_BRIDGE_USE_MOCK
 */

import {
  TherapistClientBridgeProvider,
  BridgeClient,
  ClientPortalOverview,
  TherapistHomeworkItem,
  HomeworkBridgeStatus,
  TherapistInterventionAssignment,
  PublishDraft,
  OutcomeOverview,
  OutcomeTrendEntry,
  ActivityEvent,
  ActivityEventType,
  ModuleForAssignment,
  InterventionForAssignment,
  QuestionnaireDefinition,
  QuestionnaireAssignment,
  QuestionnaireResponse,
  QuestionnaireCadence,
  QuestionnaireStatus,
} from '../types/therapistClientBridge';

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'therapist-bridge-v1';

interface BridgeStorage {
  homework: Record<string, TherapistHomeworkItem[]>;
  interventions: Record<string, TherapistInterventionAssignment[]>;
  publishDrafts: Record<string, PublishDraft>;
  activityLog: ActivityEvent[];
  questionnaireAssignments: Record<string, QuestionnaireAssignment[]>;
  questionnaireResponses: QuestionnaireResponse[];
}

// ---------------------------------------------------------------------------
// Seed: Clients (matching IDs in mockPatients.ts)
// ---------------------------------------------------------------------------

const SEED_CLIENTS: BridgeClient[] = [
  { id: '1', name: 'Sarah Johnson',   age: 28, status: 'active',   primaryConcern: 'Social Anxiety, Work Performance' },
  { id: '2', name: 'Michael Chen',    age: 35, status: 'active',   primaryConcern: 'PTSD, Nightmares' },
  { id: '3', name: 'Jane Doe',        age: 42, status: 'active',   primaryConcern: 'PTSD, Depression' },
  { id: '4', name: 'David Thompson',  age: 31, status: 'paused',   primaryConcern: 'Social Phobia' },
  { id: '5', name: 'Jessica Wong',    age: 29, status: 'active',   primaryConcern: 'Panic Disorder' },
  { id: '6', name: 'Robert Martinez', age: 38, status: 'active',   primaryConcern: 'OCD, Checking Rituals' },
];

// ---------------------------------------------------------------------------
// Seed: Modules available for assignment
// ---------------------------------------------------------------------------

const SEED_MODULES: ModuleForAssignment[] = [
  { id: 'mod-catastrophizing',    title: 'Understanding Catastrophizing',              category: 'COGNITIVE',   estimatedMinutes: 8,  summary: 'Recognize and challenge catastrophic thinking that amplifies anxiety.',              tags: ['anxiety', 'CBT', 'cognitive-distortion'] },
  { id: 'mod-black-white-thinking', title: 'All-or-Nothing Thinking',                 category: 'COGNITIVE',   estimatedMinutes: 6,  summary: 'Soften extreme black-and-white thinking patterns.',                                 tags: ['perfectionism', 'CBT'] },
  { id: 'mod-confirmation-bias',  title: 'Confirmation Bias & Selective Attention',   category: 'COGNITIVE',   estimatedMinutes: 7,  summary: 'Understand how we filter reality to match our beliefs.',                           tags: ['awareness', 'CBT'] },
  { id: 'mod-thought-defusion',   title: 'Thought Defusion: "I Am Not My Thoughts"',  category: 'COGNITIVE',   estimatedMinutes: 9,  summary: 'Observe thoughts without being consumed by them.',                                 tags: ['mindfulness', 'ACT'] },
  { id: 'mod-threat-system',      title: 'Understanding Your Stress & Threat System', category: 'EMOTIONAL',   estimatedMinutes: 12, summary: 'Learn how your nervous system responds to perceived threats.',                     tags: ['nervous-system', 'psychoeducation'] },
  { id: 'mod-window-tolerance',   title: 'Window of Tolerance',                       category: 'EMOTIONAL',   estimatedMinutes: 10, summary: 'Understand your optimal zone for processing emotions and trauma.',                 tags: ['trauma', 'regulation'] },
  { id: 'mod-anxiety-purpose',    title: 'The Purpose of Anxiety',                    category: 'EMOTIONAL',   estimatedMinutes: 8,  summary: 'Reframe anxiety as useful signal rather than enemy.',                              tags: ['anxiety', 'psychoeducation'] },
  { id: 'mod-behavioral-activation', title: 'Behavioral Activation for Depression',  category: 'BEHAVIORAL',  estimatedMinutes: 11, summary: 'Break the depression-inactivity cycle with small, achievable actions.',            tags: ['depression', 'CBT'] },
  { id: 'mod-motivation-myth',    title: 'The Motivation Myth',                       category: 'BEHAVIORAL',  estimatedMinutes: 7,  summary: 'Action comes before motivation — not after.',                                     tags: ['depression', 'behavioral'] },
  { id: 'mod-trauma-responses',   title: 'Understanding Trauma Responses',            category: 'TRAUMA',      estimatedMinutes: 13, summary: 'Normalize fight, flight, freeze, and fawn responses after trauma.',               tags: ['trauma', 'PTSD', 'psychoeducation'] },
  { id: 'mod-grounding-science',  title: 'Why Grounding Works',                       category: 'GENERAL',     estimatedMinutes: 6,  summary: 'The neuroscience behind grounding and why it regulates distress.',               tags: ['grounding', 'nervous-system'] },
];

// ---------------------------------------------------------------------------
// Seed: Interventions available for assignment
// ---------------------------------------------------------------------------

const SEED_INTERVENTIONS: InterventionForAssignment[] = [
  { id: 'int-box-breathing',       title: 'Box Breathing',              type: 'BREATHWORK',       durationSeconds: 120, description: 'Equal 4-count inhale, hold, exhale, hold. Calms the nervous system rapidly.' },
  { id: 'int-grounding',           title: '5-4-3-2-1 Grounding',        type: 'GROUNDING',        durationSeconds: 60,  description: 'Sensory anchoring exercise: 5 see, 4 hear, 3 feel, 2 smell, 1 taste.' },
  { id: 'int-cognitive-reframe',   title: 'Cognitive Reframe',          type: 'COGNITIVE',        durationSeconds: 180, description: 'Guided thought record: identify distortion, weigh evidence, form balanced thought.' },
  { id: 'int-progressive-muscle',  title: 'Progressive Muscle Relaxation', type: 'BODY_AWARENESS', durationSeconds: 300, description: 'Systematically tense and release muscle groups to reduce physical tension.' },
  { id: 'int-safe-place',          title: 'Safe Place Visualization',   type: 'MINDFULNESS',      durationSeconds: 240, description: 'Build a mental safe haven for use during distress or before processing trauma.' },
  { id: 'int-sound',               title: 'Containment (Sound)',        type: 'SOUND',            durationSeconds: 90,  description: 'Humming/toning to self-regulate via vagal activation.' },
  { id: 'int-exposure-mini',       title: 'Mini Exposure Plan',         type: 'EXPOSURE',         durationSeconds: 600, description: 'Structured brief exposure to low-level feared stimulus with planned coping.' },
];

// ---------------------------------------------------------------------------
// Seed: Homework assignments per client
// ---------------------------------------------------------------------------

const SEED_HOMEWORK: Record<string, TherapistHomeworkItem[]> = {
  '1': [ // Sarah Johnson
    { id: 'hw-1-1', clientId: '1', moduleId: 'mod-catastrophizing',   moduleTitle: 'Understanding Catastrophizing',              moduleCategory: 'COGNITIVE',  estimatedMinutes: 8,  assignedAt: '2026-01-20T10:00:00Z', dueAt: '2026-01-27T00:00:00Z', status: 'COMPLETED', note: 'Focus on work-related scenarios.',      progress: { lastOpenedAt: '2026-01-22T18:30:00Z', completedAt: '2026-01-23T09:15:00Z' } },
    { id: 'hw-1-2', clientId: '1', moduleId: 'mod-black-white-thinking', moduleTitle: 'All-or-Nothing Thinking',                category: 'COGNITIVE',  estimatedMinutes: 6,  assignedAt: '2026-02-03T10:00:00Z', dueAt: '2026-02-10T00:00:00Z', status: 'IN_PROGRESS', note: 'Look for perfectionist patterns before meetings.', progress: { lastOpenedAt: '2026-02-05T20:00:00Z' } },
    { id: 'hw-1-3', clientId: '1', moduleId: 'mod-anxiety-purpose',   moduleTitle: 'The Purpose of Anxiety',                   moduleCategory: 'EMOTIONAL',  estimatedMinutes: 8,  assignedAt: '2026-02-10T10:00:00Z', dueAt: '2026-02-17T00:00:00Z', status: 'ASSIGNED',    note: 'Read before next session.' },
  ] as TherapistHomeworkItem[],
  '2': [ // Michael Chen
    { id: 'hw-2-1', clientId: '2', moduleId: 'mod-trauma-responses',  moduleTitle: 'Understanding Trauma Responses',           moduleCategory: 'TRAUMA',     estimatedMinutes: 13, assignedAt: '2026-01-15T10:00:00Z', dueAt: '2026-01-22T00:00:00Z', status: 'COMPLETED',   progress: { lastOpenedAt: '2026-01-17T19:00:00Z', completedAt: '2026-01-18T08:00:00Z' } },
    { id: 'hw-2-2', clientId: '2', moduleId: 'mod-window-tolerance',  moduleTitle: 'Window of Tolerance',                      moduleCategory: 'EMOTIONAL',  estimatedMinutes: 10, assignedAt: '2026-02-05T10:00:00Z', dueAt: '2026-02-12T00:00:00Z', status: 'ASSIGNED',    note: 'Relate to recent grounding work in session.' },
  ] as TherapistHomeworkItem[],
  '3': [ // Jane Doe
    { id: 'hw-3-1', clientId: '3', moduleId: 'mod-behavioral-activation', moduleTitle: 'Behavioral Activation for Depression', moduleCategory: 'BEHAVIORAL', estimatedMinutes: 11, assignedAt: '2026-01-10T10:00:00Z', dueAt: '2026-01-17T00:00:00Z', status: 'COMPLETED',   progress: { lastOpenedAt: '2026-01-12T15:00:00Z', completedAt: '2026-01-13T10:30:00Z' } },
    { id: 'hw-3-2', clientId: '3', moduleId: 'mod-motivation-myth',   moduleTitle: 'The Motivation Myth',                      moduleCategory: 'BEHAVIORAL', estimatedMinutes: 7,  assignedAt: '2026-01-20T10:00:00Z', dueAt: '2026-01-27T00:00:00Z', status: 'COMPLETED',   progress: { lastOpenedAt: '2026-01-21T19:30:00Z', completedAt: '2026-01-22T09:00:00Z' } },
    { id: 'hw-3-3', clientId: '3', moduleId: 'mod-trauma-responses',  moduleTitle: 'Understanding Trauma Responses',           moduleCategory: 'TRAUMA',     estimatedMinutes: 13, assignedAt: '2026-02-01T10:00:00Z', dueAt: '2026-02-10T00:00:00Z', status: 'IN_PROGRESS', note: 'Connect to robbery incident discussion.',           progress: { lastOpenedAt: '2026-02-04T20:00:00Z' } },
  ] as TherapistHomeworkItem[],
};

// ---------------------------------------------------------------------------
// Seed: Intervention assignments per client
// ---------------------------------------------------------------------------

const SEED_INTERVENTIONS_ASSIGNED: Record<string, TherapistInterventionAssignment[]> = {
  '1': [
    { id: 'ia-1-1', clientId: '1', interventionId: 'int-box-breathing',     interventionTitle: 'Box Breathing',           interventionType: 'BREATHWORK', assignedAt: '2026-01-20T10:00:00Z', frequency: 'DAILY',     status: 'ACTIVE',    note: 'Use before social situations.',    recentUsageCount: 5 },
    { id: 'ia-1-2', clientId: '1', interventionId: 'int-cognitive-reframe', interventionTitle: 'Cognitive Reframe',       interventionType: 'COGNITIVE',  assignedAt: '2026-02-03T10:00:00Z', frequency: 'AS_NEEDED', status: 'ACTIVE',    note: 'When catastrophic thoughts arise.', recentUsageCount: 2 },
  ],
  '2': [
    { id: 'ia-2-1', clientId: '2', interventionId: 'int-grounding',         interventionTitle: '5-4-3-2-1 Grounding',    interventionType: 'GROUNDING',  assignedAt: '2026-01-15T10:00:00Z', frequency: 'TWICE_DAILY', status: 'ACTIVE',  note: 'Morning and before sleep.',        recentUsageCount: 8 },
    { id: 'ia-2-2', clientId: '2', interventionId: 'int-safe-place',        interventionTitle: 'Safe Place Visualization', interventionType: 'MINDFULNESS', assignedAt: '2026-02-01T10:00:00Z', frequency: 'DAILY', status: 'ACTIVE',    note: 'Use when intrusive memories arise.', recentUsageCount: 3 },
  ],
  '3': [
    { id: 'ia-3-1', clientId: '3', interventionId: 'int-progressive-muscle', interventionTitle: 'Progressive Muscle Relaxation', interventionType: 'BODY_AWARENESS', assignedAt: '2026-01-10T10:00:00Z', frequency: 'DAILY', status: 'ACTIVE', note: 'Before bed to improve sleep.', recentUsageCount: 4 },
    { id: 'ia-3-2', clientId: '3', interventionId: 'int-box-breathing',     interventionTitle: 'Box Breathing',           interventionType: 'BREATHWORK', assignedAt: '2026-01-20T10:00:00Z', frequency: 'AS_NEEDED', status: 'ACTIVE',   note: 'During low-mood episodes.',        recentUsageCount: 1 },
  ],
};

// ---------------------------------------------------------------------------
// Seed: Publish drafts per client
// ---------------------------------------------------------------------------

const SEED_PUBLISH_DRAFTS: Record<string, PublishDraft> = {
  '1': {
    id: 'draft-1',
    clientId: '1',
    sessionId: '1-4',
    sessionDate: '2025-07-15',
    sections: { themes: true, keyMoments: true, homeworkList: true, riskLabel: false, nextSteps: true },
    published: true,
    publishedAt: '2025-07-15T18:00:00Z',
    content: {
      themes: ['Managing anxiety in social situations', 'Cognitive restructuring for catastrophic thinking', 'Breathing techniques in practice'],
      keyMoments: ['Identified the link between physical tension and anticipatory anxiety', 'Successfully used box breathing during role-play scenario', 'Recognized all-or-nothing thinking before a work meeting'],
      homeworkList: ['Continue daily box breathing (morning + pre-meeting)', 'Read "All-or-Nothing Thinking" module', 'Keep a brief thought record for social situations'],
      riskLabel: 'Low',
      nextSteps: ['Explore exposure hierarchy for social events', 'Review thought record at next session', 'Consider group setting practice'],
      clinicalNote: 'Client demonstrated meaningful progress applying breathing techniques in real-world scenarios.',
    },
  },
  '2': {
    id: 'draft-2',
    clientId: '2',
    sessionId: '2-5',
    sessionDate: '2025-07-10',
    sections: { themes: true, keyMoments: true, homeworkList: true, riskLabel: false, nextSteps: true },
    published: false,
    content: {
      themes: ['Processing trauma memories via EMDR', 'Grounding techniques for hypervigilance', 'Sleep hygiene and nightmare management'],
      keyMoments: ['Completed desensitization phase for targeted memory with decreased emotional intensity', 'Successfully used 5-4-3-2-1 grounding at work', 'Reported first nightmare-free night this month'],
      homeworkList: ['Daily grounding practice (morning + evening)', 'Read "Window of Tolerance" module', 'Track nightmare frequency in sleep log'],
      riskLabel: 'Low',
      nextSteps: ['Continue EMDR processing — next memory target identified', 'Practice dual awareness in low-stress situations', 'Discuss sleep hygiene adjustments'],
      clinicalNote: 'Strong EMDR progress. Client is building capacity for processing with good bilateral awareness.',
    },
  },
  '3': {
    id: 'draft-3',
    clientId: '3',
    sessionId: '3-5',
    sessionDate: '2025-07-18',
    sections: { themes: true, keyMoments: true, homeworkList: true, riskLabel: true, nextSteps: true },
    published: true,
    publishedAt: '2025-07-18T19:00:00Z',
    content: {
      themes: ['Behavioral activation and daily functioning', 'Trauma exposure preparation', 'Motivation and energy management'],
      keyMoments: ['Acknowledged progress in activity engagement over past month', 'Identified the robbery incident as primary trauma target for upcoming exposure work', 'Developed a structured weekly activity schedule'],
      homeworkList: ['Follow weekly activity schedule (3 planned activities)', 'Continue progressive muscle relaxation at bedtime', 'Read "Understanding Trauma Responses" module'],
      riskLabel: 'Low-Moderate',
      nextSteps: ['Begin exposure hierarchy construction next session', 'Monitor mood and activity correlation', 'Check in on medication response with prescriber'],
      clinicalNote: 'Client is ready to begin trauma-focused work. Safety plan reviewed and updated.',
    },
  },
};

// ---------------------------------------------------------------------------
// Seed: Outcome data per client (7 weeks)
// ---------------------------------------------------------------------------

type SeedOutcomeRow = { weekOf: string; phq9?: number; gad7?: number; panic?: number; phq9Item9?: number };

const SEED_OUTCOMES: Record<string, SeedOutcomeRow[]> = {
  '1': [ // Sarah — primarily anxiety
    { weekOf: '2026-01-05', gad7: 14, panic: 8 },
    { weekOf: '2026-01-12', gad7: 12, panic: 7 },
    { weekOf: '2026-01-19', gad7: 11, panic: 6 },
    { weekOf: '2026-01-26', gad7: 10, panic: 5 },
    { weekOf: '2026-02-02', gad7: 8,  panic: 4 },
    { weekOf: '2026-02-09', gad7: 7,  panic: 3 },
    { weekOf: '2026-02-16', gad7: 6,  panic: 3 },
  ],
  '2': [ // Michael — PTSD + panic
    { weekOf: '2026-01-05', gad7: 16, panic: 10 },
    { weekOf: '2026-01-12', gad7: 14, panic: 9 },
    { weekOf: '2026-01-19', gad7: 13, panic: 8 },
    { weekOf: '2026-01-26', gad7: 12, panic: 7 },
    { weekOf: '2026-02-02', gad7: 10, panic: 6 },
    { weekOf: '2026-02-09', gad7: 9,  panic: 5 },
    { weekOf: '2026-02-16', gad7: 8,  panic: 4 },
  ],
  '3': [ // Jane — depression + PHQ-9 safety flag
    { weekOf: '2026-01-05', phq9: 18, phq9Item9: 1 },
    { weekOf: '2026-01-12', phq9: 16, phq9Item9: 1 },
    { weekOf: '2026-01-19', phq9: 14, phq9Item9: 1 },
    { weekOf: '2026-01-26', phq9: 13, phq9Item9: 0 },
    { weekOf: '2026-02-02', phq9: 11, phq9Item9: 0 },
    { weekOf: '2026-02-09', phq9: 10, phq9Item9: 0 },
    { weekOf: '2026-02-16', phq9: 9,  phq9Item9: 0 },
  ],
};

// ---------------------------------------------------------------------------
// Seed: Questionnaire definitions
// ---------------------------------------------------------------------------

const SEED_QUESTIONNAIRE_DEFS: QuestionnaireDefinition[] = [
  {
    id: 'q-phq9', name: 'Patient Health Questionnaire-9', shortName: 'PHQ-9',
    description: 'Screens for depression severity over the past 2 weeks. 9 items scored 0-3.',
    itemCount: 9, maxScore: 27, estimatedMinutes: 3, category: 'DEPRESSION',
    thresholds: [
      { label: 'Minimal', min: 0, max: 4, color: 'success' },
      { label: 'Mild', min: 5, max: 9, color: 'info' },
      { label: 'Moderate', min: 10, max: 14, color: 'warning' },
      { label: 'Moderately Severe', min: 15, max: 19, color: 'error' },
      { label: 'Severe', min: 20, max: 27, color: 'error' },
    ],
  },
  {
    id: 'q-gad7', name: 'Generalized Anxiety Disorder-7', shortName: 'GAD-7',
    description: 'Measures generalized anxiety severity over the past 2 weeks. 7 items scored 0-3.',
    itemCount: 7, maxScore: 21, estimatedMinutes: 2, category: 'ANXIETY',
    thresholds: [
      { label: 'Minimal', min: 0, max: 4, color: 'success' },
      { label: 'Mild', min: 5, max: 9, color: 'info' },
      { label: 'Moderate', min: 10, max: 14, color: 'warning' },
      { label: 'Severe', min: 15, max: 21, color: 'error' },
    ],
  },
  {
    id: 'q-pcl5', name: 'PTSD Checklist for DSM-5', shortName: 'PCL-5',
    description: 'Assesses PTSD symptom severity over the past month. 20 items scored 0-4.',
    itemCount: 20, maxScore: 80, estimatedMinutes: 8, category: 'TRAUMA',
    thresholds: [
      { label: 'Below threshold', min: 0, max: 30, color: 'success' },
      { label: 'Probable PTSD', min: 31, max: 50, color: 'warning' },
      { label: 'Severe', min: 51, max: 80, color: 'error' },
    ],
  },
  {
    id: 'q-dass21', name: 'Depression Anxiety Stress Scales-21', shortName: 'DASS-21',
    description: 'Measures depression, anxiety, and stress. 21 items across three 7-item subscales.',
    itemCount: 21, maxScore: 63, estimatedMinutes: 5, category: 'GENERAL',
    thresholds: [
      { label: 'Normal', min: 0, max: 14, color: 'success' },
      { label: 'Mild', min: 15, max: 25, color: 'info' },
      { label: 'Moderate', min: 26, max: 38, color: 'warning' },
      { label: 'Severe', min: 39, max: 63, color: 'error' },
    ],
  },
  {
    id: 'q-audit', name: 'Alcohol Use Disorders Identification Test', shortName: 'AUDIT',
    description: 'Screens for hazardous alcohol consumption. 10 items.',
    itemCount: 10, maxScore: 40, estimatedMinutes: 3, category: 'SUBSTANCE',
    thresholds: [
      { label: 'Low risk', min: 0, max: 7, color: 'success' },
      { label: 'Hazardous', min: 8, max: 15, color: 'info' },
      { label: 'Harmful', min: 16, max: 19, color: 'warning' },
      { label: 'Possible dependence', min: 20, max: 40, color: 'error' },
    ],
  },
  {
    id: 'q-wsas', name: 'Work and Social Adjustment Scale', shortName: 'WSAS',
    description: 'Measures functional impairment across work, social, and leisure domains. 5 items scored 0-8.',
    itemCount: 5, maxScore: 40, estimatedMinutes: 2, category: 'FUNCTIONAL',
    thresholds: [
      { label: 'Low impairment', min: 0, max: 9, color: 'success' },
      { label: 'Moderate', min: 10, max: 19, color: 'info' },
      { label: 'Significant', min: 20, max: 29, color: 'warning' },
      { label: 'Severe', min: 30, max: 40, color: 'error' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed: Questionnaire assignments per client
// ---------------------------------------------------------------------------

const SEED_Q_ASSIGNMENTS: Record<string, QuestionnaireAssignment[]> = {
  '1': [ // Sarah — anxiety focus
    { id: 'qa-1-1', clientId: '1', questionnaireId: 'q-gad7', questionnaireName: 'Generalized Anxiety Disorder-7', questionnaireShortName: 'GAD-7', cadence: 'WEEKLY', status: 'ACTIVE', assignedAt: '2026-01-05T10:00:00Z', completionCount: 7, lastCompletedAt: '2026-02-16T09:00:00Z', nextDueAt: '2026-02-23T00:00:00Z' },
    { id: 'qa-1-2', clientId: '1', questionnaireId: 'q-wsas', questionnaireName: 'Work and Social Adjustment Scale', questionnaireShortName: 'WSAS', cadence: 'MONTHLY', status: 'ACTIVE', assignedAt: '2026-01-05T10:00:00Z', completionCount: 2, lastCompletedAt: '2026-02-05T10:00:00Z', nextDueAt: '2026-03-05T00:00:00Z' },
  ],
  '2': [ // Michael — PTSD
    { id: 'qa-2-1', clientId: '2', questionnaireId: 'q-pcl5', questionnaireName: 'PTSD Checklist for DSM-5', questionnaireShortName: 'PCL-5', cadence: 'BIWEEKLY', status: 'ACTIVE', assignedAt: '2026-01-05T10:00:00Z', completionCount: 4, lastCompletedAt: '2026-02-16T10:00:00Z', nextDueAt: '2026-03-02T00:00:00Z' },
    { id: 'qa-2-2', clientId: '2', questionnaireId: 'q-gad7', questionnaireName: 'Generalized Anxiety Disorder-7', questionnaireShortName: 'GAD-7', cadence: 'WEEKLY', status: 'ACTIVE', assignedAt: '2026-01-05T10:00:00Z', completionCount: 7, lastCompletedAt: '2026-02-16T09:30:00Z', nextDueAt: '2026-02-23T00:00:00Z' },
  ],
  '3': [ // Jane — depression
    { id: 'qa-3-1', clientId: '3', questionnaireId: 'q-phq9', questionnaireName: 'Patient Health Questionnaire-9', questionnaireShortName: 'PHQ-9', cadence: 'WEEKLY', status: 'ACTIVE', assignedAt: '2026-01-05T10:00:00Z', completionCount: 7, lastCompletedAt: '2026-02-16T08:00:00Z', nextDueAt: '2026-02-23T00:00:00Z' },
    { id: 'qa-3-2', clientId: '3', questionnaireId: 'q-dass21', questionnaireName: 'Depression Anxiety Stress Scales-21', questionnaireShortName: 'DASS-21', cadence: 'MONTHLY', status: 'PAUSED', assignedAt: '2026-01-05T10:00:00Z', pausedAt: '2026-02-01T10:00:00Z', completionCount: 1, lastCompletedAt: '2026-01-12T09:00:00Z', note: 'Paused — focusing on PHQ-9 for now' },
  ],
};

// ---------------------------------------------------------------------------
// Seed: Questionnaire responses (mock completed check-ins)
// ---------------------------------------------------------------------------

function buildMockResponses(): QuestionnaireResponse[] {
  const responses: QuestionnaireResponse[] = [];

  // Sarah GAD-7 weekly responses (7 weeks)
  const sarahGad7Scores = [14, 12, 11, 10, 8, 7, 6];
  const sarahGad7Weeks = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26', '2026-02-02', '2026-02-09', '2026-02-16'];
  sarahGad7Weeks.forEach((week, i) => {
    const score = sarahGad7Scores[i];
    const sev = getSeverity(score, GAD7_THRESHOLDS);
    responses.push({
      id: `qr-1-gad7-${i}`, clientId: '1', assignmentId: 'qa-1-1', questionnaireId: 'q-gad7',
      questionnaireName: 'GAD-7', weekOf: week, completedAt: `${week}T09:00:00Z`,
      items: Array.from({ length: 7 }, (_, j) => ({ itemIndex: j, value: Math.round(score / 7) })),
      totalScore: score, maxScore: 21, severity: sev.label, severityColor: sev.color,
      flagged: false,
    });
  });

  // Sarah WSAS monthly responses (2)
  [{ week: '2026-01-05', score: 22 }, { week: '2026-02-05', score: 17 }].forEach((r, i) => {
    const thresholds = SEED_QUESTIONNAIRE_DEFS.find(d => d.id === 'q-wsas')!.thresholds;
    const sev = thresholds.find(t => r.score >= t.min && r.score <= t.max) ?? thresholds[thresholds.length - 1];
    responses.push({
      id: `qr-1-wsas-${i}`, clientId: '1', assignmentId: 'qa-1-2', questionnaireId: 'q-wsas',
      questionnaireName: 'WSAS', weekOf: r.week, completedAt: `${r.week}T10:00:00Z`,
      items: Array.from({ length: 5 }, (_, j) => ({ itemIndex: j, value: Math.round(r.score / 5) })),
      totalScore: r.score, maxScore: 40, severity: sev.label, severityColor: sev.color,
      flagged: false,
    });
  });

  // Jane PHQ-9 weekly responses (7 weeks, with item 9 flag)
  const janePhq9Scores = [18, 16, 14, 13, 11, 10, 9];
  const janeItem9Values = [1, 1, 1, 0, 0, 0, 0];
  const janeWeeks = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26', '2026-02-02', '2026-02-09', '2026-02-16'];
  janeWeeks.forEach((week, i) => {
    const score = janePhq9Scores[i];
    const sev = getSeverity(score, PHQ9_THRESHOLDS);
    const item9 = janeItem9Values[i];
    responses.push({
      id: `qr-3-phq9-${i}`, clientId: '3', assignmentId: 'qa-3-1', questionnaireId: 'q-phq9',
      questionnaireName: 'PHQ-9', weekOf: week, completedAt: `${week}T08:00:00Z`,
      items: Array.from({ length: 9 }, (_, j) => ({ itemIndex: j, value: j === 8 ? item9 : Math.round((score - item9) / 8) })),
      totalScore: score, maxScore: 27, severity: sev.label, severityColor: sev.color,
      flagged: item9 > 0, flagReason: item9 > 0 ? 'PHQ-9 item 9 (thoughts of self-harm) endorsed' : undefined,
    });
  });

  // Michael PCL-5 biweekly (4 responses)
  const michaelPcl5Scores = [52, 44, 38, 33];
  const michaelPclWeeks = ['2026-01-05', '2026-01-19', '2026-02-02', '2026-02-16'];
  const pclThresholds = SEED_QUESTIONNAIRE_DEFS.find(d => d.id === 'q-pcl5')!.thresholds;
  michaelPclWeeks.forEach((week, i) => {
    const score = michaelPcl5Scores[i];
    const sev = pclThresholds.find(t => score >= t.min && score <= t.max) ?? pclThresholds[pclThresholds.length - 1];
    responses.push({
      id: `qr-2-pcl5-${i}`, clientId: '2', assignmentId: 'qa-2-1', questionnaireId: 'q-pcl5',
      questionnaireName: 'PCL-5', weekOf: week, completedAt: `${week}T10:00:00Z`,
      items: Array.from({ length: 20 }, (_, j) => ({ itemIndex: j, value: Math.round(score / 20) })),
      totalScore: score, maxScore: 80, severity: sev.label, severityColor: sev.color,
      flagged: false,
    });
  });

  // Michael GAD-7 weekly (7 responses)
  const michaelGad7Scores = [16, 14, 13, 12, 10, 9, 8];
  sarahGad7Weeks.forEach((week, i) => {
    const score = michaelGad7Scores[i];
    const sev = getSeverity(score, GAD7_THRESHOLDS);
    responses.push({
      id: `qr-2-gad7-${i}`, clientId: '2', assignmentId: 'qa-2-2', questionnaireId: 'q-gad7',
      questionnaireName: 'GAD-7', weekOf: week, completedAt: `${week}T09:30:00Z`,
      items: Array.from({ length: 7 }, (_, j) => ({ itemIndex: j, value: Math.round(score / 7) })),
      totalScore: score, maxScore: 21, severity: sev.label, severityColor: sev.color,
      flagged: false,
    });
  });

  return responses;
}

// ---------------------------------------------------------------------------
// Seed: Activity log
// ---------------------------------------------------------------------------

const SEED_ACTIVITY: ActivityEvent[] = [
  // Client 1
  { id: 'evt-1-1', clientId: '1', type: 'HOMEWORK_ASSIGNED',    description: 'Assigned "Understanding Catastrophizing" module (due Jan 27)',          timestamp: '2026-01-20T10:01:00Z', actor: 'therapist' },
  { id: 'evt-1-2', clientId: '1', type: 'HOMEWORK_COMPLETED',   description: 'Client completed "Understanding Catastrophizing"',                       timestamp: '2026-01-23T09:15:00Z', actor: 'client' },
  { id: 'evt-1-3', clientId: '1', type: 'INTERVENTION_ASSIGNED', description: 'Assigned Box Breathing — daily before social situations',              timestamp: '2026-01-20T10:01:00Z', actor: 'therapist' },
  { id: 'evt-1-4', clientId: '1', type: 'SUMMARY_PUBLISHED',    description: 'Session summary (Jul 15) published to client portal',                   timestamp: '2025-07-15T18:00:00Z', actor: 'therapist' },
  { id: 'evt-1-5', clientId: '1', type: 'HOMEWORK_ASSIGNED',    description: 'Assigned "All-or-Nothing Thinking" module (due Feb 10)',                 timestamp: '2026-02-03T10:02:00Z', actor: 'therapist' },
  { id: 'evt-1-6', clientId: '1', type: 'INTERVENTION_ASSIGNED', description: 'Assigned Cognitive Reframe — as needed when catastrophic thoughts arise', timestamp: '2026-02-03T10:02:00Z', actor: 'therapist' },
  // Client 2
  { id: 'evt-2-1', clientId: '2', type: 'HOMEWORK_ASSIGNED',    description: 'Assigned "Understanding Trauma Responses" module (due Jan 22)',          timestamp: '2026-01-15T10:01:00Z', actor: 'therapist' },
  { id: 'evt-2-2', clientId: '2', type: 'HOMEWORK_COMPLETED',   description: 'Client completed "Understanding Trauma Responses"',                       timestamp: '2026-01-18T08:00:00Z', actor: 'client' },
  { id: 'evt-2-3', clientId: '2', type: 'INTERVENTION_ASSIGNED', description: 'Assigned 5-4-3-2-1 Grounding — twice daily',                           timestamp: '2026-01-15T10:01:00Z', actor: 'therapist' },
  { id: 'evt-2-4', clientId: '2', type: 'HOMEWORK_ASSIGNED',    description: 'Assigned "Window of Tolerance" module (due Feb 12)',                     timestamp: '2026-02-05T10:01:00Z', actor: 'therapist' },
  { id: 'evt-2-5', clientId: '2', type: 'INTERVENTION_ASSIGNED', description: 'Assigned Safe Place Visualization — daily',                            timestamp: '2026-02-01T10:01:00Z', actor: 'therapist' },
  // Client 3
  { id: 'evt-3-1', clientId: '3', type: 'HOMEWORK_ASSIGNED',    description: 'Assigned "Behavioral Activation for Depression" module (due Jan 17)',    timestamp: '2026-01-10T10:01:00Z', actor: 'therapist' },
  { id: 'evt-3-2', clientId: '3', type: 'HOMEWORK_COMPLETED',   description: 'Client completed "Behavioral Activation for Depression"',                timestamp: '2026-01-13T10:30:00Z', actor: 'client' },
  { id: 'evt-3-3', clientId: '3', type: 'INTERVENTION_ASSIGNED', description: 'Assigned Progressive Muscle Relaxation — daily before bed',            timestamp: '2026-01-10T10:01:00Z', actor: 'therapist' },
  { id: 'evt-3-4', clientId: '3', type: 'HOMEWORK_COMPLETED',   description: 'Client completed "The Motivation Myth"',                                 timestamp: '2026-01-22T09:00:00Z', actor: 'client' },
  { id: 'evt-3-5', clientId: '3', type: 'SUMMARY_PUBLISHED',    description: 'Session summary (Jul 18) published to client portal',                   timestamp: '2025-07-18T19:00:00Z', actor: 'therapist' },
  { id: 'evt-3-6', clientId: '3', type: 'HOMEWORK_ASSIGNED',    description: 'Assigned "Understanding Trauma Responses" module — connect to robbery incident', timestamp: '2026-02-01T10:01:00Z', actor: 'therapist' },
];

// ---------------------------------------------------------------------------
// Outcome helpers
// ---------------------------------------------------------------------------

const PHQ9_THRESHOLDS = [
  { label: 'Minimal',         min: 0,  max: 4,  color: 'success' as const },
  { label: 'Mild',            min: 5,  max: 9,  color: 'info' as const },
  { label: 'Moderate',        min: 10, max: 14, color: 'warning' as const },
  { label: 'Moderately High', min: 15, max: 19, color: 'error' as const },
  { label: 'High',            min: 20, max: 27, color: 'error' as const },
];
const GAD7_THRESHOLDS = [
  { label: 'Minimal',  min: 0,  max: 4,  color: 'success' as const },
  { label: 'Mild',     min: 5,  max: 9,  color: 'info' as const },
  { label: 'Moderate', min: 10, max: 14, color: 'warning' as const },
  { label: 'High',     min: 15, max: 21, color: 'error' as const },
];
const PANIC_THRESHOLDS = [
  { label: 'Minimal',  min: 0,  max: 2,  color: 'success' as const },
  { label: 'Mild',     min: 3,  max: 5,  color: 'info' as const },
  { label: 'Moderate', min: 6,  max: 9,  color: 'warning' as const },
  { label: 'High',     min: 10, max: 12, color: 'error' as const },
];

function getSeverity(score: number, thresholds: typeof PHQ9_THRESHOLDS) {
  return thresholds.find(t => score >= t.min && score <= t.max) ?? thresholds[thresholds.length - 1];
}

function buildOutcomeOverview(clientId: string): OutcomeOverview {
  const rows = SEED_OUTCOMES[clientId] ?? [];
  const trend: OutcomeTrendEntry[] = [];

  rows.forEach(row => {
    if (row.phq9 !== undefined) {
      const sev = getSeverity(row.phq9, PHQ9_THRESHOLDS);
      trend.push({ measureId: 'phq9', measureShortName: 'PHQ-9', weekOf: row.weekOf, score: row.phq9, maxScore: 27, severity: sev.label, severityColor: sev.color });
    }
    if (row.gad7 !== undefined) {
      const sev = getSeverity(row.gad7, GAD7_THRESHOLDS);
      trend.push({ measureId: 'gad7', measureShortName: 'GAD-7', weekOf: row.weekOf, score: row.gad7, maxScore: 21, severity: sev.label, severityColor: sev.color });
    }
    if (row.panic !== undefined) {
      const sev = getSeverity(row.panic, PANIC_THRESHOLDS);
      trend.push({ measureId: 'panic-severity', measureShortName: 'Panic', weekOf: row.weekOf, score: row.panic, maxScore: 12, severity: sev.label, severityColor: sev.color });
    }
  });

  const lastRow = rows[rows.length - 1];
  const lastCompletedWeek = lastRow?.weekOf ?? null;
  const nextDueWeek = '2026-02-23'; // next week from last seed

  const safetyFlag = rows.some(r => (r.phq9Item9 ?? 0) > 0);
  const safetyFlagReason = safetyFlag
    ? 'PHQ-9 item 9 (self-harm thoughts) was > 0 in one or more recent check-ins'
    : undefined;

  return { lastCompletedWeek, nextDueWeek, trend, safetyFlag, safetyFlagReason };
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function loadStorage(): BridgeStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BridgeStorage;
  } catch { /* ignore */ }

  // Initialize with seed data
  return {
    homework: { ...SEED_HOMEWORK },
    interventions: { ...SEED_INTERVENTIONS_ASSIGNED },
    publishDrafts: { ...SEED_PUBLISH_DRAFTS },
    activityLog: [...SEED_ACTIVITY],
    questionnaireAssignments: { ...SEED_Q_ASSIGNMENTS },
    questionnaireResponses: buildMockResponses(),
  };
}

function saveStorage(data: BridgeStorage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class TherapistClientBridgeMockProvider implements TherapistClientBridgeProvider {
  private store: BridgeStorage;

  constructor() {
    this.store = loadStorage();
  }

  private save() {
    saveStorage(this.store);
  }

  // --- Clients ---------------------------------------------------------------

  async listClients(): Promise<BridgeClient[]> {
    return [...SEED_CLIENTS];
  }

  // --- Overview --------------------------------------------------------------

  async getClientPortalOverview(clientId: string): Promise<ClientPortalOverview> {
    const client = SEED_CLIENTS.find(c => c.id === clientId);
    if (!client) throw new Error(`Client ${clientId} not found`);

    const homework = this.store.homework[clientId] ?? [];
    const interventions = this.store.interventions[clientId] ?? [];
    const publishDraft = this.store.publishDrafts[clientId] ?? null;
    const outcomeOverview = buildOutcomeOverview(clientId);
    const activityLog = (this.store.activityLog ?? [])
      .filter(e => e.clientId === clientId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return { client, homework, interventions, publishDraft, outcomeOverview, activityLog };
  }

  // --- Homework --------------------------------------------------------------

  async listClientHomework(clientId: string): Promise<TherapistHomeworkItem[]> {
    return this.store.homework[clientId] ?? [];
  }

  async upsertHomework(
    clientId: string,
    payload: Omit<TherapistHomeworkItem, 'id' | 'clientId' | 'assignedAt'>
  ): Promise<TherapistHomeworkItem> {
    const item: TherapistHomeworkItem = {
      id: `hw-${uid()}`,
      clientId,
      assignedAt: new Date().toISOString(),
      ...payload,
    };
    const list = this.store.homework[clientId] ?? [];
    this.store.homework[clientId] = [...list, item];
    this.save();

    await this.addActivityEvent({
      clientId,
      type: 'HOMEWORK_ASSIGNED',
      description: `Assigned "${item.moduleTitle}" module${item.dueAt ? ` (due ${new Date(item.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` : ''}`,
      timestamp: new Date().toISOString(),
      actor: 'therapist',
    });

    return item;
  }

  async updateHomeworkStatus(
    clientId: string,
    homeworkId: string,
    status: HomeworkBridgeStatus
  ): Promise<void> {
    const list = this.store.homework[clientId] ?? [];
    const idx = list.findIndex(h => h.id === homeworkId);
    if (idx === -1) return;

    const item = list[idx];
    const updated = { ...item, status };
    if (status === 'COMPLETED') updated.progress = { ...item.progress, completedAt: new Date().toISOString() };
    list[idx] = updated;
    this.store.homework[clientId] = list;
    this.save();

    const typeMap: Record<HomeworkBridgeStatus, ActivityEventType> = {
      ASSIGNED: 'HOMEWORK_ASSIGNED',
      IN_PROGRESS: 'HOMEWORK_ASSIGNED',
      COMPLETED: 'HOMEWORK_COMPLETED',
      ARCHIVED: 'HOMEWORK_ARCHIVED',
    };

    await this.addActivityEvent({
      clientId,
      type: typeMap[status],
      description: `"${item.moduleTitle}" marked as ${status.toLowerCase().replace('_', ' ')}`,
      timestamp: new Date().toISOString(),
      actor: 'therapist',
    });
  }

  // --- Interventions ---------------------------------------------------------

  async listClientInterventions(clientId: string): Promise<TherapistInterventionAssignment[]> {
    return this.store.interventions[clientId] ?? [];
  }

  async assignIntervention(
    clientId: string,
    payload: Omit<TherapistInterventionAssignment, 'id' | 'clientId' | 'assignedAt'>
  ): Promise<TherapistInterventionAssignment> {
    const item: TherapistInterventionAssignment = {
      id: `ia-${uid()}`,
      clientId,
      assignedAt: new Date().toISOString(),
      ...payload,
    };
    const list = this.store.interventions[clientId] ?? [];
    this.store.interventions[clientId] = [...list, item];
    this.save();

    const freqLabel = item.frequency ? ` — ${item.frequency.toLowerCase().replace('_', ' ')}` : '';
    await this.addActivityEvent({
      clientId,
      type: 'INTERVENTION_ASSIGNED',
      description: `Assigned ${item.interventionTitle}${freqLabel}`,
      timestamp: new Date().toISOString(),
      actor: 'therapist',
    });

    return item;
  }

  async archiveIntervention(clientId: string, assignmentId: string): Promise<void> {
    const list = this.store.interventions[clientId] ?? [];
    const idx = list.findIndex(i => i.id === assignmentId);
    if (idx === -1) return;

    const item = list[idx];
    list[idx] = { ...item, status: 'ARCHIVED' };
    this.store.interventions[clientId] = list;
    this.save();

    await this.addActivityEvent({
      clientId,
      type: 'INTERVENTION_ARCHIVED',
      description: `Archived ${item.interventionTitle}`,
      timestamp: new Date().toISOString(),
      actor: 'therapist',
    });
  }

  // --- Publish ---------------------------------------------------------------

  async getPublishDraft(clientId: string): Promise<PublishDraft | null> {
    return this.store.publishDrafts[clientId] ?? null;
  }

  async updatePublishDraft(
    clientId: string,
    draftId: string,
    patch: Partial<Pick<PublishDraft, 'sections'>>
  ): Promise<PublishDraft> {
    const existing = this.store.publishDrafts[clientId];
    if (!existing || existing.id !== draftId) throw new Error('Draft not found');
    const updated: PublishDraft = { ...existing, ...patch };
    this.store.publishDrafts[clientId] = updated;
    this.save();
    return updated;
  }

  async publishToClient(clientId: string, draftId: string): Promise<void> {
    const draft = this.store.publishDrafts[clientId];
    if (!draft || draft.id !== draftId) throw new Error('Draft not found');
    this.store.publishDrafts[clientId] = { ...draft, published: true, publishedAt: new Date().toISOString() };
    this.save();

    await this.addActivityEvent({
      clientId,
      type: 'SUMMARY_PUBLISHED',
      description: `Session summary published to client portal`,
      timestamp: new Date().toISOString(),
      actor: 'therapist',
    });
  }

  async unpublishFromClient(clientId: string, draftId: string): Promise<void> {
    const draft = this.store.publishDrafts[clientId];
    if (!draft || draft.id !== draftId) throw new Error('Draft not found');
    this.store.publishDrafts[clientId] = { ...draft, published: false, publishedAt: undefined };
    this.save();

    await this.addActivityEvent({
      clientId,
      type: 'SUMMARY_UNPUBLISHED',
      description: `Session summary unpublished from client portal`,
      timestamp: new Date().toISOString(),
      actor: 'therapist',
    });
  }

  // --- Activity log ----------------------------------------------------------

  async listActivityEvents(clientId: string): Promise<ActivityEvent[]> {
    return (this.store.activityLog ?? [])
      .filter(e => e.clientId === clientId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async addActivityEvent(event: Omit<ActivityEvent, 'id'>): Promise<ActivityEvent> {
    const full: ActivityEvent = { id: `evt-${uid()}`, ...event };
    this.store.activityLog = [...(this.store.activityLog ?? []), full];
    this.save();
    return full;
  }

  // --- Content library -------------------------------------------------------

  async listModulesForAssignment(): Promise<ModuleForAssignment[]> {
    return [...SEED_MODULES];
  }

  async listInterventionsForAssignment(): Promise<InterventionForAssignment[]> {
    return [...SEED_INTERVENTIONS];
  }

  // --- Questionnaires --------------------------------------------------------

  async listQuestionnaireDefinitions(): Promise<QuestionnaireDefinition[]> {
    return [...SEED_QUESTIONNAIRE_DEFS];
  }

  async listClientQuestionnaires(clientId: string): Promise<QuestionnaireAssignment[]> {
    return this.store.questionnaireAssignments[clientId] ?? [];
  }

  async assignQuestionnaire(
    clientId: string,
    payload: { questionnaireId: string; cadence: QuestionnaireCadence; note?: string }
  ): Promise<QuestionnaireAssignment> {
    const def = SEED_QUESTIONNAIRE_DEFS.find(d => d.id === payload.questionnaireId);
    if (!def) throw new Error(`Questionnaire ${payload.questionnaireId} not found`);

    const item: QuestionnaireAssignment = {
      id: `qa-${uid()}`,
      clientId,
      questionnaireId: payload.questionnaireId,
      questionnaireName: def.name,
      questionnaireShortName: def.shortName,
      cadence: payload.cadence,
      status: 'ACTIVE',
      assignedAt: new Date().toISOString(),
      note: payload.note,
      completionCount: 0,
    };
    const list = this.store.questionnaireAssignments[clientId] ?? [];
    this.store.questionnaireAssignments[clientId] = [...list, item];
    this.save();

    await this.addActivityEvent({
      clientId,
      type: 'QUESTIONNAIRE_ASSIGNED',
      description: `Assigned ${def.shortName} questionnaire (${payload.cadence.toLowerCase()})`,
      timestamp: new Date().toISOString(),
      actor: 'therapist',
    });

    return item;
  }

  async updateQuestionnaireStatus(
    clientId: string,
    assignmentId: string,
    status: QuestionnaireStatus
  ): Promise<void> {
    const list = this.store.questionnaireAssignments[clientId] ?? [];
    const idx = list.findIndex(q => q.id === assignmentId);
    if (idx === -1) return;

    const item = list[idx];
    const updated = { ...item, status };
    if (status === 'PAUSED') updated.pausedAt = new Date().toISOString();
    if (status === 'REMOVED') updated.removedAt = new Date().toISOString();
    list[idx] = updated;
    this.store.questionnaireAssignments[clientId] = list;
    this.save();

    const typeMap: Record<QuestionnaireStatus, 'QUESTIONNAIRE_ASSIGNED' | 'QUESTIONNAIRE_PAUSED' | 'QUESTIONNAIRE_REMOVED'> = {
      ACTIVE: 'QUESTIONNAIRE_ASSIGNED',
      PAUSED: 'QUESTIONNAIRE_PAUSED',
      REMOVED: 'QUESTIONNAIRE_REMOVED',
    };

    await this.addActivityEvent({
      clientId,
      type: typeMap[status],
      description: `${item.questionnaireShortName} questionnaire ${status.toLowerCase()}`,
      timestamp: new Date().toISOString(),
      actor: 'therapist',
    });
  }

  async listQuestionnaireResponses(
    clientId: string,
    assignmentId: string
  ): Promise<QuestionnaireResponse[]> {
    return (this.store.questionnaireResponses ?? [])
      .filter(r => r.clientId === clientId && r.assignmentId === assignmentId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }
}
