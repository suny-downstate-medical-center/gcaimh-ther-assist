import React, { createContext, useContext } from 'react';
import {
  HomeworkAssignment, HomeworkStatus, PsychoeducationModule, Intervention, InterventionSession,
  JournalEntry, ClientProgress, TherapySession, IntegrativeAnalysis,
  OutcomeMeasure, OutcomeResponse, OutcomeSchedule,
} from '../types/clientPortal';

// ── Provider interface ──────────────────────────────────────────

export interface ClientPortalProvider {
  listModules(): Promise<PsychoeducationModule[]>;
  listHomeworkAssignments(): Promise<HomeworkAssignment[]>;
  listInterventions(): Promise<Intervention[]>;
  updateHomeworkStatus(assignmentId: string, status: HomeworkStatus): Promise<void>;
  getClientProgress(): Promise<ClientProgress>;
  listJournalEntries(): Promise<JournalEntry[]>;
  upsertJournalEntry(entry: Partial<JournalEntry>): Promise<JournalEntry>;
  getIntegrativeAnalysis(): Promise<IntegrativeAnalysis>;
  listTherapySessions(): Promise<TherapySession[]>;
  listOutcomeMeasures(): Promise<OutcomeMeasure[]>;
  getOutcomeSchedule(): Promise<OutcomeSchedule>;
  listOutcomeResponses(measureId: string, limit?: number): Promise<OutcomeResponse[]>;
  submitOutcomeResponse(response: { measureId: string; weekOf: string; responses: number[]; score: number }): Promise<OutcomeResponse>;
  startInterventionSession(interventionId: string): Promise<InterventionSession>;
}

// ── Mock seed data ──────────────────────────────────────────────

const MOCK_MODULES: PsychoeducationModule[] = [
  { id: 'mod-catastrophizing', title: 'Understanding Catastrophizing', category: 'COGNITIVE', estimatedMinutes: 8, summary: 'Recognize and challenge catastrophic thinking that amplifies anxiety.', tags: ['anxiety', 'CBT', 'cognitive-distortion'] },
  { id: 'mod-black-white-thinking', title: 'All-or-Nothing Thinking', category: 'COGNITIVE', estimatedMinutes: 6, summary: 'Soften extreme black-and-white thinking patterns.', tags: ['perfectionism', 'CBT'] },
  { id: 'mod-anxiety-purpose', title: 'The Purpose of Anxiety', category: 'EMOTIONAL', estimatedMinutes: 8, summary: 'Reframe anxiety as useful signal rather than enemy.', tags: ['anxiety', 'psychoeducation'] },
  { id: 'mod-window-tolerance', title: 'Window of Tolerance', category: 'EMOTIONAL', estimatedMinutes: 10, summary: 'Understand your optimal zone for processing emotions and trauma.', tags: ['trauma', 'regulation'] },
  { id: 'mod-grounding-science', title: 'Why Grounding Works', category: 'GENERAL', estimatedMinutes: 6, summary: 'The neuroscience behind grounding and why it regulates distress.', tags: ['grounding', 'nervous-system'] },
];

const MOCK_HOMEWORK: HomeworkAssignment[] = [
  { id: 'hw-1-1', moduleId: 'mod-catastrophizing', moduleTitle: 'Understanding Catastrophizing', assignedAt: '2026-01-20T10:00:00Z', dueAt: '2026-01-27T00:00:00Z', status: 'COMPLETED', note: 'Focus on work-related scenarios.', progress: { lastOpenedAt: '2026-01-22T18:30:00Z', completedAt: '2026-01-23T09:15:00Z' } },
  { id: 'hw-1-2', moduleId: 'mod-black-white-thinking', moduleTitle: 'All-or-Nothing Thinking', assignedAt: '2026-02-03T10:00:00Z', dueAt: '2026-02-10T00:00:00Z', status: 'IN_PROGRESS', note: 'Look for perfectionist patterns before meetings.', progress: { lastOpenedAt: '2026-02-05T20:00:00Z', percentComplete: 60 } },
  { id: 'hw-1-3', moduleId: 'mod-anxiety-purpose', moduleTitle: 'The Purpose of Anxiety', assignedAt: '2026-02-10T10:00:00Z', dueAt: '2026-02-17T00:00:00Z', status: 'ASSIGNED', note: 'Read before next session.' },
];

