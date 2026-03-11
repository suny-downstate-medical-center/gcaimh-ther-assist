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
  // A) Body, Emotion & Regulation
  { id: 'mod-stress-response', title: 'The Stress Response', category: 'A) Body, Emotion & Regulation', estimatedMinutes: 8, summary: 'How the fight-flight-freeze system works, and why your body reacts before your mind catches up.', tags: ['stress', 'nervous-system', 'regulation'] },
  { id: 'mod-emotion-functions', title: 'What Emotions Are For', category: 'A) Body, Emotion & Regulation', estimatedMinutes: 7, summary: 'Every emotion carries information. Learn the adaptive function of anger, sadness, fear, and guilt.', tags: ['emotions', 'psychoeducation', 'awareness'] },
  { id: 'mod-interoception-panic', title: 'Interoception & Panic', category: 'A) Body, Emotion & Regulation', estimatedMinutes: 9, summary: 'Why misreading body signals can trigger panic, and how interoceptive awareness helps.', tags: ['panic', 'body-awareness', 'anxiety'] },

  // B) Attention & Repetitive Thought
  { id: 'mod-attentional-bias', title: 'Attentional Bias', category: 'B) Attention & Repetitive Thought', estimatedMinutes: 7, summary: 'Your brain highlights threats automatically. Understand why and how to retrain the spotlight.', tags: ['attention', 'anxiety', 'CBT'] },
  { id: 'mod-rumination-worry', title: 'Rumination & Worry', category: 'B) Attention & Repetitive Thought', estimatedMinutes: 8, summary: 'The difference between productive problem-solving and the sticky loops of rumination and worry.', tags: ['rumination', 'worry', 'metacognition'] },
  { id: 'mod-cognitive-load', title: 'Cognitive Load & Decision Fatigue', category: 'B) Attention & Repetitive Thought', estimatedMinutes: 6, summary: 'Why your brain makes worse choices when overloaded, and strategies to protect mental bandwidth.', tags: ['executive-function', 'fatigue', 'self-management'] },

  // C) Thinking Patterns
  { id: 'mod-cognitive-distortions', title: 'Cognitive Distortions Overview', category: 'C) Thinking Patterns', estimatedMinutes: 10, summary: 'An introduction to the most common thinking traps that keep anxiety and low mood going.', tags: ['CBT', 'cognitive-distortion', 'psychoeducation'] },
  { id: 'mod-catastrophizing', title: 'Understanding Catastrophizing', category: 'C) Thinking Patterns', estimatedMinutes: 8, summary: 'Recognize and challenge catastrophic thinking that amplifies anxiety.', tags: ['anxiety', 'CBT', 'cognitive-distortion'] },
  { id: 'mod-black-white-thinking', title: 'All-or-Nothing Thinking', category: 'C) Thinking Patterns', estimatedMinutes: 6, summary: 'Soften extreme black-and-white thinking patterns into more balanced perspectives.', tags: ['perfectionism', 'CBT', 'cognitive-distortion'] },
  { id: 'mod-confirmation-bias', title: 'Confirmation Bias', category: 'C) Thinking Patterns', estimatedMinutes: 7, summary: 'How the mind seeks evidence that fits existing beliefs and ignores what contradicts them.', tags: ['bias', 'critical-thinking', 'CBT'] },
  { id: 'mod-cognitive-dissonance', title: 'Cognitive Dissonance', category: 'C) Thinking Patterns', estimatedMinutes: 8, summary: 'The uncomfortable tension when actions and beliefs clash, and why it drives change or avoidance.', tags: ['motivation', 'self-awareness', 'behavior-change'] },

  // D) Avoidance & Maintenance Loops
  { id: 'mod-avoidance', title: 'The Avoidance Trap', category: 'D) Avoidance & Maintenance Loops', estimatedMinutes: 8, summary: 'Short-term relief, long-term cost. How avoidance maintains anxiety and shrinks your world.', tags: ['avoidance', 'anxiety', 'exposure'] },
  { id: 'mod-reassurance-seeking', title: 'Reassurance Seeking', category: 'D) Avoidance & Maintenance Loops', estimatedMinutes: 7, summary: 'Why asking "Are you sure it will be okay?" feels good but feeds the anxiety cycle.', tags: ['OCD', 'anxiety', 'maintenance'] },

  // E) Learning, Habits & Behavior Change
  { id: 'mod-neuroplasticity', title: 'Neuroplasticity Basics', category: 'E) Learning, Habits & Behavior Change', estimatedMinutes: 8, summary: 'Your brain physically rewires with practice. The science behind why therapy homework matters.', tags: ['neuroscience', 'motivation', 'learning'] },
  { id: 'mod-reinforcement', title: 'Reinforcement & Punishment', category: 'E) Learning, Habits & Behavior Change', estimatedMinutes: 7, summary: 'The building blocks of behavioral learning: what strengthens habits and what weakens them.', tags: ['behaviorism', 'habits', 'learning'] },
  { id: 'mod-habit-loop', title: 'The Habit Loop', category: 'E) Learning, Habits & Behavior Change', estimatedMinutes: 8, summary: 'Cue, routine, reward: understanding the anatomy of habits so you can redesign them.', tags: ['habits', 'behavior-change', 'self-management'] },
  { id: 'mod-extinction', title: 'Extinction & Spontaneous Recovery', category: 'E) Learning, Habits & Behavior Change', estimatedMinutes: 9, summary: 'Why feared situations feel scary again after progress, and why that is completely normal.', tags: ['exposure', 'anxiety', 'learning'] },

  // F) Compulsion & Addiction Spectrum
  { id: 'mod-craving-dynamics', title: 'Craving Dynamics', category: 'F) Compulsion & Addiction Spectrum', estimatedMinutes: 8, summary: 'How cravings build, peak, and naturally pass if you ride the wave instead of acting on them.', tags: ['craving', 'urge-surfing', 'addiction'] },
  { id: 'mod-compulsive-loops', title: 'Compulsive Loops', category: 'F) Compulsion & Addiction Spectrum', estimatedMinutes: 9, summary: 'The brain mechanism behind "I know I should stop but I can\'t" and how to interrupt the loop.', tags: ['OCD', 'compulsion', 'impulse-control'] },

  // G) Self, Identity & Social Systems
  { id: 'mod-self-criticism', title: 'The Inner Critic', category: 'G) Self, Identity & Social Systems', estimatedMinutes: 9, summary: 'Where self-criticism comes from, why it feels protective, and how self-compassion works better.', tags: ['self-compassion', 'shame', 'self-esteem'] },
  { id: 'mod-narrative-identity', title: 'Narrative Identity', category: 'G) Self, Identity & Social Systems', estimatedMinutes: 10, summary: 'The stories you tell about yourself shape how you feel. Learn to edit the narrative mindfully.', tags: ['identity', 'narrative-therapy', 'meaning'] },
  { id: 'mod-attachment', title: 'Attachment Styles', category: 'G) Self, Identity & Social Systems', estimatedMinutes: 12, summary: 'How early relationships wire expectations about closeness, trust, and safety in adult bonds.', tags: ['attachment', 'relationships', 'developmental'] },

  // H) Foundations
  { id: 'mod-sleep', title: 'Sleep & Mental Health', category: 'H) Foundations', estimatedMinutes: 8, summary: 'Why sleep is the foundation of emotional regulation and practical sleep-hygiene strategies.', tags: ['sleep', 'hygiene', 'foundations'] },
  { id: 'mod-food', title: 'Nutrition & Mood', category: 'H) Foundations', estimatedMinutes: 7, summary: 'The gut-brain connection, blood-sugar effects on anxiety, and simple nutritional principles.', tags: ['nutrition', 'gut-brain', 'foundations'] },
  { id: 'mod-physical-activity', title: 'Movement as Medicine', category: 'H) Foundations', estimatedMinutes: 6, summary: 'How even brief movement changes brain chemistry and why exercise is an evidence-based intervention.', tags: ['exercise', 'dopamine', 'foundations'] },

  // I) Trauma-Informed
  { id: 'mod-trauma-memory', title: 'How Trauma Memories Work', category: 'I) Trauma-Informed', estimatedMinutes: 10, summary: 'Why traumatic memories feel like they are happening now, and how processing helps them become past-tense.', tags: ['trauma', 'memory', 'PTSD'] },
  { id: 'mod-dissociation', title: 'Understanding Dissociation', category: 'I) Trauma-Informed', estimatedMinutes: 11, summary: 'Dissociation as the brain\'s emergency brake. Recognizing the spectrum from zoning out to depersonalization.', tags: ['dissociation', 'trauma', 'grounding'] },
];

