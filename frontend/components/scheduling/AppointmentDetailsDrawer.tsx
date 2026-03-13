import React, { useState } from 'react';
import {
  Drawer, Box, Typography, Stack, Chip, Button, IconButton, Divider, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Close, Edit, EventBusy, CheckCircle, Replay, PlayArrow, CalendarToday, AccessTime,
  LocationOn, Videocam, Phone, Person, Notes, Assignment, Flag, NotificationsActive,
} from '@mui/icons-material';
import { Appointment, getTypeMeta, getStatusMeta, getModalityMeta } from './types';
import { formatTime12, formatFullDate } from './schedulingUtils';

interface Props {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
  onEdit: (appt: Appointment) => void;
  onCancel: (id: string, reason?: string) => void;
  onConfirm: (id: string) => void;
  onComplete: (id: string) => void;
  onReschedule: (appt: Appointment) => void;
  onStartSession?: (patientId: string) => void;
}

const ModalityIcon: React.FC<{ modality: string }> = ({ modality }) => {
  switch (modality) {
    case 'video': return <Videocam fontSize="small" />;
    case 'phone': return <Phone fontSize="small" />;
    default: return <LocationOn fontSize="small" />;
  }
};

const AppointmentDetailsDrawer: React.FC<Props> = ({
  appointment: appt, open, onClose, onEdit, onCancel, onConfirm, onComplete, onReschedule, onStartSession,
}) => {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!appt) return null;

  const typeMeta = getTypeMeta(appt.appointmentType);
  const statusMeta = getStatusMeta(appt.status);
  const modalityMeta = getModalityMeta(appt.modality);

  const isActionable = ['confirmed', 'pending_confirmation', 'requested', 'reschedule_requested'].includes(appt.status);
  const canStart = appt.status === 'confirmed' && onStartSession;

  const handleCancelConfirm = () => {
    onCancel(appt.id, cancelReason || undefined);
    setCancelReason('');
    setCancelDialogOpen(false);
  };

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, p: 0 } }}>
        {/* Header */}
        <Box sx={{ p: 3, background: `linear-gradient(135deg, ${typeMeta.color}12 0%, ${typeMeta.color}06 100%)`, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="overline" sx={{ color: typeMeta.color, fontWeight: 700, letterSpacing: 1 }}>
                {typeMeta.label}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                {appt.patientName}
              </Typography>
            </Box>
            <IconButton onClick={onClose}><Close /></IconButton>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={statusMeta.label}
              size="small"
              sx={{ bgcolor: statusMeta.bgColor, color: statusMeta.textColor, fontWeight: 600 }}
            />
            {appt.recurrence !== 'none' && (
              <Chip label={appt.recurrence} size="small" variant="outlined" icon={<Replay sx={{ fontSize: 16 }} />} />
            )}
            {appt.homeworkReviewNeeded && (
              <Chip label="HW Review" size="small" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 500 }} icon={<Assignment sx={{ fontSize: 16 }} />} />
            )}
            {appt.preMeasureRequired && (
              <Chip label="Pre-measure" size="small" sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 500 }} icon={<Flag sx={{ fontSize: 16 }} />} />
            )}
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
          <Stack spacing={3}>
            {/* Date & Time */}
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CalendarToday fontSize="small" color="action" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {formatFullDate(appt.date)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <AccessTime fontSize="small" color="action" />
                <Typography variant="body1">
                  {formatTime12(appt.startTime)} – {formatTime12(appt.endTime)} ({appt.durationMinutes} min)
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ModalityIcon modality={appt.modality} />
                <Typography variant="body1">{modalityMeta.label}</Typography>
                {appt.locationOrJoinLink && (
                  <Typography
                    variant="body2"
                    component="a"
                    href={appt.locationOrJoinLink}
                    target="_blank"
                    sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    Join link
                  </Typography>
                )}
              </Stack>
            </Stack>

            <Divider />

            {/* Reminder / Confirmation */}
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                Reminder & Confirmation
              </Typography>
              <Stack direction="row" spacing={2}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <NotificationsActive fontSize="small" color={appt.reminderState === 'confirmed' ? 'success' : appt.reminderState === 'sent' ? 'warning' : 'disabled'} />
                  <Typography variant="body2" color="text.secondary">
                    Reminder: {appt.reminderState.replace('_', ' ')}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <CheckCircle fontSize="small" color={appt.confirmationState === 'confirmed' ? 'success' : 'disabled'} />
                  <Typography variant="body2" color="text.secondary">
                    Patient: {appt.confirmationState}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>

            <Divider />

            {/* Notes */}
            {(appt.notes || appt.prepNotes) && (
              <>
                <Stack spacing={1.5}>
                  {appt.notes && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, letterSpacing: 1, mb: 0.5 }}>
                        Session Notes
                      </Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{appt.notes}</Typography>
                    </Box>
                  )}
                  {appt.prepNotes && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, letterSpacing: 1, mb: 0.5 }}>
                        Preparation Notes
                      </Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'warning.dark' }}>{appt.prepNotes}</Typography>
                    </Box>
                  )}
                </Stack>
                <Divider />
              </>
            )}

            {/* Cancellation reason */}
            {appt.cancellationReason && (
              <>
                <Box>
                  <Typography variant="subtitle2" color="error" sx={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, letterSpacing: 1, mb: 0.5 }}>
                    Cancellation Reason
                  </Typography>
                  <Typography variant="body2">{appt.cancellationReason}</Typography>
                </Box>
                <Divider />
              </>
            )}

            {/* Continuity flags */}
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                Session Continuity
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={appt.homeworkReviewNeeded ? 'Homework review needed' : 'No homework pending'}
                  size="small"
                  variant="outlined"
                  color={appt.homeworkReviewNeeded ? 'warning' : 'default'}
                />
                <Chip
                  label={appt.preMeasureRequired ? 'Pre-session measure required' : 'No pre-measure'}
                  size="small"
                  variant="outlined"
                  color={appt.preMeasureRequired ? 'info' : 'default'}
                />
                <Chip
                  label={appt.sendPostSessionResources ? 'Send post-session resources' : 'Standard follow-up'}
                  size="small"
                  variant="outlined"
                  color={appt.sendPostSessionResources ? 'success' : 'default'}
                />
              </Stack>
            </Stack>
          </Stack>
        </Box>

        {/* Actions footer */}
        {isActionable && (
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
              {canStart && (
                <Button variant="contained" startIcon={<PlayArrow />} onClick={() => onStartSession!(appt.patientId)}
                  sx={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', fontWeight: 600, borderRadius: 2 }}>
                  Start Session
                </Button>
              )}
              {appt.status === 'requested' && (
                <Button variant="contained" startIcon={<CheckCircle />} onClick={() => onConfirm(appt.id)}
                  sx={{ background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)', fontWeight: 600, borderRadius: 2 }}>
                  Confirm
                </Button>
              )}
              {appt.status === 'pending_confirmation' && (
                <Button variant="outlined" color="success" startIcon={<CheckCircle />} onClick={() => onConfirm(appt.id)} sx={{ borderRadius: 2 }}>
                  Mark Confirmed
                </Button>
              )}
              <Button variant="outlined" startIcon={<Edit />} onClick={() => onEdit(appt)} sx={{ borderRadius: 2 }}>
                Edit
              </Button>
              <Button variant="outlined" startIcon={<Replay />} onClick={() => onReschedule(appt)} sx={{ borderRadius: 2 }}>
                Reschedule
              </Button>
              <Button variant="outlined" color="error" startIcon={<EventBusy />} onClick={() => setCancelDialogOpen(true)} sx={{ borderRadius: 2 }}>
                Cancel
              </Button>
            </Stack>
          </Box>
        )}
        {appt.status === 'confirmed' && (
          <Box sx={{ px: 2, pb: 2 }}>
            <Button fullWidth variant="text" color="success" startIcon={<CheckCircle />} onClick={() => onComplete(appt.id)} sx={{ borderRadius: 2 }}>
              Mark Completed
            </Button>
          </Box>
        )}
      </Drawer>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Cancel Appointment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cancel appointment with <strong>{appt.patientName}</strong> on {formatFullDate(appt.date)} at {formatTime12(appt.startTime)}?
          </Typography>
          <TextField
            fullWidth size="small" multiline rows={2}
            label="Reason (optional)"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="e.g. Patient requested cancellation, therapist unavailable..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelDialogOpen(false)} sx={{ borderRadius: 2 }}>Keep</Button>
          <Button variant="contained" color="error" onClick={handleCancelConfirm} sx={{ borderRadius: 2 }}>Cancel Appointment</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AppointmentDetailsDrawer;
