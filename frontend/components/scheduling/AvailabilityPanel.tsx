import React, { useState } from 'react';
import {
  Box, Typography, Stack, Card, CardContent, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, TextField,
  FormGroup, FormControlLabel, Checkbox, Switch, Divider,
} from '@mui/material';
import { Add, Block, CheckCircle } from '@mui/icons-material';
import { TimeSlot, Modality, MODALITIES } from './types';
import { formatTime12 } from './schedulingUtils';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  availability: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
}

const AvailabilityPanel: React.FC<Props> = ({ availability, onChange }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);

  // Form state
  const [formDay, setFormDay] = useState(1);
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('12:00');
  const [formModalities, setFormModalities] = useState<Modality[]>(['in_person', 'video', 'phone']);
  const [formBlocked, setFormBlocked] = useState(false);
  const [formLabel, setFormLabel] = useState('');

  const openNew = () => {
    setEditingSlot(null);
    setFormDay(1);
    setFormStart('09:00');
    setFormEnd('12:00');
    setFormModalities(['in_person', 'video', 'phone']);
    setFormBlocked(false);
    setFormLabel('');
    setDialogOpen(true);
  };

  const openEdit = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormDay(slot.dayOfWeek);
    setFormStart(slot.startTime);
    setFormEnd(slot.endTime);
    setFormModalities(slot.modality);
    setFormBlocked(slot.isBlocked || false);
    setFormLabel(slot.label || '');
    setDialogOpen(true);
  };

  const handleSave = () => {
    const slot: TimeSlot = {
      id: editingSlot?.id || `avail-${Date.now()}`,
      dayOfWeek: formDay,
      startTime: formStart,
      endTime: formEnd,
      modality: formBlocked ? [] : formModalities,
      isRecurring: true,
      isBlocked: formBlocked,
      label: formLabel || undefined,
    };

    if (editingSlot) {
      onChange(availability.map(s => s.id === editingSlot.id ? slot : s));
    } else {
      onChange([...availability, slot]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    onChange(availability.filter(s => s.id !== id));
  };

  // Group by day of week
  const byDay: Record<number, TimeSlot[]> = {};
  availability.filter(s => s.isRecurring).forEach(s => {
    if (!byDay[s.dayOfWeek]) byDay[s.dayOfWeek] = [];
    byDay[s.dayOfWeek].push(s);
  });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Availability</Typography>
          <Typography variant="body2" color="text.secondary">Manage your recurring weekly schedule</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Add />} onClick={openNew} sx={{ borderRadius: 2, textTransform: 'none' }}>
          Add Slot
        </Button>
      </Stack>

      <Stack spacing={1.5}>
        {[1, 2, 3, 4, 5, 6, 0].map(day => {
          const slots = byDay[day] || [];
          const isWeekday = day >= 1 && day <= 5;

          return (
            <Card key={day} variant="outlined" sx={{ borderRadius: 2, opacity: slots.length === 0 && !isWeekday ? 0.5 : 1 }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, minWidth: 80 }}>
                    {SHORT_DAYS[day]}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
                    {slots.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Not available
                      </Typography>
                    ) : (
                      slots
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map(slot => (
                          <Chip
                            key={slot.id}
                            label={
                              slot.isBlocked
                                ? `${slot.label || 'Blocked'} (${formatTime12(slot.startTime)}–${formatTime12(slot.endTime)})`
                                : `${formatTime12(slot.startTime)}–${formatTime12(slot.endTime)}`
                            }
                            size="small"
                            icon={slot.isBlocked ? <Block sx={{ fontSize: 14 }} /> : <CheckCircle sx={{ fontSize: 14 }} />}
                            color={slot.isBlocked ? 'default' : 'success'}
                            variant="outlined"
                            onDelete={() => handleDelete(slot.id)}
                            onClick={() => openEdit(slot)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Day</InputLabel>
              <Select value={formDay} label="Day" onChange={e => setFormDay(Number(e.target.value))}>
                {DAY_LABELS.map((label, i) => <MenuItem key={i} value={i}>{label}</MenuItem>)}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <TextField size="small" type="time" label="Start" value={formStart} onChange={e => setFormStart(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField size="small" type="time" label="End" value={formEnd} onChange={e => setFormEnd(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            </Stack>

            <Divider />

            <FormControlLabel
              control={<Switch checked={formBlocked} onChange={e => setFormBlocked(e.target.checked)} />}
              label={<Typography variant="body2">Block this time (unavailable)</Typography>}
            />

            {formBlocked && (
              <TextField size="small" label="Block reason" value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="e.g. Lunch, Admin time, Supervision..." />
            )}

            {!formBlocked && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Available modalities</Typography>
                <FormGroup row>
                  {MODALITIES.map(m => (
                    <FormControlLabel
                      key={m.value}
                      control={
                        <Checkbox
                          size="small"
                          checked={formModalities.includes(m.value)}
                          onChange={e => {
                            if (e.target.checked) setFormModalities([...formModalities, m.value]);
                            else setFormModalities(formModalities.filter(v => v !== m.value));
                          }}
                        />
                      }
                      label={<Typography variant="body2">{m.label}</Typography>}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ borderRadius: 2, fontWeight: 600 }}>
            {editingSlot ? 'Save' : 'Add Slot'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AvailabilityPanel;