const MOCK_INTERVENTIONS: Intervention[] = [
  { id: 'int-box-breathing', title: 'Box Breathing', type: 'BREATHWORK', description: 'Equal 4-count inhale, hold, exhale, hold. Calms the nervous system rapidly.', durationSeconds: 120, frequency: 'DAILY', recentUsageCount: 5 },
  { id: 'int-grounding', title: '5-4-3-2-1 Grounding', type: 'GROUNDING', description: 'Sensory anchoring exercise: 5 see, 4 hear, 3 feel, 2 smell, 1 taste.', durationSeconds: 60, frequency: 'AS_NEEDED', recentUsageCount: 3 },
  { id: 'int-cognitive-reframe', title: 'Cognitive Reframe', type: 'COGNITIVE', description: 'Guided thought record: identify distortion, weigh evidence, form balanced thought.', durationSeconds: 180, frequency: 'AS_NEEDED', recentUsageCount: 2 },
  { id: 'int-progressive-muscle', title: 'Progressive Muscle Relaxation', type: 'BODY_AWARENESS', description: 'Systematically tense and release muscle groups to reduce physical tension.', durationSeconds: 300, frequency: 'DAILY', recentUsageCount: 4 },
];

let mockJournalEntries: JournalEntry[] = [
  { id: 'j-1', date: '2026-02-08', moduleId: 'mod-catastrophizing', keyInsights: 'I noticed my worst-case-scenario thinking before the team meeting. The catastrophe never happened.', personalApplication: 'I will pause and ask "What is the most likely outcome?" instead of jumping to the worst.', discussionTopics: 'Want to explore why work meetings trigger this pattern specifically.', createdAt: '2026-02-08T19:00:00Z', updatedAt: '2026-02-08T19:00:00Z' },
  { id: 'j-2', date: '2026-02-05', interventionId: 'int-box-breathing', keyInsights: 'Box breathing before the presentation actually lowered my heart rate noticeably.', personalApplication: 'Adding a 2-minute breathing window to my pre-meeting routine.', discussionTopics: 'Can we practice this in session with a visualization?', createdAt: '2026-02-05T20:30:00Z', updatedAt: '2026-02-05T20:30:00Z' },
];

const MOCK_SESSIONS: TherapySession[] = [
  { id: 's-1', date: '2026-02-07', durationMinutes: 50, summary: 'Reviewed thought diary entries. Identified catastrophizing pattern around work meetings. Practiced cognitive restructuring with balanced thought exercise.', themes: ['cognitive restructuring', 'work anxiety', 'thought patterns'], keyMoments: ['Identified link between physical tension and anticipatory anxiety', 'Successfully reframed a catastrophic thought in session'], techniques: ['CBT thought record', 'Socratic questioning', 'Behavioral experiment planning'], homework: ['Continue thought diary', 'Read All-or-Nothing Thinking module'], insights: ['Client shows strong insight into cognitive patterns', 'Work context is primary anxiety trigger'], emotionalState: { start: 'Anxious, tense', end: 'Calmer, hopeful', shift: 'Positive' } },
  { id: 's-2', date: '2026-01-31', durationMinutes: 50, summary: 'First session using box breathing in real-world scenario. Client reported successful use before a social event. Explored avoidance patterns.', themes: ['breathing techniques', 'social anxiety', 'avoidance'], keyMoments: ['Reported using box breathing independently for the first time', 'Acknowledged avoidance of colleague lunch invitations'], techniques: ['Box breathing practice', 'Exposure hierarchy discussion'], homework: ['Daily box breathing practice', 'Accept one social invitation this week'], insights: ['Client building confidence with coping tools', 'Social situations need graduated exposure'], emotionalState: { start: 'Guarded', end: 'More open', shift: 'Positive' } },
  { id: 's-3', date: '2026-01-24', durationMinutes: 50, summary: 'Initial session focusing on understanding catastrophizing. Psychoeducation on cognitive distortions. Introduced thought diary.', themes: ['psychoeducation', 'cognitive distortions', 'anxiety'], keyMoments: ['Client recognized pattern of always expecting worst outcome', 'Engaged well with thought diary concept'], techniques: ['Psychoeducation', 'Thought diary introduction'], homework: ['Read Understanding Catastrophizing module', 'Start thought diary'], insights: ['Client motivated and insightful', 'Strong therapeutic alliance forming'], emotionalState: { start: 'Overwhelmed', end: 'Relieved, understood', shift: 'Positive' } },
];

