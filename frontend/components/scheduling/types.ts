// Scheduling types for Ther-Assist therapist scheduling system

// ── Enums / Unions ──────────────────────────────────────────────

export type AppointmentType =
  | 'initial_consultation'
  | 'intake_assessment'
  | 'follow_up'
  | 'check_in'
  | 'crisis_urgent'
  | 'review'
  | 'group';

export type AppointmentStatus =
  | 'requested'
  | 'pending_confirmation'
  | 'confirmed'
  | 'completed'
  | 'reschedule_requested'
  | 'canceled'
  | 'no_show';

export type Modality = 'in_person' | 'video' | 'phone';

export type ReminderState = 'not_sent' | 'sent' | 'confirmed' | 'failed';

export type RecurrencePattern = 'none' | 'weekly' | 'biweekly' | 'monthly';

// ── Core Appointment Model ──────────────────────────────────────

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  therapistId: string;
  therapistName: string;
  appointmentType: AppointmentType;
  modality: Modality;
  status: AppointmentStatus;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM (24h)
  endTime: string;    // HH:MM (24h)
  durationMinutes: number;
  timezone: string;
  locationOrJoinLink?: string;
  notes?: string;
  prepNotes?: string;
  cancellationReason?: string;
  homeworkReviewNeeded?: boolean;
  sendPostSessionResources?: boolean;
  preMeasureRequired?: boolean;
  recurrence: RecurrencePattern;
  reminderState: ReminderState;
  confirmationState: 'pending' | 'confirmed' | 'declined';
  createdAt: string;
  updatedAt: string;
}

// ── Appointment Type Metadata ───────────────────────────────────

export interface AppointmentTypeMeta {
  value: AppointmentType;
  label: string;
  shortLabel: string;
  color: string;
  defaultDuration: number;
  description: string;
}

export const APPOINTMENT_TYPES: AppointmentTypeMeta[] = [
  { value: 'initial_consultation', label: 'Initial Consultation',   shortLabel: 'Initial',     color: '#7c3aed', defaultDuration: 60, description: 'First meeting to establish therapeutic relationship and assess needs' },
  { value: 'intake_assessment',    label: 'Intake / Assessment',    shortLabel: 'Intake',      color: '#0891b2', defaultDuration: 90, description: 'Comprehensive clinical assessment and treatment planning' },
  { value: 'follow_up',           label: 'Follow-up Session',       shortLabel: 'Follow-up',   color: '#0b57d0', defaultDuration: 50, description: 'Standard ongoing therapy session' },
  { value: 'check_in',            label: 'Check-in',                shortLabel: 'Check-in',    color: '#059669', defaultDuration: 30, description: 'Brief progress check or between-session support' },
  { value: 'crisis_urgent',       label: 'Crisis / Urgent Support', shortLabel: 'Crisis',      color: '#dc2626', defaultDuration: 60, description: 'Immediate crisis intervention or urgent clinical need' },
  { value: 'review',              label: 'Review Session',          shortLabel: 'Review',      color: '#d97706', defaultDuration: 50, description: 'Treatment review, progress evaluation, or care plan update' },
  { value: 'group',               label: 'Group Session',           shortLabel: 'Group',       color: '#7c3aed', defaultDuration: 90, description: 'Group therapy or psychoeducation session' },
];

// ── Status Metadata ─────────────────────────────────────────────

export interface StatusMeta {
  value: AppointmentStatus;
  label: string;
  color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  bgColor: string;
  textColor: string;
}

export const APPOINTMENT_STATUSES: StatusMeta[] = [
  { value: 'requested',             label: 'Requested',              color: 'info',    bgColor: '#e0f2fe', textColor: '#0369a1' },
  { value: 'pending_confirmation',  label: 'Pending Confirmation',   color: 'warning', bgColor: '#fef3c7', textColor: '#92400e' },
  { value: 'confirmed',             label: 'Confirmed',              color: 'success', bgColor: '#dcfce7', textColor: '#166534' },
  { value: 'completed',             label: 'Completed',              color: 'default', bgColor: '#f3f4f6', textColor: '#374151' },
  { value: 'reschedule_requested',  label: 'Reschedule Requested',   color: 'warning', bgColor: '#fef3c7', textColor: '#92400e' },
  { value: 'canceled',              label: 'Canceled',               color: 'error',   bgColor: '#fee2e2', textColor: '#991b1b' },
  { value: 'no_show',               label: 'No Show',                color: 'error',   bgColor: '#fee2e2', textColor: '#991b1b' },
];

// ── Modality Metadata ───────────────────────────────────────────

export interface ModalityMeta {
  value: Modality;
  label: string;
  icon: string; // MUI icon name reference
}

export const MODALITIES: ModalityMeta[] = [
  { value: 'in_person', label: 'In Person', icon: 'LocationOn' },
  { value: 'video',     label: 'Video',     icon: 'Videocam' },
  { value: 'phone',     label: 'Phone',     icon: 'Phone' },
];

// ── Availability ────────────────────────────────────────────────

export interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ... 6=Sat
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  modality: Modality[];
  isRecurring: boolean;
  specificDate?: string; // YYYY-MM-DD for one-off overrides
  isBlocked?: boolean;   // true = unavailable block (vacation, etc.)
  label?: string;        // e.g. "Lunch break"
}

// ── Filter State ────────────────────────────────────────────────

export interface SchedulingFilters {
  search: string;
  status: AppointmentStatus | 'all';
  appointmentType: AppointmentType | 'all';
  modality: Modality | 'all';
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_FILTERS: SchedulingFilters = {
  search: '',
  status: 'all',
  appointmentType: 'all',
  modality: 'all',
  dateFrom: '',
  dateTo: '',
};

// ── Helper lookups ──────────────────────────────────────────────

export function getTypeMeta(type: AppointmentType): AppointmentTypeMeta {
  return APPOINTMENT_TYPES.find(t => t.value === type) || APPOINTMENT_TYPES[2]; // default: follow_up
}

export function getStatusMeta(status: AppointmentStatus): StatusMeta {
  return APPOINTMENT_STATUSES.find(s => s.value === status) || APPOINTMENT_STATUSES[0];
}

export function getModalityMeta(modality: Modality): ModalityMeta {
  return MODALITIES.find(m => m.value === modality) || MODALITIES[0];
}
