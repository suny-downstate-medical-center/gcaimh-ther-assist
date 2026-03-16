import React, { useState, useMemo, useCallback } from 'react';
import {
  Box, Typography, Stack, Card, CardContent, Button, IconButton, Tabs, Tab, Grid, Chip,
} from '@mui/material';
import {
  ArrowBack, ArrowForward, Add, CalendarToday, EventAvailable, PendingActions,
  SwapHoriz, EventBusy, TodayOutlined, SettingsOutlined,
} from '@mui/icons-material';
import { Patient } from '../../types/types';
import {
  Appointment, TimeSlot, SchedulingFilters as FiltersType, DEFAULT_FILTERS,
  getTypeMeta,
} from './types';
import {
  formatDateISO, getWeekDays, computeStats, applyFilters,
} from './schedulingUtils';
import { generateMockAppointments, generateDefaultAvailability } from './mockAppointments';

import SchedulingCalendar from './SchedulingCalendar';
import AppointmentsTable from './AppointmentsTable';
import AppointmentForm from './AppointmentForm';
import AppointmentDetailsDrawer from './AppointmentDetailsDrawer';
import SchedulingFiltersBar from './SchedulingFilters';
import AvailabilityPanel from './AvailabilityPanel';

// ── Props ───────────────────────────────────────────────────────

interface SchedulingDashboardProps {
  patients: Patient[];
  onNavigateBack: () => void;
  onNavigateToPatient?: (patientId: string) => void;
  onNavigateToNewSession?: (patientId?: string) => void;
}

// ── Stat Card ───────────────────────────────────────────────────

const StatCard: React.FC<{ icon: React.ReactNode; value: number; label: string; color: string; onClick?: () => void }> = ({
  icon, value, label, color, onClick,
}) => (
  <Card
    onClick={onClick}
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': onClick ? { transform: 'translateY(-3px)', boxShadow: 4 } : {},
      borderRadius: 3,
      border: '1px solid',
      borderColor: 'grey.100',
    }}
  >
    <CardContent sx={{ py: 2.5, px: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{
          width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: `${color}12`, color: color,
        }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1, color }}>{value}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.25 }}>{label}</Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

// ── Tab indices ─────────────────────────────────────────────────

const TAB_CALENDAR = 0;
const TAB_LIST = 1;
const TAB_AVAILABILITY = 2;

// ── Component ───────────────────────────────────────────────────

