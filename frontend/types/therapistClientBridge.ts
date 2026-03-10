/**
 * Therapist ↔ Client Portal Bridge Types
 *
 * Feature flag : THERAPIST_CLIENT_PORTAL_BRIDGE  (utils/featureFlags.ts)
 * Access        : Therapist app → Patient detail → "Client Portal" button
 * Mock          : TherapistClientBridgeMockProvider (localStorage, no backend needed)
 */

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export interface BridgeClient {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'paused';
  primaryConcern?: string;
  age?: number;
}

// ---------------------------------------------------------------------------
// Homework
// ---------------------------------------------------------------------------

export type HomeworkBridgeStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export interface TherapistHomeworkItem {
  id: string;
  clientId: string;
  moduleId: string;
  moduleTitle: string;
  moduleCategory: string;
  estimatedMinutes: number;
  assignedAt: string;  // ISO
  dueAt?: string;      // ISO
  status: HomeworkBridgeStatus;
  note?: string;
  progress?: { lastOpenedAt?: string; completedAt?: string };
}

// ---------------------------------------------------------------------------
// Interventions
// ---------------------------------------------------------------------------

export type InterventionFrequency = 'DAILY' | 'TWICE_DAILY' | 'AS_NEEDED' | 'WEEKLY';
export type InterventionBridgeStatus = 'ACTIVE' | 'ARCHIVED';

export interface TherapistInterventionAssignment {
  id: string;
  clientId: string;
  interventionId: string;
  interventionTitle: string;
  interventionType: string;
  assignedAt: string;
  frequency?: InterventionFrequency;
  dueAt?: string;
  status: InterventionBridgeStatus;
  note?: string;
  recentUsageCount?: number;  // last 7 days
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

export interface PublishSections {
  themes: boolean;
  keyMoments: boolean;
  homeworkList: boolean;
  riskLabel: boolean;
  nextSteps: boolean;
}

export interface PublishSummaryContent {
  themes: string[];
  keyMoments: string[];
  homeworkList: string[];
  riskLabel?: string;
  nextSteps: string[];
  clinicalNote: string;
}

export interface PublishDraft {
  id: string;
  clientId: string;
  sessionId?: string;
  sessionDate?: string;
  sections: PublishSections;
  published: boolean;
  publishedAt?: string;
  content: PublishSummaryContent;
}

// ---------------------------------------------------------------------------
// Outcomes (therapist view)
// ---------------------------------------------------------------------------

export interface OutcomeTrendEntry {
  measureId: string;
  measureShortName: string;
  weekOf: string;
  score: number;
  maxScore: number;
  severity: string;
  severityColor: 'success' | 'info' | 'warning' | 'error';
}

export interface OutcomeOverview {
  lastCompletedWeek: string | null;
  nextDueWeek: string;
  trend: OutcomeTrendEntry[];
  safetyFlag: boolean;
  safetyFlagReason?: string;
}

// ---------------------------------------------------------------------------
// Questionnaires
// ---------------------------------------------------------------------------

export type QuestionnaireCadence = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'SESSION';
export type QuestionnaireStatus = 'ACTIVE' | 'PAUSED' | 'REMOVED';

export interface QuestionnaireDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  itemCount: number;
  maxScore: number;
  estimatedMinutes: number;
  category: 'DEPRESSION' | 'ANXIETY' | 'TRAUMA' | 'GENERAL' | 'SUBSTANCE' | 'FUNCTIONAL';
  thresholds: { label: string; min: number; max: number; color: 'success' | 'info' | 'warning' | 'error' }[];
}

export interface QuestionnaireAssignment {
  id: string;
  clientId: string;
  questionnaireId: string;
  questionnaireName: string;
  questionnaireShortName: string;
  cadence: QuestionnaireCadence;
  status: QuestionnaireStatus;
  assignedAt: string;
  pausedAt?: string;
  removedAt?: string;
  note?: string;
  completionCount: number;
  lastCompletedAt?: string;
  nextDueAt?: string;
}

export interface QuestionnaireResponseItem {
  itemIndex: number;
  value: number;
  label?: string;
}

