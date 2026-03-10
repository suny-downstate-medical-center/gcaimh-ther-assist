import { Appointment, TimeSlot } from './types';
import { formatDateISO, addMinutesToTime } from './schedulingUtils';
import { Patient } from '../../types/types';

// ── Default therapist ───────────────────────────────────────────

const THERAPIST_ID = 'ther-1';
const THERAPIST_NAME = 'Dr. Amara Osei';
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// ── Date helpers ────────────────────────────────────────────────

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return formatDateISO(d);
}

function dayOfWeekOffset(targetDay: number, weekOffset = 0): string {
  const d = new Date();
  const current = d.getDay();
  const diff = targetDay - current + weekOffset * 7;
  d.setDate(d.getDate() + diff);
  return formatDateISO(d);
}

function makeAppt(
  partial: Partial<Appointment> & Pick<Appointment, 'id' | 'patientId' | 'patientName' | 'date' | 'startTime' | 'durationMinutes' | 'appointmentType' | 'status'>,
): Appointment {
  return {
    therapistId: THERAPIST_ID,
    therapistName: THERAPIST_NAME,
    modality: 'in_person',
    endTime: addMinutesToTime(partial.startTime, partial.durationMinutes),
    timezone: TIMEZONE,
    recurrence: 'none',
    reminderState: 'not_sent',
    confirmationState: 'pending',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

// ── Generate seed appointments ──────────────────────────────────

export function generateMockAppointments(patients: Patient[]): Appointment[] {
  const today = formatDateISO(new Date());
  const p = (id: string) => patients.find(pt => pt.id === id);

  return [
    // ─ Today ─────────────────────────────────────
    makeAppt({
      id: 'appt-t1',
      patientId: '1', patientName: p('1')?.name || 'Sarah Johnson',
      date: today, startTime: '09:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'confirmed', modality: 'in_person',
      reminderState: 'confirmed', confirmationState: 'confirmed',
      notes: 'Continue cognitive restructuring for catastrophic thinking. Review thought diary.',
      homeworkReviewNeeded: true,
      recurrence: 'weekly',
    }),
    makeAppt({
      id: 'appt-t2',
      patientId: '2', patientName: p('2')?.name || 'Michael Chen',
      date: today, startTime: '10:30', durationMinutes: 60,
      appointmentType: 'follow_up', status: 'confirmed', modality: 'video',
      reminderState: 'confirmed', confirmationState: 'confirmed',
      locationOrJoinLink: 'https://meet.therassist.app/session/mc-2026',
      notes: 'EMDR processing session — next target memory identified. Have safe place visualization ready.',
      prepNotes: 'Review PCL-5 scores from last week. Check nightmare log.',
      preMeasureRequired: true,
      recurrence: 'biweekly',
    }),
    makeAppt({
      id: 'appt-t3',
      patientId: '3', patientName: p('3')?.name || 'Jane Doe',
      date: today, startTime: '14:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'pending_confirmation', modality: 'in_person',
      reminderState: 'sent', confirmationState: 'pending',
      notes: 'Begin exposure hierarchy construction. Safety plan review.',
      homeworkReviewNeeded: true,
      preMeasureRequired: true,
    }),

    // ─ Tomorrow ──────────────────────────────────
    makeAppt({
      id: 'appt-tm1',
      patientId: '5', patientName: p('5')?.name || 'Jessica Wong',
      date: daysFromNow(1), startTime: '11:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'confirmed', modality: 'in_person',
      reminderState: 'sent', confirmationState: 'confirmed',
      notes: 'Continue panic disorder work. Practice interoceptive exposure.',
      recurrence: 'weekly',
    }),
    makeAppt({
      id: 'appt-tm2',
      patientId: '6', patientName: p('6')?.name || 'Robert Martinez',
      date: daysFromNow(1), startTime: '14:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'confirmed', modality: 'in_person',
      reminderState: 'sent', confirmationState: 'confirmed',
      notes: 'ERP session — reduce checking to single check before leaving. Review exposure log.',
      homeworkReviewNeeded: true,
    }),

    // ─ This week (upcoming) ──────────────────────
    makeAppt({
      id: 'appt-w1',
      patientId: '1', patientName: p('1')?.name || 'Sarah Johnson',
      date: daysFromNow(3), startTime: '09:00', durationMinutes: 30,
      appointmentType: 'check_in', status: 'confirmed', modality: 'phone',
      notes: 'Brief check-in on work presentation anxiety. Midweek support.',
    }),
    makeAppt({
      id: 'appt-w2',
      patientId: '3', patientName: p('3')?.name || 'Jane Doe',
      date: daysFromNow(4), startTime: '10:00', durationMinutes: 50,
      appointmentType: 'review', status: 'requested', modality: 'in_person',
      notes: 'Treatment review — assess progress on behavioral activation goals.',
      preMeasureRequired: true,
    }),

    // ─ Next week ─────────────────────────────────
    makeAppt({
      id: 'appt-nw1',
      patientId: '2', patientName: p('2')?.name || 'Michael Chen',
      date: daysFromNow(8), startTime: '10:30', durationMinutes: 60,
      appointmentType: 'follow_up', status: 'confirmed', modality: 'video',
      locationOrJoinLink: 'https://meet.therassist.app/session/mc-2026',
      notes: 'Continue EMDR — assess readiness for next memory target.',
      recurrence: 'biweekly',
    }),
    makeAppt({
      id: 'appt-nw2',
      patientId: '5', patientName: p('5')?.name || 'Jessica Wong',
      date: daysFromNow(8), startTime: '11:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'pending_confirmation', modality: 'in_person',
      reminderState: 'not_sent',
      recurrence: 'weekly',
    }),
    makeAppt({
      id: 'appt-nw3',
      patientId: '4', patientName: p('4')?.name || 'David Thompson',
      date: daysFromNow(10), startTime: '13:00', durationMinutes: 50,
      appointmentType: 'initial_consultation', status: 'requested', modality: 'in_person',
      notes: 'Returning from therapy pause. Re-assessment of social phobia treatment plan.',
    }),
    makeAppt({
      id: 'appt-nw4',
      patientId: '6', patientName: p('6')?.name || 'Robert Martinez',
      date: daysFromNow(8), startTime: '14:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'confirmed', modality: 'in_person',
      notes: 'Continue ERP hierarchy. Target: leaving home with single lock check.',
    }),

    // ─ Reschedule request ────────────────────────
    makeAppt({
      id: 'appt-rs1',
      patientId: '1', patientName: p('1')?.name || 'Sarah Johnson',
      date: daysFromNow(5), startTime: '09:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'reschedule_requested', modality: 'in_person',
      notes: 'Patient requested reschedule due to work conflict.',
    }),

    // ─ Past: completed ───────────────────────────
    makeAppt({
      id: 'appt-p1',
      patientId: '1', patientName: p('1')?.name || 'Sarah Johnson',
      date: daysFromNow(-7), startTime: '09:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'completed', modality: 'in_person',
      reminderState: 'confirmed', confirmationState: 'confirmed',
      notes: 'Reviewed thought diary. Cognitive restructuring for meeting anxiety.',
      sendPostSessionResources: true,
    }),
    makeAppt({
      id: 'appt-p2',
      patientId: '2', patientName: p('2')?.name || 'Michael Chen',
      date: daysFromNow(-5), startTime: '10:30', durationMinutes: 60,
      appointmentType: 'follow_up', status: 'completed', modality: 'video',
      notes: 'EMDR — completed desensitization of targeted memory. Decreased SUD from 7 to 2.',
    }),
    makeAppt({
      id: 'appt-p3',
      patientId: '3', patientName: p('3')?.name || 'Jane Doe',
      date: daysFromNow(-3), startTime: '14:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'completed', modality: 'in_person',
      notes: 'Behavioral activation review. Activity schedule adherence improved to 80%.',
    }),
    makeAppt({
      id: 'appt-p4',
      patientId: '5', patientName: p('5')?.name || 'Jessica Wong',
      date: daysFromNow(-2), startTime: '11:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'completed', modality: 'in_person',
      notes: 'Panic frequency reduced to 1/week. Interoceptive exposure tolerance improving.',
    }),

    // ─ Past: no-show + canceled ──────────────────
    makeAppt({
      id: 'appt-ns1',
      patientId: '4', patientName: p('4')?.name || 'David Thompson',
      date: daysFromNow(-14), startTime: '15:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'no_show', modality: 'in_person',
      notes: 'No show — attempted phone follow-up, patient cited work conflict.',
    }),
    makeAppt({
      id: 'appt-cx1',
      patientId: '6', patientName: p('6')?.name || 'Robert Martinez',
      date: daysFromNow(-10), startTime: '14:00', durationMinutes: 50,
      appointmentType: 'follow_up', status: 'canceled', modality: 'in_person',
      cancellationReason: 'Patient feeling unwell — rescheduled for the following week.',
    }),
  ];
}

// ── Default therapist availability ──────────────────────────────

export function generateDefaultAvailability(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  // Mon–Fri morning and afternoon blocks
  for (let day = 1; day <= 5; day++) {
    slots.push(
      { id: `avail-${day}-am`, dayOfWeek: day, startTime: '08:00', endTime: '12:00', modality: ['in_person', 'video', 'phone'], isRecurring: true },
      { id: `avail-${day}-pm`, dayOfWeek: day, startTime: '13:00', endTime: '18:00', modality: ['in_person', 'video', 'phone'], isRecurring: true },
    );
    // Lunch block
    slots.push({
      id: `block-${day}-lunch`, dayOfWeek: day, startTime: '12:00', endTime: '13:00',
      modality: [], isRecurring: true, isBlocked: true, label: 'Lunch',
    });
  }
  return slots;
}
