import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, Card, CardContent, CardActions, Button,
  Skeleton, Alert, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, Collapse, Divider,
} from '@mui/material';
import {
  Quiz, Add, Pause, PlayArrow, Delete, ExpandMore, ExpandLess,
  Warning, CheckCircle, Schedule, TrendingDown, TrendingUp, Remove,
} from '@mui/icons-material';
import { useTherapistBridge } from '../../../../contexts/TherapistClientBridgeContext';
import {
  QuestionnaireAssignment,
  QuestionnaireResponse,
  QuestionnaireDefinition,
  QuestionnaireStatus,
} from '../../../../types/therapistClientBridge';
import EmptyState from '../shared/EmptyState';

interface QuestionnairesPanelProps {
  clientId: string;
  onAssignQuestionnaire: () => void;
  refreshKey?: number;
}

// ---------------------------------------------------------------------------
// Severity color helpers
// ---------------------------------------------------------------------------

const SEVERITY_COLOR_MAP: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  success: 'success', info: 'info', warning: 'warning', error: 'error',
};

const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every 2 weeks',
  MONTHLY: 'Monthly',
  SESSION: 'Each session',
};

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  REMOVED: 'error',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Response detail dialog
// ---------------------------------------------------------------------------

interface ResponseDetailDialogProps {
  open: boolean;
  onClose: () => void;
  responses: QuestionnaireResponse[];
  assignment: QuestionnaireAssignment | null;
  definitions: QuestionnaireDefinition[];
}