const MOCK_ANALYSIS: IntegrativeAnalysis = {
  overallProgress: 'Sarah is showing meaningful progress in identifying and challenging cognitive distortions. Her engagement with homework and interventions is consistent, and she is beginning to generalize coping strategies from session to daily life.',
  strengthAreas: ['Strong insight into thought patterns', 'Consistent homework engagement', 'Willingness to try new coping strategies', 'Good therapeutic alliance'],
  growthAreas: ['Social situation avoidance', 'Generalizing skills to novel contexts', 'Self-compassion when strategies don\'t work perfectly'],
  patterns: ['Catastrophizing intensifies before work meetings', 'Physical tension precedes anxious thoughts', 'Avoidance of social situations maintains anxiety cycle'],
  therapeuticInsights: ['CBT thought records are an effective modality for this client', 'Breathing exercises provide rapid symptom relief', 'Graduated exposure will be important for social situations'],
  recommendations: ['Continue cognitive restructuring work', 'Begin graduated exposure hierarchy for social situations', 'Introduce self-compassion exercises', 'Consider group therapy to practice social skills'],
  sessionCount: 3,
  timeframeWeeks: 3,
};

const PHQ9_ITEMS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure',
  'Trouble concentrating on things',
  'Moving or speaking slowly, or being fidgety/restless',
  'Thoughts that you would be better off dead, or hurting yourself',
];

const GAD7_ITEMS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
];

const LIKERT_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

const MOCK_OUTCOME_MEASURES: OutcomeMeasure[] = [
  {
    id: 'phq9', name: 'Patient Health Questionnaire-9', shortName: 'PHQ-9',
    description: 'Screens for depression severity over the past 2 weeks.',
    category: 'DEPRESSION', scoring: 'sum', maxScore: 27, cadence: 'weekly',
    items: PHQ9_ITEMS.map((text, i) => ({ id: `phq9-${i}`, text, options: LIKERT_OPTIONS })),
    thresholds: [
      { label: 'Minimal', min: 0, max: 4, color: '#059669' },
      { label: 'Mild', min: 5, max: 9, color: '#0891b2' },
      { label: 'Moderate', min: 10, max: 14, color: '#d97706' },
      { label: 'Moderately Severe', min: 15, max: 19, color: '#dc2626' },
      { label: 'Severe', min: 20, max: 27, color: '#991b1b' },
    ],
  },
  {
    id: 'gad7', name: 'Generalized Anxiety Disorder-7', shortName: 'GAD-7',
    description: 'Measures generalized anxiety severity over the past 2 weeks.',
    category: 'ANXIETY', scoring: 'sum', maxScore: 21, cadence: 'weekly',
    items: GAD7_ITEMS.map((text, i) => ({ id: `gad7-${i}`, text, options: LIKERT_OPTIONS })),
    thresholds: [
      { label: 'Minimal', min: 0, max: 4, color: '#059669' },
      { label: 'Mild', min: 5, max: 9, color: '#0891b2' },
      { label: 'Moderate', min: 10, max: 14, color: '#d97706' },
      { label: 'Severe', min: 15, max: 21, color: '#dc2626' },
    ],
  },
];

function weekMondayOffset(weeksAgo: number): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) - weeksAgo * 7;
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

const MOCK_OUTCOME_RESPONSES: OutcomeResponse[] = [
  // GAD-7 scores trending down over 6 weeks (Sarah's anxiety improvement)
  { id: 'or-g1', measureId: 'gad7', weekOf: weekMondayOffset(6), responses: [2,2,2,2,2,1,1], score: 12, completedAt: '2026-01-26T10:00:00Z' },
  { id: 'or-g2', measureId: 'gad7', weekOf: weekMondayOffset(5), responses: [2,2,1,2,1,1,1], score: 10, completedAt: '2026-02-02T10:00:00Z' },
  { id: 'or-g3', measureId: 'gad7', weekOf: weekMondayOffset(4), responses: [1,2,1,1,1,1,1], score: 8, completedAt: '2026-02-09T10:00:00Z' },
  { id: 'or-g4', measureId: 'gad7', weekOf: weekMondayOffset(3), responses: [1,1,1,1,1,1,0], score: 6, completedAt: '2026-02-16T10:00:00Z' },
  { id: 'or-g5', measureId: 'gad7', weekOf: weekMondayOffset(2), responses: [1,1,1,1,0,1,0], score: 5, completedAt: '2026-02-23T10:00:00Z' },
  { id: 'or-g6', measureId: 'gad7', weekOf: weekMondayOffset(1), responses: [1,1,0,1,0,1,0], score: 4, completedAt: '2026-03-02T10:00:00Z' },
];