const MOCK_HOMEWORK: HomeworkAssignment[] = [
  { id: 'hw-1-1', moduleId: 'mod-catastrophizing', moduleTitle: 'Understanding Catastrophizing', assignedAt: '2026-01-20T10:00:00Z', dueAt: '2026-01-27T00:00:00Z', status: 'COMPLETED', note: 'Focus on work-related scenarios.', progress: { lastOpenedAt: '2026-01-22T18:30:00Z', completedAt: '2026-01-23T09:15:00Z' } },
  { id: 'hw-1-2', moduleId: 'mod-black-white-thinking', moduleTitle: 'All-or-Nothing Thinking', assignedAt: '2026-02-03T10:00:00Z', dueAt: '2026-02-10T00:00:00Z', status: 'IN_PROGRESS', note: 'Look for perfectionist patterns before meetings.', progress: { lastOpenedAt: '2026-02-05T20:00:00Z', percentComplete: 60 } },
  { id: 'hw-1-3', moduleId: 'mod-avoidance', moduleTitle: 'The Avoidance Trap', assignedAt: '2026-02-10T10:00:00Z', dueAt: '2026-02-17T00:00:00Z', status: 'ASSIGNED', note: 'Read before next session.' },
];

const MOCK_INTERVENTIONS: Intervention[] = [
  { id: 'int-box-breathing', title: 'Box Breathing', type: 'BREATHWORK', description: 'Equal 4-count inhale, hold, exhale, hold. Calms the nervous system rapidly.', durationSeconds: 120, frequency: 'DAILY', recentUsageCount: 5 },
  { id: 'int-grounding', title: '5-4-3-2-1 Grounding', type: 'GROUNDING', description: 'Sensory anchoring exercise: 5 see, 4 hear, 3 feel, 2 smell, 1 taste.', durationSeconds: 60, frequency: 'AS_NEEDED', recentUsageCount: 3 },
  { id: 'int-cognitive-reframe', title: 'Cognitive Reframe', type: 'COGNITIVE', description: 'Guided thought record: identify distortion, weigh evidence, form balanced thought.', durationSeconds: 180, frequency: 'AS_NEEDED', recentUsageCount: 2 },
  { id: 'int-progressive-muscle', title: 'Progressive Muscle Relaxation', type: 'BODY_AWARENESS', description: 'Systematically tense and release muscle groups to reduce physical tension.', durationSeconds: 300, frequency: 'DAILY', recentUsageCount: 4 },
];

