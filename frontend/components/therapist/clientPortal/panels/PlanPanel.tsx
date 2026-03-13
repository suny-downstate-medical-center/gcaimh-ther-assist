import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip, Card, CardContent, CardActions, Skeleton, Alert,
  Divider, Menu, MenuItem, IconButton, Tooltip, Stack,
} from '@mui/material';
import {
  Add, CheckCircle, Schedule, Archive, MoreVert, FitnessCenter, MenuBook,
} from '@mui/icons-material';
import { useTherapistBridge } from '../../../../contexts/TherapistClientBridgeContext';
import { TherapistHomeworkItem, TherapistInterventionAssignment } from '../../../../types/therapistClientBridge';
import EmptyState from '../shared/EmptyState';

interface PlanPanelProps {
  clientId: string;
  onAssignHomework: () => void;
  onAssignIntervention: () => void;
  refreshKey: number;
}

const STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  ASSIGNED: 'info', IN_PROGRESS: 'warning', COMPLETED: 'success', ARCHIVED: 'default',
};
const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Daily', TWICE_DAILY: 'Twice daily', AS_NEEDED: 'As needed', WEEKLY: 'Weekly',
};

function HomeworkCard({ item, onStatusChange }: { item: TherapistHomeworkItem; onStatusChange: (id: string, status: any) => void }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  const isOverdue = item.dueAt && item.status !== 'COMPLETED' && item.status !== 'ARCHIVED' && new Date(item.dueAt) < new Date();

  return (
    <Card
      sx={{
        borderLeft: 4,
        borderColor: isOverdue ? 'warning.main' : 'primary.main',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}
    >
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5} mb={1}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                {item.moduleTitle}
              </Typography>
              <Chip label={item.status.replace('_', ' ')} size="small" color={STATUS_COLOR[item.status]} />
              {isOverdue && <Chip label="Overdue" size="small" color="warning" />}
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Schedule fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">{item.estimatedMinutes} min</Typography>
              </Stack>
              <Chip label={item.moduleCategory} size="small" variant="outlined" />
              {item.dueAt && (
                <Typography variant="body2" color={isOverdue ? 'warning.main' : 'text.secondary'}>
                  Due {formatDate(item.dueAt)}
                </Typography>
              )}
              {item.progress?.lastOpenedAt && (
                <Typography variant="body2" color="text.secondary">Last opened {formatDate(item.progress.lastOpenedAt)}</Typography>
              )}
            </Stack>
            {item.note && (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 1 }}>
                Note: {item.note}
              </Typography>
            )}
          </Box>
          {item.status !== 'ARCHIVED' && (
            <>
              <IconButton size="small" onClick={e => setAnchorEl(e.currentTarget)}>
                <MoreVert />
              </IconButton>
              <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
                {item.status !== 'COMPLETED' && (
                  <MenuItem onClick={() => { onStatusChange(item.id, 'COMPLETED'); setAnchorEl(null); }}>
                    <CheckCircle fontSize="small" sx={{ mr: 1, color: '#128937' }} /> Mark complete
                  </MenuItem>
                )}
                <MenuItem onClick={() => { onStatusChange(item.id, 'ARCHIVED'); setAnchorEl(null); }}>
                  <Archive fontSize="small" sx={{ mr: 1 }} /> Archive
                </MenuItem>
              </Menu>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function InterventionCard({ item, onArchive }: { item: TherapistInterventionAssignment; onArchive: (id: string) => void }) {
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Card
      sx={{
        borderLeft: 4,
        borderColor: 'success.main',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}
    >
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5} mb={1}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>{item.interventionTitle}</Typography>
              <Chip label={item.interventionType.replace('_', ' ')} size="small" variant="outlined" />
              {item.frequency && <Chip label={FREQ_LABEL[item.frequency]} size="small" color="primary" />}
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">Assigned {formatDate(item.assignedAt)}</Typography>
              {item.recentUsageCount !== undefined && (
                <Typography variant="body2" color="text.secondary">{item.recentUsageCount}× used (last 7 days)</Typography>
              )}
            </Stack>
            {item.note && (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 1 }}>
                Note: {item.note}
              </Typography>
            )}
          </Box>
          {item.status === 'ACTIVE' && (
            <Tooltip title="Archive">
              <IconButton onClick={() => onArchive(item.id)}>
                <Archive />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

const PlanPanel: React.FC<PlanPanelProps> = ({ clientId, onAssignHomework, onAssignIntervention, refreshKey }) => {
  const bridge = useTherapistBridge();
  const [homework, setHomework] = useState<TherapistHomeworkItem[]>([]);
  const [interventions, setInterventions] = useState<TherapistInterventionAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([bridge.listClientHomework(clientId), bridge.listClientInterventions(clientId)])
      .then(([hw, iv]) => { setHomework(hw); setInterventions(iv); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId, refreshKey]);

  const handleStatusChange = async (id: string, status: any) => {
    await bridge.updateHomeworkStatus(clientId, id, status);
    const updated = await bridge.listClientHomework(clientId);
    setHomework(updated);
  };

  const handleArchiveIntervention = async (id: string) => {
    await bridge.archiveIntervention(clientId, id);
    const updated = await bridge.listClientInterventions(clientId);
    setInterventions(updated);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={80} />)}
    </Box>
  );

  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>Could not load plan: {error}</Alert>;

  const activeHomework = homework.filter(h => h.status !== 'ARCHIVED');
  const activeInterventions = interventions.filter(i => i.status === 'ACTIVE');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Homework */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <MenuBook color="primary" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Homework Modules
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Psychoeducation modules assigned between sessions
              </Typography>
            </Box>
          </Stack>
          <Button variant="contained" startIcon={<Add />} onClick={onAssignHomework} sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}>
            Assign homework
          </Button>
        </Stack>
        {activeHomework.length === 0 ? (
          <EmptyState
            icon={<MenuBook />}
            title="No homework assigned"
            description="Assign a psychoeducation module for the client to review between sessions."
            actionLabel="Assign homework"
            onAction={onAssignHomework}
          />
        ) : (
          <Stack spacing={2}>
            {activeHomework.map(h => (
              <HomeworkCard key={h.id} item={h} onStatusChange={handleStatusChange} />
            ))}
          </Stack>
        )}
      </Box>

      <Divider />

      {/* Interventions */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <FitnessCenter color="success" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Tools & Interventions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Therapeutic tools assigned for between-session practice
              </Typography>
            </Box>
          </Stack>
          <Button variant="contained" startIcon={<Add />} onClick={onAssignIntervention} sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}>
            Assign tool
          </Button>
        </Stack>
        {activeInterventions.length === 0 ? (
          <EmptyState
            icon={<FitnessCenter />}
            title="No tools assigned"
            description="Assign a therapeutic tool or intervention for the client to practice."
            actionLabel="Assign tool"
            onAction={onAssignIntervention}
          />
        ) : (
          <Stack spacing={2}>
            {activeInterventions.map(i => (
              <InterventionCard key={i.id} item={i} onArchive={handleArchiveIntervention} />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default PlanPanel;
