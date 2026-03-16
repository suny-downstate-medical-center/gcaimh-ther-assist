import React, { useState, useEffect } from 'react';
import {
  Drawer, Box, Typography, Stack, Button, IconButton, TextField, FormControl, InputLabel,
  Select, MenuItem, FormControlLabel, Checkbox, Divider, Alert, Autocomplete,
} from '@mui/material';
import { Close, CalendarToday } from '@mui/icons-material';
import {
  Appointment, AppointmentType, Modality, RecurrencePattern,
  APPOINTMENT_TYPES, MODALITIES,
} from './types';
import { addMinutesToTime, generateTimeSlots, hasConflict, formatTime12 } from './schedulingUtils';
import { Patient } from '../../types/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (appt: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  existingAppointments: Appointment[];
  patients: Patient[];
  editingAppointment?: Appointment | null;
  defaultDate?: string;
  defaultTime?: string;
}

const DURATION_OPTIONS = [
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 50, label: '50 min (standard)' },
  { value: 60, label: '60 min' },
  { value: 75, label: '75 min' },
  { value: 90, label: '90 min' },
];

const RECURRENCE_OPTIONS: { value: RecurrencePattern; label: string }[] = [
  { value: 'none', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
];

const TIME_SLOTS = generateTimeSlots();

const AppointmentForm: React.FC<Props> = ({
  open, onClose, onSave, existingAppointments, patients, editingAppointment, defaultDate, defaultTime,
}) => {
  const isEdit = !!editingAppointment;
  const today = new Date().toISOString().split('T')[0];

  // Form state
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState(defaultDate || today);
  const [startTime, setStartTime] = useState(defaultTime || '09:00');
  const [duration, setDuration] = useState(50);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('follow_up');
  const [modality, setModality] = useState<Modality>('in_person');
  const [recurrence, setRecurrence] = useState<RecurrencePattern>('none');
  const [notes, setNotes] = useState('');
  const [prepNotes, setPrepNotes] = useState('');
  const [hwReview, setHwReview] = useState(false);
  const [preMeasure, setPreMeasure] = useState(false);
  const [sendResources, setSendResources] = useState(false);
  const [locationOrLink, setLocationOrLink] = useState('');

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (editingAppointment) {
        setPatientId(editingAppointment.patientId);
        setDate(editingAppointment.date);
        setStartTime(editingAppointment.startTime);
        setDuration(editingAppointment.durationMinutes);
        setAppointmentType(editingAppointment.appointmentType);
        setModality(editingAppointment.modality);
        setRecurrence(editingAppointment.recurrence);
        setNotes(editingAppointment.notes || '');
        setPrepNotes(editingAppointment.prepNotes || '');
        setHwReview(editingAppointment.homeworkReviewNeeded || false);
        setPreMeasure(editingAppointment.preMeasureRequired || false);
        setSendResources(editingAppointment.sendPostSessionResources || false);
        setLocationOrLink(editingAppointment.locationOrJoinLink || '');
      } else {
        setPatientId('');
        setDate(defaultDate || today);
        setStartTime(defaultTime || '09:00');
        setDuration(50);
        setAppointmentType('follow_up');
        setModality('in_person');
        setRecurrence('none');
        setNotes('');
        setPrepNotes('');
        setHwReview(false);
        setPreMeasure(false);
        setSendResources(false);
        setLocationOrLink('');
      }
    }
  }, [open, editingAppointment, defaultDate, defaultTime]);

  // Auto-adjust duration when type changes
  useEffect(() => {
    if (!isEdit) {
      const meta = APPOINTMENT_TYPES.find(t => t.value === appointmentType);
      if (meta) setDuration(meta.defaultDuration);
    }
  }, [appointmentType, isEdit]);

  // Conflict detection
  const conflict = hasConflict(date, startTime, duration, existingAppointments, editingAppointment?.id);

  const selectedPatient = patients.find(p => p.id === patientId);
  const canSave = patientId && date && startTime && !conflict;

  const handleSave = () => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    onSave({
      id: editingAppointment?.id,
      patientId,
      patientName: patient.name,
      therapistId: 'ther-1',
      therapistName: 'Dr. Amara Osei',
      appointmentType,
      modality,
      status: editingAppointment?.status || 'confirmed',
      date,
      startTime,
      endTime: addMinutesToTime(startTime, duration),
      durationMinutes: duration,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locationOrJoinLink: locationOrLink || undefined,
      notes: notes || undefined,
      prepNotes: prepNotes || undefined,
      homeworkReviewNeeded: hwReview || undefined,
      sendPostSessionResources: sendResources || undefined,
      preMeasureRequired: preMeasure || undefined,
      recurrence,
      reminderState: 'not_sent',
      confirmationState: 'pending',
    });
    onClose();
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}>
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CalendarToday color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {isEdit ? 'Edit Appointment' : 'Schedule Appointment'}
          </Typography>
        </Stack>
        <IconButton onClick={onClose}><Close /></IconButton>
      </Box>

      <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
        <Stack spacing={3}>
          {/* Patient selector */}
          <Autocomplete
            options={patients.filter(p => p.status === 'active')}
            getOptionLabel={p => p.name}
            value={selectedPatient || null}
            onChange={(_, val) => setPatientId(val?.id || '')}
            renderInput={params => <TextField {...params} label="Patient" required size="small" />}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Stack>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{option.focusTopics}</Typography>
                </Stack>
              </li>
            )}
          />

          {/* Type */}
          <FormControl size="small" fullWidth>
            <InputLabel>Appointment Type</InputLabel>
            <Select value={appointmentType} label="Appointment Type" onChange={e => setAppointmentType(e.target.value as AppointmentType)}>
              {APPOINTMENT_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: t.color, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="body2">{t.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider />

          {/* Date & Time */}
          <Stack direction="row" spacing={2}>
            <TextField
              label="Date" type="date" size="small" fullWidth required
              value={date} onChange={e => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Time</InputLabel>
              <Select value={startTime} label="Time" onChange={e => setStartTime(e.target.value)}>
                {TIME_SLOTS.map(t => <MenuItem key={t} value={t}>{formatTime12(t)}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Duration</InputLabel>
              <Select value={duration} label="Duration" onChange={e => setDuration(Number(e.target.value))}>
                {DURATION_OPTIONS.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Modality</InputLabel>
              <Select value={modality} label="Modality" onChange={e => setModality(e.target.value as Modality)}>
                {MODALITIES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          {modality === 'video' && (
            <TextField size="small" label="Join Link" value={locationOrLink} onChange={e => setLocationOrLink(e.target.value)} placeholder="https://meet.therassist.app/..." />
          )}
          {modality === 'in_person' && (
            <TextField size="small" label="Location (optional)" value={locationOrLink} onChange={e => setLocationOrLink(e.target.value)} placeholder="Office, Room 204..." />
          )}

          {conflict && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Conflicts with <strong>{conflict.patientName}</strong> at {formatTime12(conflict.startTime)}
            </Alert>
          )}

          <Divider />

          {/* Recurrence */}
          <FormControl size="small" fullWidth>
            <InputLabel>Recurrence</InputLabel>
            <Select value={recurrence} label="Recurrence" onChange={e => setRecurrence(e.target.value as RecurrencePattern)}>
              {RECURRENCE_OPTIONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>

          <Divider />

          {/* Notes */}
          <TextField
            size="small" multiline rows={2} label="Session Notes / Agenda"
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Topics to cover, goals for this session..."
          />
          <TextField
            size="small" multiline rows={2} label="Preparation Notes"
            value={prepNotes} onChange={e => setPrepNotes(e.target.value)}
            placeholder="Review measures, check homework, specific resources..."
          />

          <Divider />

          {/* Continuity flags */}
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
            Session Continuity
          </Typography>
          <Stack spacing={0}>
            <FormControlLabel
              control={<Checkbox checked={hwReview} onChange={e => setHwReview(e.target.checked)} size="small" />}
              label={<Typography variant="body2">Homework review needed</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={preMeasure} onChange={e => setPreMeasure(e.target.checked)} size="small" />}
              label={<Typography variant="body2">Pre-session symptom measure required</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={sendResources} onChange={e => setSendResources(e.target.checked)} size="small" />}
              label={<Typography variant="body2">Send post-session resources to patient</Typography>}
            />
          </Stack>
        </Stack>
      </Box>

      {/* Actions */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button onClick={onClose} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained" disabled={!canSave} onClick={handleSave}
            sx={{ borderRadius: 2, fontWeight: 600, background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)', px: 3 }}
          >
            {isEdit ? 'Save Changes' : 'Schedule Appointment'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
};

export default AppointmentForm;