let mockJournalEntries: JournalEntry[] = [
  {
    id: 'j-1', date: '2026-03-10', moduleId: 'mod-self-criticism',
    keyInsights: 'The inner critic module was eye-opening. I realize my self-talk after mistakes is almost word-for-word what I heard growing up. Seeing it written out made it feel less like truth and more like a recording on repeat. The distinction between self-criticism and self-correction was especially powerful.',
    personalApplication: 'I am going to try the "compassionate friend" exercise when I catch the critic voice after work meetings. Instead of "you sounded stupid," I will ask what I would say to a friend who just gave that presentation.',
    discussionTopics: 'Want to explore where the critic voice originated and whether it served a protective function.',
    createdAt: '2026-03-10T20:15:00Z', updatedAt: '2026-03-10T20:15:00Z',
  },
  {
    id: 'j-2', date: '2026-03-08', interventionId: 'int-progressive-muscle',
    keyInsights: 'Progressive muscle relaxation before bed made a noticeable difference in how quickly I fell asleep. I was surprised how much tension I was holding in my jaw and shoulders without realizing it. The contrast between tension and release helped me recognize my baseline tightness.',
    personalApplication: 'Adding a 5-minute PMR to my wind-down routine. I also tried a quick jaw-release at my desk during a stressful afternoon and it helped.',
    discussionTopics: 'Is there a shorter version I can do during work hours without lying down?',
    createdAt: '2026-03-08T22:30:00Z', updatedAt: '2026-03-08T22:30:00Z',
  },
  {
    id: 'j-3', date: '2026-03-06', moduleId: 'mod-habit-loop',
    keyInsights: 'The habit loop framework (cue-routine-reward) helped me see that my phone-scrolling habit after getting into bed is cued by anxiety, not boredom. The "reward" is actually numbing, not relaxation. I also learned that you cannot just delete a habit; you have to replace the routine while keeping the cue and reward.',
    personalApplication: 'I am replacing the phone-scroll routine with a 3-minute breathing exercise when I notice the anxiety cue at bedtime. Same cue, healthier routine, genuine calm as reward.',
    discussionTopics: 'Could we map out the habit loops for my other avoidance behaviors?',
    createdAt: '2026-03-06T21:00:00Z', updatedAt: '2026-03-06T21:00:00Z',
  },
  {
    id: 'j-4', date: '2026-03-04', interventionId: 'int-cognitive-reframe',
    keyInsights: 'Used the cognitive reframe tool after a difficult email from my manager. My automatic thought was "She thinks I am incompetent." The evidence for was weak (tone was neutral), and the evidence against was strong (she praised my last project). The balanced thought I arrived at was "She is giving feedback, not making a character judgment."',
    personalApplication: 'I will use the thought record any time I notice a strong emotional reaction to written communication, since I tend to read negative intent into neutral text.',
    discussionTopics: 'I would like to practice reframing with more ambiguous scenarios in session.',
    createdAt: '2026-03-04T18:45:00Z', updatedAt: '2026-03-04T18:45:00Z',
  },
  {
    id: 'j-5', date: '2026-03-02', moduleId: 'mod-sleep',
    keyInsights: 'I did not realize how much my inconsistent sleep schedule was affecting my anxiety. The module explained that irregular sleep fragments the REM cycles needed for emotional processing. The 90-minute sleep-cycle concept was new to me and explains why I sometimes feel worse after sleeping longer.',
    personalApplication: 'Setting a consistent wake time of 6:30 AM even on weekends. Moving my phone charger to the living room so it is not in the bedroom.',
    discussionTopics: 'My sleep anxiety (worrying about not sleeping) is making things worse. Can we address that cycle?',
    createdAt: '2026-03-02T19:30:00Z', updatedAt: '2026-03-02T19:30:00Z',
  },
  {
    id: 'j-6', date: '2026-02-28', interventionId: 'int-grounding',
    keyInsights: 'Had a panic-like moment at the grocery store and used the 5-4-3-2-1 grounding technique for the first time in public. It worked faster than I expected. Naming 5 things I could see immediately pulled my attention out of the spiral. By the time I got to "1 thing I can taste," my heart rate had dropped significantly.',
    personalApplication: 'Keeping a small grounding prompt card in my wallet for moments when my mind goes blank from anxiety.',
    discussionTopics: 'Can we explore what specifically about the grocery store triggered this?',
    createdAt: '2026-02-28T16:00:00Z', updatedAt: '2026-02-28T16:00:00Z',
  },
  {
    id: 'j-7', date: '2026-02-25', moduleId: 'mod-avoidance',
    keyInsights: 'The avoidance trap module hit home. I can see clearly now that every time I avoid a social situation, the relief lasts about 10 minutes and then the dread of the next one gets worse. The graph showing the "avoidance cycle" was exactly my experience. Short-term relief is long-term maintenance of the problem.',
    personalApplication: 'Committed to saying yes to at least one social invitation per week, even if I only stay 30 minutes. Starting with the team lunch on Friday.',
    discussionTopics: 'I need help building an exposure hierarchy for social situations, starting with the least anxiety-provoking.',
    createdAt: '2026-02-25T20:00:00Z', updatedAt: '2026-02-25T20:00:00Z',
  },
  {
    id: 'j-8', date: '2026-02-22', moduleId: 'mod-catastrophizing',
    keyInsights: 'Re-read the catastrophizing module after a rough day. The probability estimation exercise was helpful: I rated "getting fired for this mistake" at 90% initially, then revised to 5% after examining the evidence. The gap between my emotional estimate and the rational one was shocking and motivating.',
    personalApplication: 'Created a small card with the questions: "What is the probability? What is the worst that realistically happens? Can I cope with that?" Keeping it on my desk.',
    discussionTopics: 'Want to explore why work mistakes feel so catastrophic compared to other areas of life.',
    createdAt: '2026-02-22T19:00:00Z', updatedAt: '2026-02-22T19:00:00Z',
  },
  {
    id: 'j-9', date: '2026-02-19', interventionId: 'int-box-breathing',
    keyInsights: 'Used box breathing before a presentation for the second time. This time I noticed my hands were less shaky and I was able to start speaking without the usual voice tremor. The 4-count structure gives my mind something to focus on instead of the anxious thoughts. It is becoming more automatic now.',
    personalApplication: 'Integrating a 2-minute box breathing session into my pre-meeting routine permanently. Also tried it during a difficult phone call and it helped me stay calm.',
    discussionTopics: 'Can we combine the breathing with a brief visualization for higher-stakes presentations?',
    createdAt: '2026-02-19T17:30:00Z', updatedAt: '2026-02-19T17:30:00Z',
  },
  {
    id: 'j-10', date: '2026-02-16', moduleId: 'mod-rumination-worry',
    keyInsights: 'The distinction between rumination (past-focused) and worry (future-focused) was clarifying. I realize I do both but at different times: rumination at night about the day\'s events, worry in the morning about what is ahead. Neither is productive problem-solving. The "worry window" concept was interesting.',
    personalApplication: 'Going to try the designated worry window: 15 minutes at 5 PM where I write down worries, then close the notebook. Outside that window, I will redirect with "I will think about that at 5."',
    discussionTopics: 'The module mentioned metacognitive therapy for worry. Is that something we could integrate?',
    createdAt: '2026-02-16T21:00:00Z', updatedAt: '2026-02-16T21:00:00Z',
  },
  {
    id: 'j-11', date: '2026-02-13', moduleId: 'mod-black-white-thinking',
    keyInsights: 'Caught myself in classic all-or-nothing thinking: "If I can not do this perfectly, there is no point trying." The module helped me see how this pattern leads directly to procrastination. Replacing "perfect or nothing" with "good enough and done" feels uncomfortable but freeing.',
    personalApplication: 'Using the 80% rule: if something is 80% good, I submit/send/share it. Perfectionism is not excellence; it is anxiety wearing a productive mask.',
    discussionTopics: 'My perfectionism seems connected to fear of judgment. Can we explore that link?',
    createdAt: '2026-02-13T19:15:00Z', updatedAt: '2026-02-13T19:15:00Z',
  },
  {
    id: 'j-12', date: '2026-02-11', moduleId: 'mod-stress-response',
    keyInsights: 'Understanding that my racing heart and shallow breathing are the sympathetic nervous system doing its job (not a sign that something is wrong) was genuinely reassuring. The module explained that the body cannot distinguish between a real threat and an imagined one, which is why anticipatory anxiety feels so physical.',
    personalApplication: 'When I notice physical anxiety symptoms, I will remind myself: "This is my nervous system trying to protect me. I am safe right now." Pairing this with a few deep breaths to activate the parasympathetic response.',
    discussionTopics: 'I am curious about vagal tone and whether there are exercises to strengthen the parasympathetic branch.',
    createdAt: '2026-02-11T18:00:00Z', updatedAt: '2026-02-11T18:00:00Z',
  },
  {
    id: 'j-13', date: '2026-02-10', interventionId: 'int-box-breathing',
    keyInsights: 'First time trying box breathing. It felt awkward and I kept losing count, but by the third round something shifted. My shoulders dropped and I realized I had been holding my breath shallowly all day. The simplicity of the technique is its strength.',
    personalApplication: 'Going to practice twice a day (morning and before bed) to build the habit before I need it in a stressful moment.',
    discussionTopics: 'I noticed I feel slightly dizzy during the hold phase. Is that normal at first?',
    createdAt: '2026-02-10T20:30:00Z', updatedAt: '2026-02-10T20:30:00Z',
  },
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
  // GAD-7 scores trending down over 10 weeks
  { id: 'or-g1', measureId: 'gad7', weekOf: weekMondayOffset(10), responses: [3,3,2,3,2,2,2], score: 17, completedAt: weekMondayOffset(10) + 'T10:00:00Z' },
  { id: 'or-g2', measureId: 'gad7', weekOf: weekMondayOffset(9), responses: [3,2,2,2,2,2,2], score: 15, completedAt: weekMondayOffset(9) + 'T10:00:00Z' },
  { id: 'or-g3', measureId: 'gad7', weekOf: weekMondayOffset(8), responses: [2,2,2,2,2,1,2], score: 13, completedAt: weekMondayOffset(8) + 'T10:00:00Z' },
  { id: 'or-g4', measureId: 'gad7', weekOf: weekMondayOffset(7), responses: [2,2,2,2,1,1,1], score: 11, completedAt: weekMondayOffset(7) + 'T10:00:00Z' },
  { id: 'or-g5', measureId: 'gad7', weekOf: weekMondayOffset(6), responses: [2,2,1,2,1,1,1], score: 10, completedAt: weekMondayOffset(6) + 'T10:00:00Z' },
  { id: 'or-g6', measureId: 'gad7', weekOf: weekMondayOffset(5), responses: [1,2,1,1,1,1,1], score: 8, completedAt: weekMondayOffset(5) + 'T10:00:00Z' },
  { id: 'or-g7', measureId: 'gad7', weekOf: weekMondayOffset(4), responses: [1,1,1,1,1,1,0], score: 6, completedAt: weekMondayOffset(4) + 'T10:00:00Z' },
  { id: 'or-g8', measureId: 'gad7', weekOf: weekMondayOffset(3), responses: [1,1,1,1,0,1,0], score: 5, completedAt: weekMondayOffset(3) + 'T10:00:00Z' },
  { id: 'or-g9', measureId: 'gad7', weekOf: weekMondayOffset(2), responses: [1,1,0,1,0,1,0], score: 4, completedAt: weekMondayOffset(2) + 'T10:00:00Z' },
  { id: 'or-g10', measureId: 'gad7', weekOf: weekMondayOffset(1), responses: [1,1,0,1,0,0,0], score: 3, completedAt: weekMondayOffset(1) + 'T10:00:00Z' },

  // PHQ-9 scores (biweekly, 5 responses)
  { id: 'or-p1', measureId: 'phq9', weekOf: weekMondayOffset(10), responses: [2,2,2,2,1,2,1,1,0], score: 13, completedAt: weekMondayOffset(10) + 'T10:00:00Z' },
  { id: 'or-p2', measureId: 'phq9', weekOf: weekMondayOffset(8), responses: [2,1,2,2,1,1,1,1,0], score: 11, completedAt: weekMondayOffset(8) + 'T10:00:00Z' },
  { id: 'or-p3', measureId: 'phq9', weekOf: weekMondayOffset(6), responses: [1,1,1,2,1,1,1,0,0], score: 8, completedAt: weekMondayOffset(6) + 'T10:00:00Z' },
  { id: 'or-p4', measureId: 'phq9', weekOf: weekMondayOffset(4), responses: [1,1,1,1,1,1,0,0,0], score: 6, completedAt: weekMondayOffset(4) + 'T10:00:00Z' },
  { id: 'or-p5', measureId: 'phq9', weekOf: weekMondayOffset(2), responses: [1,0,1,1,0,1,0,0,0], score: 4, completedAt: weekMondayOffset(2) + 'T10:00:00Z' },
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
