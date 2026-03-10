/**
 * Real Provider stub — Therapist ↔ Client Portal Bridge
 *
 * All methods throw NotImplementedError until backend is wired.
 * Set VITE_THERAPIST_CLIENT_PORTAL_BRIDGE_USE_MOCK=false to use this.
 */

import {
  TherapistClientBridgeProvider,
  BridgeClient,
  ClientPortalOverview,
  TherapistHomeworkItem,
  HomeworkBridgeStatus,
  TherapistInterventionAssignment,
  PublishDraft,
  ActivityEvent,
  ModuleForAssignment,
  InterventionForAssignment,
  QuestionnaireDefinition,
  QuestionnaireAssignment,
  QuestionnaireResponse,
  QuestionnaireCadence,
  QuestionnaireStatus,
} from '../types/therapistClientBridge';

class NotImplementedError extends Error {
  constructor(method: string) {
    super(`TherapistClientBridgeRealProvider.${method} is not yet implemented`);
    this.name = 'NotImplementedError';
  }
}

export class TherapistClientBridgeRealProvider implements TherapistClientBridgeProvider {
  async listClients(): Promise<BridgeClient[]> { throw new NotImplementedError('listClients'); }
  async getClientPortalOverview(_clientId: string): Promise<ClientPortalOverview> { throw new NotImplementedError('getClientPortalOverview'); }
  async listClientHomework(_clientId: string): Promise<TherapistHomeworkItem[]> { throw new NotImplementedError('listClientHomework'); }
  async upsertHomework(_clientId: string, _payload: Omit<TherapistHomeworkItem, 'id' | 'clientId' | 'assignedAt'>): Promise<TherapistHomeworkItem> { throw new NotImplementedError('upsertHomework'); }
  async updateHomeworkStatus(_clientId: string, _homeworkId: string, _status: HomeworkBridgeStatus): Promise<void> { throw new NotImplementedError('updateHomeworkStatus'); }
  async listClientInterventions(_clientId: string): Promise<TherapistInterventionAssignment[]> { throw new NotImplementedError('listClientInterventions'); }
  async assignIntervention(_clientId: string, _payload: Omit<TherapistInterventionAssignment, 'id' | 'clientId' | 'assignedAt'>): Promise<TherapistInterventionAssignment> { throw new NotImplementedError('assignIntervention'); }
  async archiveIntervention(_clientId: string, _assignmentId: string): Promise<void> { throw new NotImplementedError('archiveIntervention'); }
  async getPublishDraft(_clientId: string): Promise<PublishDraft | null> { throw new NotImplementedError('getPublishDraft'); }
  async updatePublishDraft(_clientId: string, _draftId: string, _patch: Partial<Pick<PublishDraft, 'sections'>>): Promise<PublishDraft> { throw new NotImplementedError('updatePublishDraft'); }
  async publishToClient(_clientId: string, _draftId: string): Promise<void> { throw new NotImplementedError('publishToClient'); }
  async unpublishFromClient(_clientId: string, _draftId: string): Promise<void> { throw new NotImplementedError('unpublishFromClient'); }
  async listActivityEvents(_clientId: string): Promise<ActivityEvent[]> { throw new NotImplementedError('listActivityEvents'); }
  async addActivityEvent(_event: Omit<ActivityEvent, 'id'>): Promise<ActivityEvent> { throw new NotImplementedError('addActivityEvent'); }
  async listModulesForAssignment(): Promise<ModuleForAssignment[]> { throw new NotImplementedError('listModulesForAssignment'); }
  async listInterventionsForAssignment(): Promise<InterventionForAssignment[]> { throw new NotImplementedError('listInterventionsForAssignment'); }
  async listQuestionnaireDefinitions(): Promise<QuestionnaireDefinition[]> { throw new NotImplementedError('listQuestionnaireDefinitions'); }
  async listClientQuestionnaires(_clientId: string): Promise<QuestionnaireAssignment[]> { throw new NotImplementedError('listClientQuestionnaires'); }
  async assignQuestionnaire(_clientId: string, _payload: { questionnaireId: string; cadence: QuestionnaireCadence; note?: string }): Promise<QuestionnaireAssignment> { throw new NotImplementedError('assignQuestionnaire'); }
  async updateQuestionnaireStatus(_clientId: string, _assignmentId: string, _status: QuestionnaireStatus): Promise<void> { throw new NotImplementedError('updateQuestionnaireStatus'); }
  async listQuestionnaireResponses(_clientId: string, _assignmentId: string): Promise<QuestionnaireResponse[]> { throw new NotImplementedError('listQuestionnaireResponses'); }
}
