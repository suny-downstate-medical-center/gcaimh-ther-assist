import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, Card, CardContent, Skeleton, Alert, Stack,
} from '@mui/material';
import { Warning } from '@mui/icons-material';
import { useTherapistBridge } from '../../../../contexts/TherapistClientBridgeContext';
import { OutcomeOverview, OutcomeTrendEntry } from '../../../../types/therapistClientBridge';
import EmptyState from '../shared/EmptyState';
import { Assessment } from '@mui/icons-material';

interface OutcomesPanelProps {
  clientId: string;
}

const MEASURE_COLORS: Record<string, string> = {
  'phq9': '#0b57d0',
  'gad7': '#f59e0b',
  'panic-severity': '#10b981',
};

const CHIP_COLOR: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  success: 'success', info: 'info', warning: 'warning', error: 'error',
};

function formatWeek(iso: string) {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TrendSection({ measureId, shortName, rows }: { measureId: string; shortName: string; rows: OutcomeTrendEntry[] }) {
  const color = MEASURE_COLORS[measureId] ?? '#5f6368';
  const latest = rows[rows.length - 1];
  const first = rows[0];
  const delta = latest && first ? latest.score - first.score : 0;

  return (
    <Card
      sx={{
        borderLeft: 4,
        borderColor: color,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{shortName}</Typography>
          {latest && (
            <Chip
              label={latest.severity}
              size="small"
              color={CHIP_COLOR[latest.severityColor]}
            />
          )}
          {delta !== 0 && (
            <Typography variant="body2" sx={{ color: delta < 0 ? '#128937' : '#b3261e', fontWeight: 600 }}>
              {delta < 0 ? `↓ ${Math.abs(delta)} since start` : `↑ ${delta} since start`}
            </Typography>
          )}
        </Stack>
        {/* Score sparkline as simple row of badges */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {rows.map((r, i) => (
            <Box key={i} sx={{ textAlign: 'center' }}>
              <Box sx={{
                width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: i === rows.length - 1 ? color : `${color}18`,
                color: i === rows.length - 1 ? 'white' : color,
                fontSize: '14px', fontWeight: 700,
              }}>
                {r.score}
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>{formatWeek(r.weekOf)}</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

const OutcomesPanel: React.FC<OutcomesPanelProps> = ({ clientId }) => {
  const bridge = useTherapistBridge();
  const [overview, setOverview] = useState<OutcomeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    bridge.getClientPortalOverview(clientId)
      .then(o => setOverview(o.outcomeOverview))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={80} />)}
    </Box>
  );
  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>Could not load outcomes: {error}</Alert>;
  if (!overview) return null;

  // Group trend by measureId
  const measureIds = [...new Set(overview.trend.map(t => t.measureId))];
  const grouped: Record<string, OutcomeTrendEntry[]> = {};
  measureIds.forEach(id => {
    grouped[id] = overview.trend.filter(t => t.measureId === id).sort((a, b) => a.weekOf.localeCompare(b.weekOf));
  });

  const hasTrend = overview.trend.length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Safety flag */}
      {overview.safetyFlag && (
        <Alert
          severity="error"
          icon={<Warning />}
          sx={{ borderRadius: 2, border: '1px solid #f4b8b8' }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>Safety follow-up needed (PHQ-9 item 9)</Typography>
          <Typography variant="body2">{overview.safetyFlagReason}</Typography>
        </Alert>
      )}

      {/* Schedule */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Check-in Schedule</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} flexWrap="wrap">
            <Box>
              <Typography variant="body2" color="text.secondary">Cadence</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>Weekly</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Last completed</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {overview.lastCompletedWeek ? formatWeek(overview.lastCompletedWeek) : '—'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Next due</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatWeek(overview.nextDueWeek)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Measures</Typography>
              <Stack direction="row" spacing={0.5} mt={0.5}>
                {measureIds.map(id => (
                  <Chip key={id} label={grouped[id][0]?.measureShortName ?? id} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Trends */}
      {!hasTrend ? (
        <EmptyState icon={<Assessment />} title="No check-in data yet" description="Outcome scores will appear here once the client completes their first weekly check-in." />
      ) : (
        <Stack spacing={2}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            7-Week Trend
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              (highlighted = most recent)
            </Typography>
          </Typography>
          {measureIds.map(id => (
            <TrendSection key={id} measureId={id} shortName={grouped[id][0]?.measureShortName ?? id} rows={grouped[id]} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default OutcomesPanel;
