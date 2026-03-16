import React from 'react';
import {
  Box, Typography, Stack, Card, CardContent, Chip, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button,
} from '@mui/material';
import {
  Edit, EventBusy, CheckCircle, PlayArrow, Visibility, Videocam, Phone, LocationOn,
  EventAvailable,
} from '@mui/icons-material';
import { Appointment, getTypeMeta, getStatusMeta, getModalityMeta } from './types';
import { formatTime12, formatDisplayDate, isToday } from './schedulingUtils';

interface Props {
  appointments: Appointment[];
  onClickAppointment: (appt: Appointment) => void;
  onEdit: (appt: Appointment) => void;
  onCancel: (id: string) => void;
  onConfirm: (id: string) => void;
  onComplete: (id: string) => void;
  onStartSession?: (patientId: string) => void;
  onPatientClick?: (patientId: string) => void;
  onAddAppointment: () => void;
}

const ModalityChip: React.FC<{ modality: string }> = ({ modality }) => {
  const meta = getModalityMeta(modality as any);
  const icons: Record<string, React.ReactNode> = {
    in_person: <LocationOn sx={{ fontSize: 14 }} />,
    video: <Videocam sx={{ fontSize: 14 }} />,
    phone: <Phone sx={{ fontSize: 14 }} />,
  };
  return (
    <Chip label={meta.label} size="small" variant="outlined" icon={icons[modality] as any} sx={{ height: 24 }} />
  );
};

const AppointmentsTable: React.FC<Props> = ({
  appointments, onClickAppointment, onEdit, onCancel, onConfirm, onComplete,
  onStartSession, onPatientClick, onAddAppointment,
}) => {
  if (appointments.length === 0) {
    return (
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <EventAvailable sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
            No appointments found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
            No appointments match your current filters. Try adjusting filters or schedule a new appointment.
          </Typography>
          <Button variant="contained" onClick={onAddAppointment}
            sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)', fontWeight: 600 }}>
            Schedule Appointment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Patient</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Duration</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mode</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appointments.map(appt => {
              const typeMeta = getTypeMeta(appt.appointmentType);
              const statusMeta = getStatusMeta(appt.status);
              const isCanceled = appt.status === 'canceled' || appt.status === 'no_show';
              const isActionable = ['confirmed', 'pending_confirmation', 'requested', 'reschedule_requested'].includes(appt.status);
              const today = isToday(appt.date);

              return (
                <TableRow
                  key={appt.id}
                  hover
                  onClick={() => onClickAppointment(appt)}
                  sx={{
                    cursor: 'pointer',
                    opacity: isCanceled ? 0.55 : 1,
                    bgcolor: today ? 'rgba(11, 87, 208, 0.03)' : undefined,
                    '&:hover': { bgcolor: today ? 'rgba(11, 87, 208, 0.06)' : undefined },
                  }}
                >
                  {/* Patient */}
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            cursor: onPatientClick ? 'pointer' : 'default',
                            '&:hover': onPatientClick ? { color: 'primary.main' } : {},
                          }}
                          onClick={(e) => { if (onPatientClick) { e.stopPropagation(); onPatientClick(appt.patientId); } }}
                        >
                          {appt.patientName}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {appt.homeworkReviewNeeded && (
                            <Chip label="HW" size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#fef3c7', color: '#92400e' }} />
                          )}
                          {appt.preMeasureRequired && (
                            <Chip label="Measure" size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#e0e7ff', color: '#3730a3' }} />
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Chip
                      label={typeMeta.shortLabel}
                      size="small"
                      sx={{ bgcolor: `${typeMeta.color}14`, color: typeMeta.color, fontWeight: 600, height: 24 }}
                    />
                  </TableCell>

                  {/* Date */}
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: today ? 700 : 400 }}>
                        {formatDisplayDate(appt.date)}
                      </Typography>
                      {today && <Chip label="Today" size="small" color="primary" sx={{ height: 20, fontSize: 10 }} />}
                    </Stack>
                  </TableCell>

                  {/* Time */}
                  <TableCell>
                    <Typography variant="body2">{formatTime12(appt.startTime)}</Typography>
                  </TableCell>

                  {/* Duration */}
                  <TableCell>
                    <Typography variant="body2">{appt.durationMinutes} min</Typography>
                  </TableCell>

                  {/* Modality */}
                  <TableCell>
                    <ModalityChip modality={appt.modality} />
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Chip
                      label={statusMeta.label}
                      size="small"
                      sx={{ bgcolor: statusMeta.bgColor, color: statusMeta.textColor, fontWeight: 600, height: 24 }}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right" onClick={e => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                      {isActionable && appt.status === 'confirmed' && today && onStartSession && (
                        <IconButton size="small" onClick={() => onStartSession(appt.patientId)} sx={{ color: 'success.main' }}>
                          <PlayArrow fontSize="small" />
                        </IconButton>
                      )}
                      {appt.status === 'requested' && (
                        <IconButton size="small" onClick={() => onConfirm(appt.id)} sx={{ color: 'success.main' }}>
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      )}
                      {isActionable && (
                        <>
                          <IconButton size="small" onClick={() => onEdit(appt)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => onCancel(appt.id)} sx={{ color: 'error.main' }}>
                            <EventBusy fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      <IconButton size="small" onClick={() => onClickAppointment(appt)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

export default AppointmentsTable;
