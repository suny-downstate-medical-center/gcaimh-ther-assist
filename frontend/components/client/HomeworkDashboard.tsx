import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Alert,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import {
  HomeworkAssignment,
  PsychoeducationModule,
  HomeworkStatus,
} from '../../types/clientPortal';

interface HomeworkDashboardProps {
  onNavigateToModule?: (moduleId: string) => void;
  onNavigateBack?: () => void;
}

export const HomeworkDashboard: React.FC<HomeworkDashboardProps> = ({
  onNavigateToModule,
  onNavigateBack,
}) => {
  const portal = useClientPortal();
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [modules, setModules] = useState<Map<string, PsychoeducationModule>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<HomeworkStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [assignmentsData, modulesData] = await Promise.all([
        portal.listHomeworkAssignments(),
        portal.listModules(),
      ]);

      setAssignments(assignmentsData);
      const moduleMap = new Map<string, PsychoeducationModule>();
      modulesData.forEach((mod) => moduleMap.set(mod.id, mod));
      setModules(moduleMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load homework');
      console.error('[HomeworkDashboard] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (assignmentId: string, newStatus: HomeworkStatus) => {
    try {
      await portal.updateHomeworkStatus(assignmentId, newStatus);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
      console.error('[HomeworkDashboard] Error updating status:', err);
    }
  };

  const getStatusColor = (status: HomeworkStatus): 'default' | 'primary' | 'success' | 'warning' => {
    switch (status) {
      case 'ASSIGNED':
        return 'default';
      case 'IN_PROGRESS':
        return 'primary';
      case 'COMPLETED':
        return 'success';
      case 'OVERDUE':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: HomeworkStatus): string => {
    switch (status) {
      case 'ASSIGNED':
        return 'Not Started';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'OVERDUE':
        return 'Overdue';
      default:
        return status;
    }
  };

  // Calculate weekly progress
  const weeklyProgress = assignments.filter(
    (a) => a.status === 'COMPLETED' && isThisWeek(a.completedAt)
  ).length;
  const totalThisWeek = assignments.filter((a) => isThisWeek(a.assignedAt)).length;

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    const statusMatch = statusFilter === 'ALL' || assignment.status === statusFilter;
    const module = modules.get(assignment.moduleId);
    const searchMatch =
      !searchQuery ||
      module?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (module?.description ?? module?.summary ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Independent Practice
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Back Button */}
      {onNavigateBack && (
        <Button startIcon={<ArrowBackIcon />} onClick={onNavigateBack} sx={{ mb: 2 }}>
          Back to Dashboard
        </Button>
      )}

      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
        Independent Practice
      </Typography>

      {/* Weekly Progress */}
      {totalThisWeek > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            This week: {weeklyProgress} of {totalThisWeek} completed
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(weeklyProgress / totalThisWeek) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                bgcolor: 'success.main',
              },
            }}
          />
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 200 } }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value as HomeworkStatus | 'ALL')}
          >
            <MenuItem value="ALL">All Status</MenuItem>
            <MenuItem value="ASSIGNED">Not Started</MenuItem>
            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Search modules"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
      </Stack>

      {/* Assignment Cards */}
      {filteredAssignments.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No homework assignments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {statusFilter !== 'ALL' || searchQuery
              ? 'Try adjusting your filters'
              : 'Your therapist will assign modules here'}
          </Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {filteredAssignments.map((assignment) => {
            const module = modules.get(assignment.moduleId);
            if (!module) return null;

            return (
              <Card key={assignment.id} sx={{ display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                      {module.title}
                    </Typography>
                    <Chip
                      label={getStatusLabel(assignment.status)}
                      color={getStatusColor(assignment.status)}
                      size="small"
                      icon={
                        assignment.status === 'COMPLETED' ? (
                          <CheckCircleIcon />
                        ) : assignment.status === 'IN_PROGRESS' ? (
                          <PlayArrowIcon />
                        ) : undefined
                      }
                    />
                  </Stack>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {module.description}
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
                    {module.category && (
                      <Chip label={module.category} size="small" variant="outlined" />
                    )}
                    {module.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Stack>

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {module.estimatedMinutes} min
                      </Typography>
                    </Stack>

                    {assignment.dueDate && (
                      <Typography variant="caption" color="text.secondary">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </Typography>
                    )}

                    {assignment.completedAt && (
                      <Typography variant="caption" color="success.main">
                        Completed: {new Date(assignment.completedAt).toLocaleDateString()}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2 }}>
                  {assignment.status === 'COMPLETED' ? (
                    <Button
                      size="small"
                      onClick={() => onNavigateToModule?.(module.id)}
                    >
                      Review
                    </Button>
                  ) : assignment.status === 'IN_PROGRESS' ? (
                    <>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => onNavigateToModule?.(module.id)}
                      >
                        Continue
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleStatusChange(assignment.id, 'COMPLETED')}
                      >
                        Mark Complete
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleStatusChange(assignment.id, 'IN_PROGRESS')}
                      >
                        Start
                      </Button>
                      <Button
                        size="small"
                        onClick={() => onNavigateToModule?.(module.id)}
                      >
                        Preview
                      </Button>
                    </>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Safety Footer */}
      <Box
        sx={{
          mt: 4,
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 1,
          borderLeft: 4,
          borderColor: 'warning.main',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          <strong>Important:</strong> If you're experiencing a mental health emergency, please
          contact 988 (Suicide & Crisis Lifeline) or go to your nearest emergency room. This
          platform is not a substitute for emergency care.
        </Typography>
      </Box>
    </Box>
  );
};

// Helper to check if date is in current week (Monday-Sunday)
function isThisWeek(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
  endOfWeek.setHours(23, 59, 59, 999);
  return date >= startOfWeek && date <= endOfWeek;
}