export interface QuestionnaireResponse {
  id: string;
  clientId: string;
  assignmentId: string;
  questionnaireId: string;
  questionnaireName: string;
  weekOf: string;
  completedAt: string;
  items: QuestionnaireResponseItem[];
  totalScore: number;
  maxScore: number;
  severity: string;
  severityColor: 'success' | 'info' | 'warning' | 'error';
  flagged: boolean;
  flagReason?: string;
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export type ActivityEventType =
  | 'HOMEWORK_ASSIGNED'
  | 'HOMEWORK_COMPLETED'
  | 'HOMEWORK_ARCHIVED'
  | 'HOMEWORK_RESCHEDULED'
  | 'INTERVENTION_ASSIGNED'
  | 'INTERVENTION_ARCHIVED'
  | 'SUMMARY_PUBLISHED'
  | 'SUMMARY_UNPUBLISHED'
  | 'MODULE_SENT'
  | 'QUESTIONNAIRE_ASSIGNED'
  | 'QUESTIONNAIRE_PAUSED'
  | 'QUESTIONNAIRE_REMOVED'
  | 'QUESTIONNAIRE_COMPLETED';

export interface ActivityEvent {
  id: string;
  clientId: string;
  type: ActivityEventType;
  description: string;
  timestamp: string;
  actor: 'therapist' | 'client';
}

// ---------------------------------------------------------------------------
// Content library (for assignment)
// ---------------------------------------------------------------------------

export interface ModuleForAssignment {
  id: string;
  title: string;
  category: string;
  estimatedMinutes: number;
  summary: string;
  tags: string[];
}

export interface InterventionForAssignment {
  id: string;
  title: string;
  type: string;
  durationSeconds?: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Aggregated overview
// ---------------------------------------------------------------------------

export interface ClientPortalOverview {
  client: BridgeClient;
  homework: TherapistHomeworkItem[];
  interventions: TherapistInterventionAssignment[];
  publishDraft: PublishDraft | null;
  outcomeOverview: OutcomeOverview;
  activityLog: ActivityEvent[];
}

// ---------------------------------------------------------------------------
// Provider contract
// ---------------------------------------------------------------------------

export interface TherapistClientBridgeProvider {
  listClients(): Promise<BridgeClient[]>;
  getClientPortalOverview(clientId: string): Promise<ClientPortalOverview>;

  listClientHomework(clientId: string): Promise<TherapistHomeworkItem[]>;
  upsertHomework(
    clientId: string,
    payload: Omit<TherapistHomeworkItem, 'id' | 'clientId' | 'assignedAt'>
  ): Promise<TherapistHomeworkItem>;
  updateHomeworkStatus(
    clientId: string,
    homeworkId: string,
    status: HomeworkBridgeStatus
  ): Promise<void>;

  listClientInterventions(clientId: string): Promise<TherapistInterventionAssignment[]>;
  assignIntervention(
    clientId: string,
    payload: Omit<TherapistInterventionAssignment, 'id' | 'clientId' | 'assignedAt'>
  ): Promise<TherapistInterventionAssignment>;
  archiveIntervention(clientId: string, assignmentId: string): Promise<void>;

  getPublishDraft(clientId: string): Promise<PublishDraft | null>;
  updatePublishDraft(
    clientId: string,
    draftId: string,
    patch: Partial<Pick<PublishDraft, 'sections'>>
  ): Promise<PublishDraft>;
  publishToClient(clientId: string, draftId: string): Promise<void>;
  unpublishFromClient(clientId: string, draftId: string): Promise<void>;

  listActivityEvents(clientId: string): Promise<ActivityEvent[]>;
  addActivityEvent(event: Omit<ActivityEvent, 'id'>): Promise<ActivityEvent>;

  listModulesForAssignment(): Promise<ModuleForAssignment[]>;
  listInterventionsForAssignment(): Promise<InterventionForAssignment[]>;

  listQuestionnaireDefinitions(): Promise<QuestionnaireDefinition[]>;
  listClientQuestionnaires(clientId: string): Promise<QuestionnaireAssignment[]>;
  assignQuestionnaire(
    clientId: string,
    payload: { questionnaireId: string; cadence: QuestionnaireCadence; note?: string }
  ): Promise<QuestionnaireAssignment>;
  updateQuestionnaireStatus(
    clientId: string,
    assignmentId: string,
    status: QuestionnaireStatus
  ): Promise<void>;
  listQuestionnaireResponses(
    clientId: string,
    assignmentId: string
  ): Promise<QuestionnaireResponse[]>;
}