const MOCK_OUTCOME_SCHEDULE: OutcomeSchedule = {
  measures: [
    { measureId: 'gad7', cadence: 'weekly', nextDue: weekMondayOffset(0) },
    { measureId: 'phq9', cadence: 'biweekly', nextDue: weekMondayOffset(0) },
  ],
  reminderEnabled: true,
};

// ── Mock provider implementation ────────────────────────────────

function createMockProvider(): ClientPortalProvider {
  let journals = [...mockJournalEntries];
  let outcomeResponses = [...MOCK_OUTCOME_RESPONSES];

  return {
    async listModules() { return MOCK_MODULES; },
    async listHomeworkAssignments() { return MOCK_HOMEWORK; },
    async listInterventions() { return MOCK_INTERVENTIONS; },

    async updateHomeworkStatus(assignmentId: string, status: HomeworkStatus) {
      const hw = MOCK_HOMEWORK.find(h => h.id === assignmentId);
      if (hw) hw.status = status;
    },

    async getClientProgress(): Promise<ClientProgress> {
      return {
        completedModules: MOCK_HOMEWORK.filter(h => h.status === 'COMPLETED').length,
        totalAssigned: MOCK_HOMEWORK.length,
        streakDays: 5,
        totalInterventionMinutes: 42,
        journalEntryCount: journals.length,
        lastActiveAt: new Date().toISOString(),
      };
    },

    async listJournalEntries() { return journals.sort((a, b) => b.date.localeCompare(a.date)); },

    async upsertJournalEntry(entry: Partial<JournalEntry>): Promise<JournalEntry> {
      const now = new Date().toISOString();
      if (entry.id) {
        const idx = journals.findIndex(j => j.id === entry.id);
        if (idx >= 0) {
          journals[idx] = { ...journals[idx], ...entry, updatedAt: now };
          return journals[idx];
        }
      }
      const newEntry: JournalEntry = {
        id: `j-${Date.now()}`,
        date: entry.date || now.split('T')[0],
        keyInsights: entry.keyInsights || '',
        personalApplication: entry.personalApplication || '',
        discussionTopics: entry.discussionTopics || '',
        moduleId: entry.moduleId,
        interventionId: entry.interventionId,
        sessionId: entry.sessionId,
        createdAt: now,
        updatedAt: now,
      };
      journals = [newEntry, ...journals];
      return newEntry;
    },

    async getIntegrativeAnalysis() { return MOCK_ANALYSIS; },
    async listTherapySessions() { return MOCK_SESSIONS; },
    async listOutcomeMeasures() { return MOCK_OUTCOME_MEASURES; },
    async getOutcomeSchedule() { return MOCK_OUTCOME_SCHEDULE; },

    async listOutcomeResponses(measureId: string, limit?: number) {
      const filtered = outcomeResponses.filter(r => r.measureId === measureId).sort((a, b) => b.weekOf.localeCompare(a.weekOf));
      return limit ? filtered.slice(0, limit) : filtered;
    },

    async submitOutcomeResponse(resp) {
      const newResp: OutcomeResponse = {
        id: `or-${Date.now()}`,
        measureId: resp.measureId,
        weekOf: resp.weekOf,
        responses: resp.responses,
        score: resp.score,
        completedAt: new Date().toISOString(),
      };
      outcomeResponses = [newResp, ...outcomeResponses];
      return newResp;
    },

    async startInterventionSession(interventionId: string): Promise<InterventionSession> {
      const intervention = MOCK_INTERVENTIONS.find(i => i.id === interventionId);
      return {
        id: `is-${Date.now()}`,
        interventionId,
        startedAt: new Date().toISOString(),
        durationSeconds: intervention?.durationSeconds || 120,
      };
    },
  };
}

// ── React Context ───────────────────────────────────────────────

const ClientPortalContext = createContext<ClientPortalProvider | null>(null);

export function useClientPortal(): ClientPortalProvider {
  const ctx = useContext(ClientPortalContext);
  if (!ctx) throw new Error('useClientPortal must be used within ClientPortalProviderWrapper');
  return ctx;
}

export const ClientPortalProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const provider = React.useMemo(() => createMockProvider(), []);
  return (
    <ClientPortalContext.Provider value={provider}>
      {children}
    </ClientPortalContext.Provider>
  );
};
