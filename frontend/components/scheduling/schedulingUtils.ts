import { Appointment, AppointmentStatus, TimeSlot } from './types';

// ── Date / time helpers ─────────────────────────────────────────

export function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function formatDisplayDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d + 'T12:00:00') : d;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatFullDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d + 'T12:00:00') : d;
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

export function getWeekDays(weekOffset: number): Date[] {
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

export function isUpcoming(appt: Appointment): boolean {
  const today = formatDateISO(new Date());
  return appt.date >= today && (appt.status === 'confirmed' || appt.status === 'pending_confirmation' || appt.status === 'requested');
}

export function isToday(dateStr: string): boolean {
  return dateStr === formatDateISO(new Date());
}

export function isPast(dateStr: string): boolean {
  return dateStr < formatDateISO(new Date());
}

// ── Time slot generation ────────────────────────────────────────

export const BUSINESS_HOURS_START = 8;  // 8 AM
export const BUSINESS_HOURS_END = 18;   // 6 PM
export const SLOT_INCREMENT = 30;       // 30-min slots

export function generateTimeSlots(start = BUSINESS_HOURS_START, end = BUSINESS_HOURS_END, increment = SLOT_INCREMENT): string[] {
  const slots: string[] = [];
  for (let minutes = start * 60; minutes < end * 60; minutes += increment) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
  return slots;
}

// ── Conflict detection ──────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function hasConflict(
  date: string,
  startTime: string,
  durationMinutes: number,
  existingAppointments: Appointment[],
  excludeId?: string,
): Appointment | null {
  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + durationMinutes;

  for (const appt of existingAppointments) {
    if (appt.id === excludeId) continue;
    if (appt.date !== date) continue;
    if (appt.status === 'canceled' || appt.status === 'no_show') continue;

    const existStart = timeToMinutes(appt.startTime);
    const existEnd = existStart + appt.durationMinutes;

    if (newStart < existEnd && newEnd > existStart) {
      return appt;
    }
  }
  return null;
}

// ── Availability checking ───────────────────────────────────────

export function isSlotAvailable(
  date: string,
  time: string,
  duration: number,
  availability: TimeSlot[],
  appointments: Appointment[],
  excludeId?: string,
): { available: boolean; reason?: string } {
  const d = new Date(date + 'T12:00:00');
  const dayOfWeek = d.getDay();

  // Check blocked slots for this specific date
  const blocked = availability.find(
    s => s.isBlocked && (s.specificDate === date || (!s.specificDate && s.dayOfWeek === dayOfWeek)),
  );
  if (blocked) return { available: false, reason: blocked.label || 'Blocked' };

  // Check if within recurring availability
  const availableSlots = availability.filter(
    s => !s.isBlocked && (s.dayOfWeek === dayOfWeek || s.specificDate === date),
  );

  if (availableSlots.length > 0) {
    const timeMin = timeToMinutes(time);
    const endMin = timeMin + duration;
    const inSlot = availableSlots.some(s => {
      const slotStart = timeToMinutes(s.startTime);
      const slotEnd = timeToMinutes(s.endTime);
      return timeMin >= slotStart && endMin <= slotEnd;
    });
    if (!inSlot) return { available: false, reason: 'Outside available hours' };
  }

  // Check conflicts
  const conflict = hasConflict(date, time, duration, appointments, excludeId);
  if (conflict) return { available: false, reason: `Conflicts with ${conflict.patientName} at ${formatTime12(conflict.startTime)}` };

  return { available: true };
}

// ── Stats computation ───────────────────────────────────────────

export interface SchedulingStats {
  todayCount: number;
  upcomingCount: number;
  weekCount: number;
  pendingConfirmation: number;
  rescheduleRequested: number;
  canceledThisWeek: number;
}

export function computeStats(appointments: Appointment[], weekDays: Date[]): SchedulingStats {
  const today = formatDateISO(new Date());
  const weekStart = formatDateISO(weekDays[0]);
  const weekEnd = formatDateISO(weekDays[6]);

  const activeStatuses: AppointmentStatus[] = ['confirmed', 'pending_confirmation', 'requested'];

  return {
    todayCount: appointments.filter(a => a.date === today && activeStatuses.includes(a.status)).length,
    upcomingCount: appointments.filter(a => a.date >= today && activeStatuses.includes(a.status)).length,
    weekCount: appointments.filter(a => a.date >= weekStart && a.date <= weekEnd && a.status !== 'canceled').length,
    pendingConfirmation: appointments.filter(a => a.status === 'pending_confirmation' && a.date >= today).length,
    rescheduleRequested: appointments.filter(a => a.status === 'reschedule_requested').length,
    canceledThisWeek: appointments.filter(a => a.date >= weekStart && a.date <= weekEnd && a.status === 'canceled').length,
  };
}

// ── Filter logic ────────────────────────────────────────────────

import { SchedulingFilters } from './types';

export function applyFilters(appointments: Appointment[], filters: SchedulingFilters): Appointment[] {
  return appointments.filter(appt => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!appt.patientName.toLowerCase().includes(q) && !appt.notes?.toLowerCase().includes(q)) return false;
    }
    if (filters.status !== 'all' && appt.status !== filters.status) return false;
    if (filters.appointmentType !== 'all' && appt.appointmentType !== filters.appointmentType) return false;
    if (filters.modality !== 'all' && appt.modality !== filters.modality) return false;
    if (filters.dateFrom && appt.date < filters.dateFrom) return false;
    if (filters.dateTo && appt.date > filters.dateTo) return false;
    return true;
  });
}
