import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Stack, Chip, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  IconButton, Alert, Divider,
} from '@mui/material';
import {
  ArrowBack, ArrowForward, Add, CalendarToday, AccessTime,
  Person, Edit, Delete, Close, EventAvailable, EventBusy,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { Patient } from '../types/types';

// ── Types ──────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  type: 'initial' | 'follow-up' | 'crisis' | 'assessment';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
}

const APPOINTMENT_TYPES: { value: Appointment['type']; label: string; color: string }[] = [
  { value: 'initial', label: 'Initial Assessment', color: '#673ab7' },
  { value: 'follow-up', label: 'Follow-up', color: '#0b57d0' },
  { value: 'crisis', label: 'Crisis Session', color: '#ef4444' },
  { value: 'assessment', label: 'Assessment', color: '#10b981' },
];

const STATUS_COLORS: Record<Appointment['status'], 'default' | 'success' | 'error' | 'warning'> = {
  scheduled: 'default',
  completed: 'success',
  cancelled: 'error',
  'no-show': 'warning',
};

const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8; // 8:00 AM to 5:30 PM
  const min = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${min}`;
});

// ── Helpers ────────────────────────────────────────────────────

function generateMockAppointments(patients: Patient[]): Appointment[] {
  const appointments: Appointment[] = [];
  const today = new Date();

  patients.forEach((patient) => {
    if (patient.nextVisit) {
      appointments.push({
        id: `appt-${patient.id}-next`,
        patientId: patient.id,
        patientName: patient.name,
        date: patient.nextVisit,
        time: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'][parseInt(patient.id) % 6],
        duration: 50,
        type: 'follow-up',
        status: 'scheduled',
      });
    }

    // Add a past completed appointment
    if (patient.lastVisit) {
      appointments.push({
        id: `appt-${patient.id}-last`,
        patientId: patient.id,
        patientName: patient.name,
        date: patient.lastVisit,
        time: ['09:30', '10:30', '11:30', '13:30', '14:30', '15:30'][parseInt(patient.id) % 6],
        duration: 50,
        type: 'follow-up',
        status: 'completed',
      });
    }
  });

  // Add a couple today
  const todayStr = today.toISOString().split('T')[0];
  if (!appointments.some(a => a.date === todayStr)) {
    const activePatient = patients.find(p => p.status === 'active');
    if (activePatient) {
      appointments.push({
        id: `appt-today-1`,
        patientId: activePatient.id,
        patientName: activePatient.name,
        date: todayStr,
        time: '10:00',
        duration: 50,
        type: 'follow-up',
        status: 'scheduled',
      });
    }
  }

  return appointments;
}

function getWeekDays(weekOffset: number): Date[] {
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

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ── Props ──────────────────────────────────────────────────────

interface SchedulePageProps {
  patients: Patient[];
  onNavigateBack: () => void;
  onNavigateToPatient?: (patientId: string) => void;
  onNavigateToNewSession?: (patientId?: string) => void;
}

// ── Component ──────────────────────────────────────────────────

const SchedulePage: React.FC<SchedulePageProps> = ({
  patients,
  onNavigateBack,
  onNavigateToPatient,
  onNavigateToNewSession,
}) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>(() => generateMockAppointments(patients));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDayDate, setSelectedDayDate] = useState<string>(formatDate(new Date()));

  // Form state
  const [formPatientId, setFormPatientId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formDuration, setFormDuration] = useState(50);
  const [formType, setFormType] = useState<Appointment['type']>('follow-up');
  const [formNotes, setFormNotes] = useState('');

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  const todayStr = formatDate(new Date());

  const weekStart = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEnd = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Stats
  const upcomingCount = appointments.filter(a => a.status === 'scheduled' && a.date >= todayStr).length;
  const todayCount = appointments.filter(a => a.date === todayStr && a.status === 'scheduled').length;
  const weekAppointments = appointments.filter(a => {
    const d = a.date;
    return d >= formatDate(weekDays[0]) && d <= formatDate(weekDays[6]);
  });

  const openNewDialog = (date?: string) => {
    setEditingAppointment(null);
    setFormPatientId('');
    setFormDate(date || todayStr);
    setFormTime('09:00');
    setFormDuration(50);
    setFormType('follow-up');
    setFormNotes('');
    setDialogOpen(true);
  };

  const openEditDialog = (appt: Appointment) => {
    setEditingAppointment(appt);
    setFormPatientId(appt.patientId);
    setFormDate(appt.date);
    setFormTime(appt.time);
    setFormDuration(appt.duration);
    setFormType(appt.type);
    setFormNotes(appt.notes || '');
    setDialogOpen(true);
  };

  const handleSave = () => {
    const patient = patients.find(p => p.id === formPatientId);
    if (!patient) return;

    if (editingAppointment) {
      setAppointments(prev => prev.map(a =>
        a.id === editingAppointment.id
          ? { ...a, patientId: formPatientId, patientName: patient.name, date: formDate, time: formTime, duration: formDuration, type: formType, notes: formNotes || undefined }
          : a
      ));
    } else {
      const newAppt: Appointment = {
        id: `appt-${Date.now()}`,
        patientId: formPatientId,
        patientName: patient.name,
        date: formDate,
        time: formTime,
        duration: formDuration,
        type: formType,
        status: 'scheduled',
        notes: formNotes || undefined,
      };
      setAppointments(prev => [...prev, newAppt]);
    }
    setDialogOpen(false);
  };

  const handleCancel = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' as const } : a));
  };

  const handleDelete = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const handleMarkComplete = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' as const } : a));
  };

  const getTypeColor = (type: Appointment['type']) =>
    APPOINTMENT_TYPES.find(t => t.value === type)?.color || '#0b57d0';

  const renderAppointmentCard = (appt: Appointment) => (
    <Card
      key={appt.id}
      sx={{
        borderLeft: 4,
        borderColor: getTypeColor(appt.type),
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
        opacity: appt.status === 'cancelled' ? 0.6 : 1,
      }}
    >
      <CardContent sx={{ '&:last-child': { pb: 2 }, py: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5} mb={0.5}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  cursor: onNavigateToPatient ? 'pointer' : 'default',
                  '&:hover': onNavigateToPatient ? { color: 'primary.main' } : {},
                }}
                onClick={() => onNavigateToPatient?.(appt.patientId)}
              >
                {appt.patientName}
              </Typography>
              <Chip label={appt.status} size="small" color={STATUS_COLORS[appt.status]} />
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <AccessTime sx={{ fontSize: 16 }} color="action" />
                <Typography variant="body2" color="text.secondary">
                  {formatTime(appt.time)} · {appt.duration} min
                </Typography>
              </Stack>
              <Chip
                label={APPOINTMENT_TYPES.find(t => t.value === appt.type)?.label || appt.type}
                size="small"
                sx={{ bgcolor: `${getTypeColor(appt.type)}18`, color: getTypeColor(appt.type), fontWeight: 500 }}
              />
            </Stack>
            {appt.notes && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                {appt.notes}
              </Typography>
            )}
          </Box>
          {appt.status === 'scheduled' && (
            <Stack direction="row" spacing={0.5}>
              {onNavigateToNewSession && (
                <Button size="small" variant="contained" onClick={() => onNavigateToNewSession(appt.patientId)} sx={{ whiteSpace: 'nowrap', minWidth: 0 }}>
                  Start
                </Button>
              )}
              <IconButton size="small" onClick={() => openEditDialog(appt)}><Edit fontSize="small" /></IconButton>
              <IconButton size="small" onClick={() => handleCancel(appt.id)}><EventBusy fontSize="small" color="error" /></IconButton>
            </Stack>
          )}
          {appt.status === 'completed' && (
            <Chip label="Done" size="small" color="success" variant="outlined" />
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  // Day view appointments
  const dayAppointments = appointments
    .filter(a => a.date === selectedDayDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background-gradient)' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 2, md: 3 }, gap: 3, maxWidth: 1400, mx: 'auto', width: '100%' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Button startIcon={<ArrowBack />} onClick={onNavigateBack} sx={{ color: '#0b57d0', textTransform: 'none', fontWeight: 500 }}>
            Back
          </Button>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>Schedule</Typography>
            <Typography variant="body1" color="text.secondary">Manage appointments and session scheduling</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => openNewDialog()}
            sx={{
              borderRadius: 2, whiteSpace: 'nowrap', flexShrink: 0,
              background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
              py: 1.25, px: 3, fontWeight: 600,
            }}
          >
            New Appointment
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                <CalendarToday color="primary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>{todayCount}</Typography>
                <Typography variant="body2" color="text.secondary">Today</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                <EventAvailable color="success" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>{upcomingCount}</Typography>
                <Typography variant="body2" color="text.secondary">Upcoming</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                <ScheduleIcon color="warning" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>{weekAppointments.length}</Typography>
                <Typography variant="body2" color="text.secondary">This Week</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                <Person color="info" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>{patients.filter(p => p.status === 'active').length}</Typography>
                <Typography variant="body2" color="text.secondary">Active Patients</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* View Toggle + Week Navigation */}
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant={viewMode === 'week' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setViewMode('week')}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === 'day' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setViewMode('day')}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Day
                </Button>
              </Stack>

              {viewMode === 'week' ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton onClick={() => setWeekOffset(w => w - 1)} size="small"><ArrowBack fontSize="small" /></IconButton>
                  <Button size="small" onClick={() => setWeekOffset(0)} sx={{ textTransform: 'none', fontWeight: 600 }}>
                    {weekOffset === 0 ? 'This Week' : `${weekStart} – ${weekEnd}`}
                  </Button>
                  <IconButton onClick={() => setWeekOffset(w => w + 1)} size="small"><ArrowForward fontSize="small" /></IconButton>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton onClick={() => {
                    const d = new Date(selectedDayDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDayDate(formatDate(d));
                  }} size="small"><ArrowBack fontSize="small" /></IconButton>
                  <TextField
                    type="date"
                    size="small"
                    value={selectedDayDate}
                    onChange={e => setSelectedDayDate(e.target.value)}
                    sx={{ width: 180 }}
                  />
                  <IconButton onClick={() => {
                    const d = new Date(selectedDayDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDayDate(formatDate(d));
                  }} size="small"><ArrowForward fontSize="small" /></IconButton>
                  <Button size="small" onClick={() => setSelectedDayDate(todayStr)} sx={{ textTransform: 'none' }}>Today</Button>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Calendar Content */}
        {viewMode === 'week' ? (
          <Grid container spacing={2}>
            {weekDays.map(day => {
              const dateStr = formatDate(day);
              const isToday = dateStr === todayStr;
              const dayAppts = appointments
                .filter(a => a.date === dateStr)
                .sort((a, b) => a.time.localeCompare(b.time));

              return (
                <Grid item xs={12} sm={6} md={12 / 7} key={dateStr} sx={{ minWidth: { md: 0 } }}>
                  <Card
                    sx={{
                      height: '100%',
                      borderTop: 3,
                      borderColor: isToday ? 'primary.main' : 'transparent',
                      bgcolor: isToday ? 'rgba(11, 87, 208, 0.03)' : undefined,
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                            {day.toLocaleDateString('en-US', { weekday: 'short' })}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: isToday ? 700 : 500, color: isToday ? 'primary.main' : undefined, lineHeight: 1.2 }}>
                            {day.getDate()}
                          </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => openNewDialog(dateStr)} sx={{ color: 'primary.main' }}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Stack>

                      <Stack spacing={0.75}>
                        {dayAppts.length === 0 ? (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 1 }}>
                            No appointments
                          </Typography>
                        ) : (
                          dayAppts.map(appt => (
                            <Box
                              key={appt.id}
                              sx={{
                                p: 1,
                                borderRadius: 1,
                                bgcolor: `${getTypeColor(appt.type)}12`,
                                borderLeft: 3,
                                borderColor: getTypeColor(appt.type),
                                cursor: 'pointer',
                                opacity: appt.status === 'cancelled' ? 0.5 : 1,
                                textDecoration: appt.status === 'cancelled' ? 'line-through' : 'none',
                                '&:hover': { bgcolor: `${getTypeColor(appt.type)}22` },
                              }}
                              onClick={() => {
                                setSelectedDayDate(dateStr);
                                setViewMode('day');
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 600, color: getTypeColor(appt.type), display: 'block' }}>
                                {formatTime(appt.time)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.primary', display: 'block', lineHeight: 1.3 }}>
                                {appt.patientName}
                              </Typography>
                            </Box>
                          ))
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          /* Day View */
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                <CalendarToday color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {new Date(selectedDayDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </Typography>
                {selectedDayDate === todayStr && <Chip label="Today" color="primary" size="small" />}
              </Stack>

              {dayAppointments.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <EventBusy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                    No appointments scheduled
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    This day is open. Schedule a new appointment to get started.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => openNewDialog(selectedDayDate)}
                    sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)', fontWeight: 600 }}
                  >
                    Schedule Appointment
                  </Button>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {dayAppointments.map(renderAppointmentCard)}
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => openNewDialog(selectedDayDate)}
                    sx={{ borderRadius: 2, alignSelf: 'flex-start' }}
                  >
                    Add Another
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Appointments List (below calendar) */}
        {viewMode === 'week' && (
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                <EventAvailable color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>Upcoming Appointments</Typography>
              </Stack>
              {appointments
                .filter(a => a.status === 'scheduled' && a.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                .length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No upcoming appointments. Schedule one to get started.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {appointments
                    .filter(a => a.status === 'scheduled' && a.date >= todayStr)
                    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                    .slice(0, 10)
                    .map(appt => (
                      <Card
                        key={appt.id}
                        sx={{
                          borderLeft: 4,
                          borderColor: getTypeColor(appt.type),
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                        }}
                      >
                        <CardContent sx={{ '&:last-child': { pb: 2 }, py: 1.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{appt.patientName}</Typography>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <CalendarToday sx={{ fontSize: 14 }} color="action" />
                                  <Typography variant="body2" color="text.secondary">
                                    {new Date(appt.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <AccessTime sx={{ fontSize: 14 }} color="action" />
                                  <Typography variant="body2" color="text.secondary">{formatTime(appt.time)} · {appt.duration} min</Typography>
                                </Stack>
                                <Chip
                                  label={APPOINTMENT_TYPES.find(t => t.value === appt.type)?.label}
                                  size="small"
                                  sx={{ bgcolor: `${getTypeColor(appt.type)}18`, color: getTypeColor(appt.type), fontWeight: 500 }}
                                />
                              </Stack>
                            </Box>
                            <Stack direction="row" spacing={0.5}>
                              {onNavigateToNewSession && appt.date === todayStr && (
                                <Button size="small" variant="contained" onClick={() => onNavigateToNewSession(appt.patientId)}>Start Session</Button>
                              )}
                              <IconButton size="small" onClick={() => openEditDialog(appt)}><Edit fontSize="small" /></IconButton>
                              <IconButton size="small" onClick={() => handleCancel(appt.id)}><EventBusy fontSize="small" color="error" /></IconButton>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Add/Edit Appointment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingAppointment ? 'Edit Appointment' : 'New Appointment'}
          <IconButton onClick={() => setDialogOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Patient</InputLabel>
              <Select value={formPatientId} label="Patient" onChange={e => setFormPatientId(e.target.value)}>
                {patients.filter(p => p.status === 'active').map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Person fontSize="small" />
                      <span>{p.name}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Time</InputLabel>
                <Select value={formTime} label="Time" onChange={e => setFormTime(e.target.value)}>
                  {TIME_SLOTS.map(t => <MenuItem key={t} value={t}>{formatTime(t)}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={formType} label="Type" onChange={e => setFormType(e.target.value as Appointment['type'])}>
                  {APPOINTMENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Duration</InputLabel>
                <Select value={formDuration} label="Duration" onChange={e => setFormDuration(Number(e.target.value))}>
                  <MenuItem value={30}>30 minutes</MenuItem>
                  <MenuItem value={45}>45 minutes</MenuItem>
                  <MenuItem value={50}>50 minutes</MenuItem>
                  <MenuItem value={60}>60 minutes</MenuItem>
                  <MenuItem value={90}>90 minutes</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <TextField label="Notes (optional)" multiline rows={2} value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Session notes or reminders…" fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formPatientId || !formDate || !formTime}
            sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)', fontWeight: 600 }}
          >
            {editingAppointment ? 'Save Changes' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SchedulePage;
