import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  LinearProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import {
  PsychoeducationModule,
  HomeworkAssignment,
  Intervention,
} from '../../types/clientPortal';

interface ModuleDetailProps {
  moduleId: string;
  onNavigateBack: () => void;
  onNavigateToTools?: () => void;
}

export const ModuleDetail: React.FC<ModuleDetailProps> = ({
  moduleId,
  onNavigateBack,
  onNavigateToTools,
}) => {
  const portal = useClientPortal();
  const [module, setModule] = useState<PsychoeducationModule | null>(null);
  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [moduleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [modulesData, assignmentsData, interventionsData] = await Promise.all([
        portal.listModules(),
        portal.listHomeworkAssignments(),
        portal.listInterventions(),
      ]);

      const foundModule = modulesData.find((m) => m.id === moduleId);
      if (!foundModule) {
        setError('Module not found');
        return;
      }

      const foundAssignment = assignmentsData.find((a) => a.moduleId === moduleId);
      const relatedInterventions = interventionsData.filter((i) =>
        foundModule.recommendedInterventions?.includes(i.id)
      );

      setModule(foundModule);
      setAssignment(foundAssignment || null);
      setInterventions(relatedInterventions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load module');
      console.error('[ModuleDetail] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteModule = async () => {
    if (!assignment) return;
    try {
      await portal.updateHomeworkStatus(assignment.id, 'COMPLETED');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark complete');
      console.error('[ModuleDetail] Error completing module:', err);
    }
  };

  const handleStartModule = async () => {
    if (!assignment) return;
    try {
      await portal.updateHomeworkStatus(assignment.id, 'IN_PROGRESS');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start module');
      console.error('[ModuleDetail] Error starting module:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error || !module) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onNavigateBack} sx={{ mb: 2 }}>
          Back to Independent Practice
        </Button>
        <Alert severity="error">{error || 'Module not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onNavigateBack}
        sx={{ mb: 2 }}
      >
        Back to Independent Practice
      </Button>

      {/* Module Header */}
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        {module.title}
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
        {module.category && (
          <Chip label={module.category} size="small" color="primary" variant="outlined" />
        )}
        {module.tags.map((tag) => (
          <Chip key={tag} label={tag} size="small" variant="outlined" />
        ))}
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <ScheduleIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {module.estimatedMinutes} minutes
          </Typography>
        </Stack>

        {assignment?.status === 'COMPLETED' && assignment.completedAt && (
          <Chip
            icon={<CheckCircleIcon />}
            label={`Completed ${new Date(assignment.completedAt).toLocaleDateString()}`}
            size="small"
            color="success"
          />
        )}
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Module Description */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Overview
          </Typography>
          <Typography variant="body1" paragraph>
            {module.description}
          </Typography>
        </CardContent>
      </Card>

      {/* Module Content */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Content
          </Typography>
          <Typography
            variant="body1"
            component="div"
            sx={{
              whiteSpace: 'pre-line',
              '& p': { mb: 2 },
            }}
          >
            {module.content}
          </Typography>
        </CardContent>
      </Card>

      {/* Recommended Interventions */}
      {interventions.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'primary.50', borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <LightbulbIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recommended Self-Regulation Tools
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" paragraph>
              These interventions pair well with this module. Try them when you notice the
              patterns we discussed.
            </Typography>
            <Stack spacing={1}>
              {interventions.map((intervention) => (
                <Box
                  key={intervention.id}
                  sx={{
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {intervention.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {intervention.description}
                  </Typography>
                </Box>
              ))}
            </Stack>
            {onNavigateToTools && (
              <Button
                size="small"
                onClick={onNavigateToTools}
                sx={{ mt: 2 }}
              >
                Go to Tools Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {assignment && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          {assignment.status === 'COMPLETED' ? (
            <Button variant="outlined" fullWidth disabled>
              Module Completed
            </Button>
          ) : assignment.status === 'IN_PROGRESS' ? (
            <Button
              variant="contained"
              fullWidth
              onClick={handleCompleteModule}
              startIcon={<CheckCircleIcon />}
            >
              Mark as Complete
            </Button>
          ) : (
            <Button
              variant="contained"
              fullWidth
              onClick={handleStartModule}
            >
              Start Module
            </Button>
          )}
        </Stack>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Next Steps */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Next Steps
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            After completing this module:
          </Typography>
          <Box component="ol" sx={{ pl: 2, '& li': { mb: 1 } }}>
            <li>
              <Typography variant="body2">
                Practice the recommended interventions when you notice these patterns
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Journal about what you learned and how it applies to your life
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Discuss your insights with your therapist in your next session
              </Typography>
            </li>
          </Box>
        </CardContent>
      </Card>

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
          contact 988 (Suicide & Crisis Lifeline) or go to your nearest emergency room.
        </Typography>
      </Box>
    </Box>
  );
};
