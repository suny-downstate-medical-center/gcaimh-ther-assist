import React, { useEffect, useState } from 'react';
import { Box, Typography, Skeleton, Alert, Chip, Card, CardContent, Stack } from '@mui/material';
import {
  MenuBook, FitnessCenter, Publish, VisibilityOff, CheckCircle, Archive,
} from '@mui/icons-material';
import { useTherapistBridge } from '../../../../contexts/TherapistClientBridgeContext';
import { ActivityEvent, ActivityEventType } from '../../../../types/therapistClientBridge';
import EmptyState from '../shared/EmptyState';
import { History } from '@mui/icons-material';

interface ActivityPanelProps {
  clientId: string;
  refreshKey: number;
}

const EVENT_META: Record<ActivityEventType, { icon: React.ReactElement; color: string; label: string }> = {
  HOMEWORK_ASSIGNED:    { icon: <MenuBook sx={{ fontSize: 20 }} />,      color: '#0b57d0', label: 'Homework assigned' },
  HOMEWORK_COMPLETED:   { icon: <CheckCircle sx={{ fontSize: 20 }} />,   color: '#128937', label: 'Homework completed' },
  HOMEWORK_ARCHIVED:    { icon: <Archive sx={{ fontSize: 20 }} />,       color: '#5f6368', label: 'Homework archived' },
  HOMEWORK_RESCHEDULED: { icon: <MenuBook sx={{ fontSize: 20 }} />,      color: '#f59e0b', label: 'Homework rescheduled' },
  INTERVENTION_ASSIGNED:{ icon: <FitnessCenter sx={{ fontSize: 20 }} />, color: '#6750a4', label: 'Tool assigned' },
  INTERVENTION_ARCHIVED:{ icon: <Archive sx={{ fontSize: 20 }} />,       color: '#5f6368', label: 'Tool archived' },
  SUMMARY_PUBLISHED:    { icon: <Publish sx={{ fontSize: 20 }} />,       color: '#128937', label: 'Summary published' },
  SUMMARY_UNPUBLISHED:  { icon: <VisibilityOff sx={{ fontSize: 20 }} />, color: '#b3261e', label: 'Summary unpublished' },
  MODULE_SENT:              { icon: <MenuBook sx={{ fontSize: 20 }} />,      color: '#00639b', label: 'Module sent' },
  QUESTIONNAIRE_ASSIGNED:   { icon: <MenuBook sx={{ fontSize: 20 }} />,      color: '#0b57d0', label: 'Questionnaire assigned' },
  QUESTIONNAIRE_PAUSED:     { icon: <Archive sx={{ fontSize: 20 }} />,       color: '#f59e0b', label: 'Questionnaire paused' },
  QUESTIONNAIRE_REMOVED:    { icon: <Archive sx={{ fontSize: 20 }} />,       color: '#b3261e', label: 'Questionnaire removed' },
  QUESTIONNAIRE_COMPLETED:  { icon: <CheckCircle sx={{ fontSize: 20 }} />,   color: '#128937', label: 'Questionnaire completed' },
};

function formatTs(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ActivityPanel: React.FC<ActivityPanelProps> = ({ clientId, refreshKey }) => {
  const bridge = useTherapistBridge();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    bridge.listActivityEvents(clientId)
      .then(setEvents)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId, refreshKey]);

  if (loading) return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" height={72} />)}</Box>;
  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>Could not load activity: {error}</Alert>;
  if (events.length === 0) return <EmptyState icon={<History />} title="No activity yet" description="Actions taken in the client portal will be logged here." />;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <History color="action" />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Activity Timeline</Typography>
      </Stack>
      <Stack spacing={0}>
        {events.map((evt, i) => {
          const meta = EVENT_META[evt.type] ?? EVENT_META.HOMEWORK_ASSIGNED;
          const isLast = i === events.length - 1;
          return (
            <Box key={evt.id} sx={{ display: 'flex', gap: 2 }}>
              {/* Timeline line */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 40 }}>
                <Box sx={{
                  width: 40, height: 40, borderRadius: '50%', bgcolor: `${meta.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: meta.color, flexShrink: 0,
                }}>
                  {meta.icon}
                </Box>
                {!isLast && <Box sx={{ width: 2, flex: 1, bgcolor: '#e0e3e7', my: 0.5 }} />}
              </Box>
              {/* Content */}
              <Box sx={{ flex: 1, pb: isLast ? 0 : 2.5, pt: 0.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {evt.description}
                  </Typography>
                  <Chip
                    label={evt.actor}
                    size="small"
                    variant="outlined"
                    sx={{ color: evt.actor === 'therapist' ? '#0b57d0' : '#128937', borderColor: evt.actor === 'therapist' ? '#0b57d0' : '#128937' }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{formatTs(evt.timestamp)}</Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default ActivityPanel;
