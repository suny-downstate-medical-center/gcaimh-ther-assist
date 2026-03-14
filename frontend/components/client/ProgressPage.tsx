import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarTodayIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import {
  OutcomeMeasure,
  OutcomeResponse,
  OutcomeSchedule,
  OutcomeThreshold,
} from '../../types/clientPortal';

const MEASURE_COLORS: Record<string, string> = {
  phq9: '#0b57d0',
  gad7: '#f59e0b',
  'panic-severity': '#10b981',
};

const getCurrentWeekMonday = (): string => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
};

const formatWeekLabel = (isoDate: string): string => {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getThreshold = (measure: OutcomeMeasure, score: number): OutcomeThreshold => {
  return (
    measure.thresholds.find((t) => score >= t.min && score <= t.max) ||
    measure.thresholds[measure.thresholds.length - 1]
  );
};

const computeScore = (measure: OutcomeMeasure, responses: number[]): number => {
  const sum = responses.reduce((a, b) => a + b, 0);
  if (measure.scoring === 'sum') return sum;
  return Math.round((sum / responses.length) * 10) / 10;
};

interface ProgressPageProps {
  onNavigateBack: () => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({ onNavigateBack }) => {
  const portal = useClientPortal();

  const [measures, setMeasures] = useState<OutcomeMeasure[]>([]);
  const [schedule, setSchedule] = useState<OutcomeSchedule | null>(null);
  const [responsesByMeasure, setResponsesByMeasure] = useState<Record<string, OutcomeResponse[]>>({});
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMeasureIdx, setDialogMeasureIdx] = useState(0);
  const [dialogStep, setDialogStep] = useState<'fill' | 'result'>('fill');
  const [formAnswers, setFormAnswers] = useState<number[]>([]);
  const [lastResult, setLastResult] = useState<{ score: number; measureId: string } | null>(null);
  // track what was submitted in this browser session (before page reload)
  const [sessionSubmitted, setSessionSubmitted] = useState<string[]>([]);

  const currentWeek = getCurrentWeekMonday();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [measuresData, scheduleData] = await Promise.all([
        portal.listOutcomeMeasures(),
        portal.getOutcomeSchedule(),
      ]);
      setMeasures(measuresData);
      setSchedule(scheduleData);

      const byMeasure: Record<string, OutcomeResponse[]> = {};
      await Promise.all(
        measuresData.map(async (m) => {
          byMeasure[m.id] = await portal.listOutcomeResponses(m.id, 12);
        })
      );
      setResponsesByMeasure(byMeasure);
    } finally {
      setLoading(false);
    }
  }, [portal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isCompletedThisWeek = (measureId: string): boolean => {
    if (sessionSubmitted.includes(measureId)) return true;
    const responses = responsesByMeasure[measureId] || [];
    return responses.some((r) => r.weekOf === currentWeek);
  };

  const pendingMeasures = measures.filter((m) => !isCompletedThisWeek(m.id));
  const allDoneThisWeek = pendingMeasures.length === 0 && measures.length > 0;

  const openCheckIn = (measureId?: string) => {
    const startIdx = measureId
      ? measures.findIndex((m) => m.id === measureId)
      : measures.findIndex((m) => !isCompletedThisWeek(m.id));
    if (startIdx === -1) return;
    setDialogMeasureIdx(startIdx);
    setDialogStep('fill');
    setFormAnswers(new Array(measures[startIdx].items.length).fill(-1));
    setLastResult(null);
    setDialogOpen(true);
  };

  const activeMeasure = measures[dialogMeasureIdx];

  const handleAnswer = (itemIdx: number, value: number) => {
    setFormAnswers((prev) => {
      const next = [...prev];
      next[itemIdx] = value;
      return next;
    });
  };

  const canSubmit = formAnswers.length > 0 && formAnswers.every((v) => v >= 0);

  const handleSubmit = async () => {
    if (!activeMeasure || !canSubmit) return;
    const score = computeScore(activeMeasure, formAnswers);
    const newResponse = await portal.submitOutcomeResponse({
      measureId: activeMeasure.id,
      weekOf: currentWeek,
      responses: formAnswers,
      score,
    });
    setResponsesByMeasure((prev) => ({
      ...prev,
      [activeMeasure.id]: [...(prev[activeMeasure.id] || []), newResponse],
    }));
    setSessionSubmitted((prev) => [...prev, activeMeasure.id]);
    setLastResult({ score, measureId: activeMeasure.id });
    setDialogStep('result');
  };

  const handleNextMeasure = () => {
    const nextIdx = measures.findIndex(
      (m, i) => i > dialogMeasureIdx && !isCompletedThisWeek(m.id)
    );
    if (nextIdx !== -1) {
      setDialogMeasureIdx(nextIdx);
      setDialogStep('fill');
      setFormAnswers(new Array(measures[nextIdx].items.length).fill(-1));
      setLastResult(null);
    } else {
      setDialogOpen(false);
    }
  };

  // PHQ-9 item 9 (index 8) safety check
  const showSafetyAlert =
    activeMeasure?.id === 'phq9' &&
    dialogStep === 'result' &&
    formAnswers[8] > 0;

  // Build chart data per measure
  const getChartData = (measureId: string) =>
    [...(responsesByMeasure[measureId] || [])]
      .sort((a, b) => a.weekOf.localeCompare(b.weekOf))
      .map((r) => ({ week: formatWeekLabel(r.weekOf), score: r.score }));

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
        <IconButton onClick={onNavigateBack} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Progress &amp; Check-ins
        </Typography>
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ ml: 5, mb: 4 }}>
        Weekly check-ins help you and your therapist track how you're feeling over time.
      </Typography>

      {/* ── This Week ── */}
      <Card
        sx={{
          mb: 4,
          borderLeft: 4,
          borderColor: allDoneThisWeek ? 'success.main' : 'warning.main',
        }}
      >
        <CardContent>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={2}
            mb={2}
          >
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                <CalendarTodayIcon
                  color={allDoneThisWeek ? 'success' : 'warning'}
                  fontSize="small"
                />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  This Week's Check-in
                </Typography>
                <Chip
                  label={allDoneThisWeek ? 'All done ✓' : 'Due'}
                  color={allDoneThisWeek ? 'success' : 'warning'}
                  size="small"
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Week of {formatWeekLabel(currentWeek)}
              </Typography>
            </Box>
            {!allDoneThisWeek && (
              <Button
                variant="contained"
                onClick={() => openCheckIn()}
                startIcon={<PlayArrowIcon />}
              >
                Start Check-in
              </Button>
            )}
          </Stack>

          {/* Per-measure status row */}
          <Grid container spacing={2}>
            {measures.map((measure) => {
              const done = isCompletedThisWeek(measure.id);
              const thisWeekResponse = [...(responsesByMeasure[measure.id] || [])]
                .filter((r) => r.weekOf === currentWeek)
                .sort((a, b) => (b.createdAt ?? b.completedAt ?? '').localeCompare(a.createdAt ?? a.completedAt ?? ''))[0];
              const threshold = thisWeekResponse
                ? getThreshold(measure, thisWeekResponse.score)
                : null;
              return (
                <Grid item xs={12} sm={4} key={measure.id}>
                  <Card
                    variant="outlined"
                    sx={{ p: 1.5, bgcolor: done ? 'grey.50' : 'background.paper' }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {measure.shortName}
                        </Typography>
                        {done && thisWeekResponse ? (
                          <Stack direction="row" alignItems="baseline" spacing={0.5} mt={0.5}>
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                              {thisWeekResponse.score}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              / {measure.maxScore}
                            </Typography>
                            {threshold && (
                              <Chip
                                label={threshold.label}
                                size="small"
                                sx={{ ml: 0.5, bgcolor: threshold.color, color: '#fff' }}
                              />
                            )}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Not completed this week
                          </Typography>
                        )}
                      </Box>
                      {done ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openCheckIn(measure.id)}
                        >
                          Start
                        </Button>
                      )}
                    </Stack>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* ── Trends ── */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <TrendingDownIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Trends Over Time
        </Typography>
      </Stack>

      <Grid container spacing={3} mb={4}>
        {measures.map((measure) => {
          const chartData = getChartData(measure.id);
          const allResponses = [...(responsesByMeasure[measure.id] || [])].sort((a, b) =>
            b.weekOf.localeCompare(a.weekOf)
          );
          const color = MEASURE_COLORS[measure.id] || '#6366f1';
          const latest = allResponses[0];
          const latestThreshold = latest ? getThreshold(measure, latest.score) : null;
          // Reference line at first threshold boundary (mild onset)
          const mildThreshold = measure.thresholds[1]?.min;

          return (
            <Grid item xs={12} md={6} key={measure.id}>
              <Card>
                <CardContent>
                  {/* Measure header */}
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={2}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {measure.shortName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {measure.name}
                      </Typography>
                    </Box>
                    {latest && latestThreshold && (
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color }}>
                          {latest.score}
                        </Typography>
                        <Chip
                          label={latestThreshold.label}
                          size="small"
                          sx={{ bgcolor: latestThreshold.color, color: '#fff' }}
                        />
                      </Box>
                    )}
                  </Stack>

                  {/* Line chart */}
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis
                          domain={[0, measure.maxScore]}
                          tick={{ fontSize: 11 }}
                          width={28}
                        />
                        <Tooltip
                          formatter={(value: number) => [value, measure.shortName]}
                          contentStyle={{ fontSize: 12 }}
                        />
                        {mildThreshold !== undefined && (
                          <ReferenceLine
                            y={mildThreshold}
                            stroke="#94a3b8"
                            strokeDasharray="4 3"
                            label={{ value: 'Mild', position: 'right', fontSize: 10, fill: '#94a3b8' }}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ fill: color, r: 4, strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box
                      sx={{
                        height: 180,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Complete your first check-in to see your trend.
                      </Typography>
                    </Box>
                  )}

                  {/* History table */}
                  {allResponses.length > 0 && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
                      >
                        Recent history
                      </Typography>
                      <Table size="small" sx={{ mt: 0.5 }}>
                        <TableBody>
                          {allResponses.slice(0, 5).map((r) => {
                            const t = getThreshold(measure, r.score);
                            return (
                              <TableRow key={r.id} sx={{ '&:last-child td': { border: 0 } }}>
                                <TableCell sx={{ px: 0, py: 0.5, fontSize: 12 }}>
                                  Week of {formatWeekLabel(r.weekOf)}
                                </TableCell>
                                <TableCell align="right" sx={{ px: 0, py: 0.5 }}>
                                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {r.score}
                                    </Typography>
                                    <Chip
                                      label={t.label}
                                      size="small"
                                      sx={{ height: 18, fontSize: '0.6rem', bgcolor: t.color, color: '#fff' }}
                                    />
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Safety footer */}
      <Alert severity="info" icon={false}>
        <Typography variant="body2">
          These check-ins are a tool for reflection and tracking — not a diagnosis. Your therapist
          will review your scores at each session. If you're in distress at any time, please reach
          out to your therapist or call/text{' '}
          <strong>988</strong> (Suicide &amp; Crisis Lifeline, available 24/7).
        </Typography>
      </Alert>

      {/* ── Check-in Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={dialogStep === 'fill'}
      >
        {activeMeasure && (
          <>
            <DialogTitle>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {activeMeasure.shortName} &nbsp;·&nbsp; Week of {formatWeekLabel(currentWeek)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dialogStep === 'fill'
                  ? `${formAnswers.filter((v) => v >= 0).length} of ${activeMeasure.items.length} answered`
                  : 'Submitted'}
              </Typography>
            </DialogTitle>

            <DialogContent dividers>
              {/* ── Fill form ── */}
              {dialogStep === 'fill' && (
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3, fontStyle: 'italic', lineHeight: 1.6 }}
                  >
                    Over the last 2 weeks, how often have you been bothered by the following problems?
                  </Typography>
                  <Stack spacing={3}>
                    {activeMeasure.items.map((item, idx) => (
                      <Box key={item.id}>
                        <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                          {idx + 1}.&nbsp;{item.text}
                        </Typography>
                        <RadioGroup
                          row
                          value={formAnswers[idx] >= 0 ? String(formAnswers[idx]) : ''}
                          onChange={(e) => handleAnswer(idx, Number(e.target.value))}
                        >
                          {item.options.map((opt) => (
                            <FormControlLabel
                              key={opt.value}
                              value={String(opt.value)}
                              control={<Radio size="small" />}
                              label={
                                <Typography variant="body2" sx={{ fontSize: 13 }}>
                                  {opt.label}
                                </Typography>
                              }
                              sx={{ mr: 2 }}
                            />
                          ))}
                        </RadioGroup>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* ── Result ── */}
              {dialogStep === 'result' && lastResult && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  {showSafetyAlert && (
                    <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
                      You indicated some difficult thoughts. You don't have to face these alone —
                      please talk to your therapist or reach out to{' '}
                      <strong>988</strong> (call or text, available 24/7).
                    </Alert>
                  )}

                  <CheckCircleIcon color="success" sx={{ fontSize: 52, mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Check-in submitted
                  </Typography>

                  {(() => {
                    const t = getThreshold(activeMeasure, lastResult.score);
                    return (
                      <>
                        <Stack
                          direction="row"
                          alignItems="baseline"
                          justifyContent="center"
                          spacing={0.5}
                          mb={1}
                        >
                          <Typography variant="h2" sx={{ fontWeight: 700 }}>
                            {lastResult.score}
                          </Typography>
                          <Typography variant="h6" color="text.secondary">
                            / {activeMeasure.maxScore}
                          </Typography>
                        </Stack>
                        <Chip label={t.label} sx={{ mb: 2, bgcolor: t.color, color: '#fff' }} />
                        <Typography variant="caption" color="text.secondary">
                          Your therapist will see this score at your next session.
                        </Typography>
                      </>
                    );
                  })()}

                  {/* Remaining measures this week */}
                  {pendingMeasures.filter((m) => m.id !== lastResult.measureId).length > 0 && (
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Still due this week:
                      </Typography>
                      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                        {pendingMeasures
                          .filter((m) => m.id !== lastResult.measureId)
                          .map((m) => (
                            <Chip key={m.id} label={m.shortName} variant="outlined" size="small" />
                          ))}
                      </Stack>
                    </Box>
                  )}
                </Box>
              )}
            </DialogContent>

            <DialogActions>
              {dialogStep === 'fill' && (
                <>
                  <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button
                    variant="contained"
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                  >
                    Submit
                  </Button>
                </>
              )}
              {dialogStep === 'result' && (
                <>
                  <Button onClick={() => setDialogOpen(false)}>Done</Button>
                  {pendingMeasures.filter((m) => m.id !== lastResult?.measureId).length > 0 && (
                    <Button variant="contained" onClick={handleNextMeasure}>
                      Next measure
                    </Button>
                  )}
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