function ResponseDetailDialog({ open, onClose, responses, assignment, definitions }: ResponseDetailDialogProps) {
  if (!assignment) return null;
  const def = definitions.find(d => d.id === assignment.questionnaireId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
        {assignment.questionnaireShortName} — Response History
      </DialogTitle>
      <DialogContent>
        {def && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {def.description}
          </Typography>
        )}

        {responses.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>No responses recorded yet.</Alert>
        ) : (
          <Stack spacing={2}>
            {/* Score trend summary */}
            <Card sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>Score Trend</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {[...responses].reverse().map((r, i) => {
                    const isLatest = i === responses.length - 1;
                    return (
                      <Tooltip key={r.id} title={`${formatShortDate(r.weekOf)} — ${r.severity} (${r.totalScore}/${r.maxScore})`}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Box sx={{
                            width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: isLatest ? '#0b57d0' : '#0b57d018',
                            color: isLatest ? 'white' : '#0b57d0',
                            fontSize: '14px', fontWeight: 700,
                            border: r.flagged ? '2px solid #d32f2f' : 'none',
                          }}>
                            {r.totalScore}
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block', fontSize: '10px' }}>
                            {formatShortDate(r.weekOf)}
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>

            {/* Individual responses */}
            {responses.map((r) => (
              <Card key={r.id} sx={{
                borderLeft: 4,
                borderColor: r.flagged ? '#d32f2f' : '#0b57d0',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
              }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" mb={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {formatDate(r.weekOf)}
                    </Typography>
                    <Chip
                      label={`${r.totalScore}/${r.maxScore}`}
                      size="small"
                      sx={{ fontWeight: 700, bgcolor: '#0b57d0', color: 'white' }}
                    />
                    <Chip
                      label={r.severity}
                      size="small"
                      color={SEVERITY_COLOR_MAP[r.severityColor]}
                    />
                    {r.flagged && (
                      <Chip
                        icon={<Warning sx={{ fontSize: 14 }} />}
                        label="Flagged"
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                  {r.flagReason && (
                    <Alert severity="error" sx={{ borderRadius: 2, mt: 1, py: 0 }} icon={<Warning sx={{ fontSize: 18 }} />}>
                      <Typography variant="body2">{r.flagReason}</Typography>
                    </Alert>
                  )}
                  {/* Item breakdown */}
                  <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {r.items.map((item, idx) => (
                      <Tooltip key={idx} title={`Item ${idx + 1}: ${item.value}`}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          bgcolor: item.value === 0 ? '#e8f5e9' : item.value <= 1 ? '#fff3e0' : item.value <= 2 ? '#fff9c4' : '#ffebee',
                          fontSize: '12px', fontWeight: 600,
                          color: item.value === 0 ? '#2e7d32' : item.value <= 1 ? '#e65100' : item.value <= 2 ? '#f57f17' : '#c62828',
                        }}>
                          {item.value}
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Assignment card
// ---------------------------------------------------------------------------

interface AssignmentCardProps {
  assignment: QuestionnaireAssignment;
  definitions: QuestionnaireDefinition[];
  onStatusChange: (assignmentId: string, status: QuestionnaireStatus) => void;
  onViewResponses: (assignment: QuestionnaireAssignment) => void;
}

function AssignmentCard({ assignment, definitions, onStatusChange, onViewResponses }: AssignmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const def = definitions.find(d => d.id === assignment.questionnaireId);
  const isActive = assignment.status === 'ACTIVE';
  const isPaused = assignment.status === 'PAUSED';

  const borderColor = assignment.status === 'ACTIVE' ? '#0b57d0'
    : assignment.status === 'PAUSED' ? '#ed6c02'
    : '#bdbdbd';

  return (
    <Card sx={{
      borderLeft: 4,
      borderColor,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      opacity: assignment.status === 'REMOVED' ? 0.6 : 1,
    }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" mb={1}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {assignment.questionnaireShortName}
          </Typography>
          <Chip
            label={assignment.status.charAt(0) + assignment.status.slice(1).toLowerCase()}
            size="small"
            color={STATUS_COLORS[assignment.status]}
          />
          <Chip
            icon={<Schedule sx={{ fontSize: 14 }} />}
            label={CADENCE_LABELS[assignment.cadence] ?? assignment.cadence}
            size="small"
            variant="outlined"
          />
          {assignment.completionCount > 0 && (
            <Chip
              icon={<CheckCircle sx={{ fontSize: 14 }} />}
              label={`${assignment.completionCount} completed`}
              size="small"
              variant="outlined"
              color="success"
            />
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {assignment.questionnaireName}
        </Typography>

        {assignment.note && (
          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
            Note: {assignment.note}
          </Typography>
        )}

        <Stack direction="row" spacing={3} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
          <Box>
            <Typography variant="caption" color="text.secondary">Assigned</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatShortDate(assignment.assignedAt)}</Typography>
          </Box>
          {assignment.lastCompletedAt && (
            <Box>
              <Typography variant="caption" color="text.secondary">Last completed</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatShortDate(assignment.lastCompletedAt)}</Typography>
            </Box>
          )}
          {assignment.nextDueAt && isActive && (
            <Box>
              <Typography variant="caption" color="text.secondary">Next due</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatShortDate(assignment.nextDueAt)}</Typography>
            </Box>
          )}
        </Stack>

        {/* Expandable details */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 1.5 }} />
          {def && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">{def.description}</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Typography variant="caption" color="text.secondary">{def.itemCount} items</Typography>
                <Typography variant="caption" color="text.secondary">Max score: {def.maxScore}</Typography>
                <Typography variant="caption" color="text.secondary">~{def.estimatedMinutes} min</Typography>
                <Typography variant="caption" color="text.secondary">Category: {def.category}</Typography>
              </Stack>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Severity thresholds:</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {def.thresholds.map(t => (
                    <Chip key={t.label} label={`${t.label} (${t.min}-${t.max})`} size="small" color={t.color} variant="outlined" />
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </Collapse>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 1.5, pt: 0, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="contained"
            onClick={() => onViewResponses(assignment)}
            sx={{ borderRadius: 2, textTransform: 'none', background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)' }}
          >
            View responses
          </Button>
          {isActive && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Pause sx={{ fontSize: 16 }} />}
              onClick={() => onStatusChange(assignment.id, 'PAUSED')}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Pause
            </Button>
          )}
          {isPaused && (
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<PlayArrow sx={{ fontSize: 16 }} />}
              onClick={() => onStatusChange(assignment.id, 'ACTIVE')}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Resume
            </Button>
          )}
          {(isActive || isPaused) && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Remove sx={{ fontSize: 16 }} />}
              onClick={() => onStatusChange(assignment.id, 'REMOVED')}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Remove
            </Button>
          )}
        </Box>
        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </CardActions>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

const QuestionnairesPanel: React.FC<QuestionnairesPanelProps> = ({ clientId, onAssignQuestionnaire, refreshKey }) => {
  const bridge = useTherapistBridge();
  const [assignments, setAssignments] = useState<QuestionnaireAssignment[]>([]);
  const [definitions, setDefinitions] = useState<QuestionnaireDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Response dialog state
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<QuestionnaireAssignment | null>(null);
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Confirm remove dialog
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assigns, defs] = await Promise.all([
        bridge.listClientQuestionnaires(clientId),
        bridge.listQuestionnaireDefinitions(),
      ]);
      setAssignments(assigns);
      setDefinitions(defs);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [clientId, refreshKey]);

  const handleStatusChange = async (assignmentId: string, status: QuestionnaireStatus) => {
    if (status === 'REMOVED') {
      const a = assignments.find(q => q.id === assignmentId);
      setConfirmRemove({ id: assignmentId, name: a?.questionnaireShortName ?? 'questionnaire' });
      return;
    }
    await bridge.updateQuestionnaireStatus(clientId, assignmentId, status);
    await loadData();
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemove) return;
    await bridge.updateQuestionnaireStatus(clientId, confirmRemove.id, 'REMOVED');
    setConfirmRemove(null);
    await loadData();
  };

  const handleViewResponses = async (assignment: QuestionnaireAssignment) => {
    setSelectedAssignment(assignment);
    setResponseDialogOpen(true);
    setLoadingResponses(true);
    try {
      const resps = await bridge.listQuestionnaireResponses(clientId, assignment.id);
      setResponses(resps);
    } catch (e: any) {
      setResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={120} />)}
    </Box>
  );

  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>Could not load questionnaires: {error}</Alert>;

  const activeAssignments = assignments.filter(a => a.status === 'ACTIVE');
  const pausedAssignments = assignments.filter(a => a.status === 'PAUSED');
  const removedAssignments = assignments.filter(a => a.status === 'REMOVED');
  const hasAssignments = assignments.length > 0;

  // Stats
  const totalCompletions = assignments.reduce((sum, a) => sum + a.completionCount, 0);
  const flaggedResponses = assignments.filter(a => a.status === 'ACTIVE').length; // placeholder for actual flag count

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <Quiz sx={{ color: '#0b57d0', fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Questionnaires</Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAssignQuestionnaire}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 600,
            background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
            alignSelf: { xs: 'stretch', sm: 'auto' },
          }}
        >
          Assign questionnaire
        </Button>
      </Stack>

      {/* Stats cards */}
      {hasAssignments && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Card sx={{ flex: 1, borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#0b57d0' }}>{activeAssignments.length}</Typography>
              <Typography variant="body2" color="text.secondary">Active</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2e7d32' }}>{totalCompletions}</Typography>
              <Typography variant="body2" color="text.secondary">Total completions</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: pausedAssignments.length > 0 ? '#ed6c02' : '#9e9e9e' }}>
                {pausedAssignments.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Paused</Typography>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Active questionnaires */}
      {!hasAssignments ? (
        <EmptyState
          icon={<Quiz />}
          title="No questionnaires assigned"
          description="Assign standardized measures to track your client's progress over time."
          actionLabel="Assign questionnaire"
          onAction={onAssignQuestionnaire}
        />
      ) : (
        <>
          {activeAssignments.length > 0 && (
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Active ({activeAssignments.length})
              </Typography>
              {activeAssignments.map(a => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  definitions={definitions}
                  onStatusChange={handleStatusChange}
                  onViewResponses={handleViewResponses}
                />
              ))}
            </Stack>
          )}

          {pausedAssignments.length > 0 && (
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Paused ({pausedAssignments.length})
              </Typography>
              {pausedAssignments.map(a => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  definitions={definitions}
                  onStatusChange={handleStatusChange}
                  onViewResponses={handleViewResponses}
                />
              ))}
            </Stack>
          )}

          {removedAssignments.length > 0 && (
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.disabled' }}>
                Removed ({removedAssignments.length})
              </Typography>
              {removedAssignments.map(a => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  definitions={definitions}
                  onStatusChange={handleStatusChange}
                  onViewResponses={handleViewResponses}
                />
              ))}
            </Stack>
          )}
        </>
      )}

      {/* Response detail dialog */}
      <ResponseDetailDialog
        open={responseDialogOpen}
        onClose={() => setResponseDialogOpen(false)}
        responses={loadingResponses ? [] : responses}
        assignment={selectedAssignment}
        definitions={definitions}
      />

      {/* Confirm remove dialog */}
      <Dialog open={!!confirmRemove} onClose={() => setConfirmRemove(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Remove questionnaire?</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to remove <strong>{confirmRemove?.name}</strong>? The client will no longer receive this questionnaire. Past responses will be preserved.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmRemove(null)} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleConfirmRemove} variant="contained" color="error" sx={{ borderRadius: 2 }}>Remove</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuestionnairesPanel;
