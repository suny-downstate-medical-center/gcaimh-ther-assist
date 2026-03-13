import React from 'react';
import {
  Box, Typography, Stack, Card, CardContent, IconButton, Chip, Tooltip,
} from '@mui/material';
import { Add, Videocam, Phone, LocationOn, Assignment, Flag } from '@mui/icons-material';
import { Appointment, getTypeMeta, getStatusMeta } from './types';
import { formatDateISO, formatTime12, isToday } from './schedulingUtils';

interface Props {
  weekDays: Date[];
  appointments: Appointment[];
  onClickAppointment: (appt: Appointment) => void;
  onAddAppointment: (date: string, time?: string) => void;
  selectedDayDate?: string;
  onSelectDay?: (date: string) => void;
}

const HOUR_START = 8;
const HOUR_END = 18;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

const ModalityIconSmall: React.FC<{ modality: string }> = ({ modality }) => {
  switch (modality) {
    case 'video': return <Videocam sx={{ fontSize: 12 }} />;
    case 'phone': return <Phone sx={{ fontSize: 12 }} />;
    default: return <LocationOn sx={{ fontSize: 12 }} />;
  }
};

const SchedulingCalendar: React.FC<Props> = ({
  weekDays, appointments, onClickAppointment, onAddAppointment, selectedDayDate, onSelectDay,
}) => {
  const todayStr = formatDateISO(new Date());

  return (
    <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {/* Day headers */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '56px repeat(7, 1fr)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Box sx={{ p: 1 }} /> {/* time gutter */}
        {weekDays.map(day => {
          const dateStr = formatDateISO(day);
          const today = isToday(dateStr);
          const isSelected = selectedDayDate === dateStr;
          return (
            <Box
              key={dateStr}
              onClick={() => onSelectDay?.(dateStr)}
              sx={{
                p: 1.5, textAlign: 'center', cursor: 'pointer',
                borderLeft: '1px solid', borderColor: 'divider',
                bgcolor: today ? 'primary.main' : isSelected ? 'action.selected' : undefined,
                color: today ? 'common.white' : undefined,
                transition: 'background-color 0.2s',
                '&:hover': !today ? { bgcolor: 'action.hover' } : {},
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 10, opacity: 0.7 }}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: today ? 800 : 600, lineHeight: 1.2, fontSize: 18 }}>
                {day.getDate()}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Time grid */}
      <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
        {HOURS.map(hour => (
          <Box
            key={hour}
            sx={{
              display: 'grid',
              gridTemplateColumns: '56px repeat(7, 1fr)',
              minHeight: 64,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            {/* Time label */}
            <Box sx={{ p: 0.5, pr: 1, textAlign: 'right', borderRight: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, fontWeight: 500 }}>
                {formatTime12(`${hour.toString().padStart(2, '0')}:00`)}
              </Typography>
            </Box>

            {/* Day columns */}
            {weekDays.map(day => {
              const dateStr = formatDateISO(day);
              const dayAppts = appointments.filter(a => {
                if (a.date !== dateStr) return false;
                const h = parseInt(a.startTime.split(':')[0], 10);
                return h === hour;
              });

              return (
                <Box
                  key={`${dateStr}-${hour}`}
                  sx={{
                    borderLeft: '1px solid', borderColor: 'grey.100',
                    p: 0.5, position: 'relative',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'grey.50' },
                    '&:hover .add-btn': { opacity: 1 },
                  }}
                  onDoubleClick={() => onAddAppointment(dateStr, `${hour.toString().padStart(2, '0')}:00`)}
                >
                  {/* Add button on hover */}
                  <IconButton
                    className="add-btn"
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onAddAppointment(dateStr, `${hour.toString().padStart(2, '0')}:00`); }}
                    sx={{
                      position: 'absolute', top: 2, right: 2, opacity: 0,
                      transition: 'opacity 0.2s', width: 20, height: 20,
                      bgcolor: 'primary.main', color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                  >
                    <Add sx={{ fontSize: 14 }} />
                  </IconButton>

                  {/* Appointment cards */}
                  <Stack spacing={0.5}>
                    {dayAppts.map(appt => {
                      const typeMeta = getTypeMeta(appt.appointmentType);
                      const statusMeta = getStatusMeta(appt.status);
                      const isCanceled = appt.status === 'canceled' || appt.status === 'no_show';

                      return (
                        <Tooltip
                          key={appt.id}
                          title={`${appt.patientName} · ${typeMeta.label} · ${formatTime12(appt.startTime)}–${formatTime12(appt.endTime)}`}
                          arrow
                          placement="top"
                        >
                          <Box
                            onClick={(e) => { e.stopPropagation(); onClickAppointment(appt); }}
                            sx={{
                              p: 0.75,
                              borderRadius: 1,
                              bgcolor: isCanceled ? 'grey.100' : `${typeMeta.color}10`,
                              borderLeft: 3,
                              borderColor: isCanceled ? 'grey.400' : typeMeta.color,
                              cursor: 'pointer',
                              opacity: isCanceled ? 0.5 : 1,
                              textDecoration: isCanceled ? 'line-through' : 'none',
                              transition: 'all 0.2s',
                              '&:hover': { bgcolor: isCanceled ? 'grey.200' : `${typeMeta.color}20`, transform: 'scale(1.02)' },
                            }}
                          >
                            <Stack direction="row" spacing={0.5} alignItems="center" mb={0.25}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: typeMeta.color, fontSize: 10 }}>
                                {formatTime12(appt.startTime)}
                              </Typography>
                              <ModalityIconSmall modality={appt.modality} />
                              {appt.homeworkReviewNeeded && <Assignment sx={{ fontSize: 11, color: '#92400e' }} />}
                              {appt.preMeasureRequired && <Flag sx={{ fontSize: 11, color: '#3730a3' }} />}
                            </Stack>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', display: 'block', lineHeight: 1.2, fontSize: 11 }}>
                              {appt.patientName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                              {typeMeta.shortLabel} · {appt.durationMinutes}m
                            </Typography>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Card>
  );
};

export default SchedulingCalendar;