const SchedulingDashboard: React.FC<SchedulingDashboardProps> = ({
  patients, onNavigateBack, onNavigateToPatient, onNavigateToNewSession,
}) => {
  // ─ State ────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>(() => generateMockAppointments(patients));
  const [availability, setAvailability] = useState<TimeSlot[]>(() => generateDefaultAvailability());
  const [activeTab, setActiveTab] = useState(TAB_CALENDAR);
  const [weekOffset, setWeekOffset] = useState(0);
  const [filters, setFilters] = useState<FiltersType>(DEFAULT_FILTERS);

  // Form / drawer state
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState<string | undefined>();
  const [formDefaultTime, setFormDefaultTime] = useState<string | undefined>();

  // ─ Derived ──────────────────────────────────────────────────
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const todayStr = formatDateISO(new Date());
  const stats = useMemo(() => computeStats(appointments, weekDays), [appointments, weekDays]);
  const filteredAppointments = useMemo(() =>
    applyFilters(appointments, filters).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [appointments, filters],
  );

  const weekStart = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEnd = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // ─ Handlers ─────────────────────────────────────────────────
  const openNewForm = useCallback((date?: string, time?: string) => {
    setEditingAppt(null);
    setFormDefaultDate(date);
    setFormDefaultTime(time);
    setFormOpen(true);
  }, []);

  const openEditForm = useCallback((appt: Appointment) => {
    setEditingAppt(appt);
    setFormDefaultDate(undefined);
    setFormDefaultTime(undefined);
    setFormOpen(true);
    setDetailOpen(false);
  }, []);

  const openDetail = useCallback((appt: Appointment) => {
    setDetailAppt(appt);
    setDetailOpen(true);
  }, []);

  const handleSave = useCallback((data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString();
    if (data.id) {
      setAppointments(prev => prev.map(a => a.id === data.id ? { ...a, ...data, updatedAt: now } as Appointment : a));
    } else {
      const newAppt: Appointment = { ...data, id: `appt-${Date.now()}`, createdAt: now, updatedAt: now } as Appointment;
      setAppointments(prev => [...prev, newAppt]);
    }
  }, []);

  const handleCancel = useCallback((id: string, reason?: string) => {
    setAppointments(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'canceled' as const, cancellationReason: reason, updatedAt: new Date().toISOString() } : a
    ));
    setDetailOpen(false);
  }, []);

  const handleConfirm = useCallback((id: string) => {
    setAppointments(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'confirmed' as const, confirmationState: 'confirmed' as const, updatedAt: new Date().toISOString() } : a
    ));
  }, []);

  const handleComplete = useCallback((id: string) => {
    setAppointments(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'completed' as const, updatedAt: new Date().toISOString() } : a
    ));
    setDetailOpen(false);
  }, []);

  const handleReschedule = useCallback((appt: Appointment) => {
    openEditForm(appt);
  }, [openEditForm]);

  // ─ Render ───────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background-gradient)' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 2, md: 3 }, gap: 3, maxWidth: 1440, mx: 'auto', width: '100%' }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Button startIcon={<ArrowBack />} onClick={onNavigateBack} sx={{ color: '#0b57d0', textTransform: 'none', fontWeight: 500 }}>
            Back
          </Button>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Scheduling</Typography>
            <Typography variant="body2" color="text.secondary">Manage appointments, availability, and session planning</Typography>
          </Box>
          <Button
            variant="contained" startIcon={<Add />} onClick={() => openNewForm()}
            sx={{
              borderRadius: 2, whiteSpace: 'nowrap', flexShrink: 0, py: 1.25, px: 3, fontWeight: 600,
              background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
            }}
          >
            Schedule Appointment
          </Button>
        </Box>

        {/* ── Stats ──────────────────────────────────────────── */}
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard icon={<TodayOutlined />} value={stats.todayCount} label="Today" color="#0b57d0" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard icon={<EventAvailable />} value={stats.upcomingCount} label="Upcoming" color="#059669" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard icon={<CalendarToday />} value={stats.weekCount} label="This Week" color="#7c3aed" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              icon={<PendingActions />}
              value={stats.pendingConfirmation}
              label="Pending"
              color="#d97706"
              onClick={() => setFilters({ ...DEFAULT_FILTERS, status: 'pending_confirmation' })}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              icon={<SwapHoriz />}
              value={stats.rescheduleRequested}
              label="Reschedules"
              color="#0891b2"
              onClick={() => setFilters({ ...DEFAULT_FILTERS, status: 'reschedule_requested' })}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              icon={<EventBusy />}
              value={stats.canceledThisWeek}
              label="Canceled"
              color="#dc2626"
              onClick={() => setFilters({ ...DEFAULT_FILTERS, status: 'canceled' })}
            />
          </Grid>
        </Grid>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <Card sx={{ borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Tab icon={<CalendarToday sx={{ fontSize: 18 }} />} iconPosition="start" label="Calendar" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }} />
            <Tab icon={<EventAvailable sx={{ fontSize: 18 }} />} iconPosition="start" label="Appointments" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }} />
            <Tab icon={<SettingsOutlined sx={{ fontSize: 18 }} />} iconPosition="start" label="Availability" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }} />
          </Tabs>
        </Card>

        {/* ── Calendar Tab ───────────────────────────────────── */}
        {activeTab === TAB_CALENDAR && (
          <>
            {/* Week navigation */}
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
              <IconButton onClick={() => setWeekOffset(w => w - 1)} size="small"><ArrowBack fontSize="small" /></IconButton>
              <Button
                size="small" onClick={() => setWeekOffset(0)}
                sx={{ textTransform: 'none', fontWeight: 600, minWidth: 180 }}
              >
                {weekOffset === 0 ? 'This Week' : `${weekStart} – ${weekEnd}`}
              </Button>
              <IconButton onClick={() => setWeekOffset(w => w + 1)} size="small"><ArrowForward fontSize="small" /></IconButton>
            </Stack>

            <SchedulingCalendar
              weekDays={weekDays}
              appointments={appointments.filter(a => {
                const d = a.date;
                return d >= formatDateISO(weekDays[0]) && d <= formatDateISO(weekDays[6]);
              })}
              onClickAppointment={openDetail}
              onAddAppointment={openNewForm}
            />

            {/* Today's session list below calendar */}
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                  <TodayOutlined color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Today's Sessions</Typography>
                  <Chip label={stats.todayCount} size="small" color="primary" />
                </Stack>

                {appointments
                  .filter(a => a.date === todayStr && !['canceled', 'no_show'].includes(a.status))
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No sessions scheduled for today.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {appointments
                      .filter(a => a.date === todayStr && !['canceled', 'no_show'].includes(a.status))
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map(appt => {
                        const typeMeta = getTypeMeta(appt.appointmentType);
                        return (
                          <Card
                            key={appt.id}
                            variant="outlined"
                            onClick={() => openDetail(appt)}
                            sx={{
                              borderLeft: 4, borderColor: typeMeta.color, borderRadius: 2, cursor: 'pointer',
                              transition: 'all 0.2s', '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 },
                            }}
                          >
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{appt.patientName}</Typography>
                                  <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Typography variant="body2" color="text.secondary">
                                      {formatTime12Inline(appt.startTime)} – {formatTime12Inline(appt.endTime)} · {appt.durationMinutes} min
                                    </Typography>
                                    <Chip label={typeMeta.shortLabel} size="small" sx={{ bgcolor: `${typeMeta.color}14`, color: typeMeta.color, fontWeight: 600, height: 22 }} />
                                    {appt.homeworkReviewNeeded && <Chip label="HW" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#fef3c7', color: '#92400e' }} />}
                                  </Stack>
                                </Box>
                                {appt.status === 'confirmed' && onNavigateToNewSession && (
                                  <Button
                                    size="small" variant="contained"
                                    onClick={(e) => { e.stopPropagation(); onNavigateToNewSession(appt.patientId); }}
                                    sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', fontWeight: 600, textTransform: 'none' }}
                                  >
                                    Start Session
                                  </Button>
                                )}
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── List Tab ────────────────────────────────────────── */}
        {activeTab === TAB_LIST && (
          <>
            <SchedulingFiltersBar filters={filters} onChange={setFilters} />
            <AppointmentsTable
              appointments={filteredAppointments}
              onClickAppointment={openDetail}
              onEdit={openEditForm}
              onCancel={(id) => handleCancel(id)}
              onConfirm={handleConfirm}
              onComplete={handleComplete}
              onStartSession={onNavigateToNewSession}
              onPatientClick={onNavigateToPatient}
              onAddAppointment={() => openNewForm()}
            />
          </>
        )}

        {/* ── Availability Tab ────────────────────────────────── */}
        {activeTab === TAB_AVAILABILITY && (
          <AvailabilityPanel availability={availability} onChange={setAvailability} />
        )}
      </Box>

      {/* ── Form Drawer ──────────────────────────────────────── */}
      <AppointmentForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingAppt(null); }}
        onSave={handleSave}
        existingAppointments={appointments}
        patients={patients}
        editingAppointment={editingAppt}
        defaultDate={formDefaultDate}
        defaultTime={formDefaultTime}
      />

      {/* ── Detail Drawer ────────────────────────────────────── */}
      <AppointmentDetailsDrawer
        appointment={detailAppt}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={openEditForm}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        onComplete={handleComplete}
        onReschedule={handleReschedule}
        onStartSession={onNavigateToNewSession}
      />
    </Box>
  );
};

// Inline time formatter to avoid circular import
function formatTime12Inline(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default SchedulingDashboard;
