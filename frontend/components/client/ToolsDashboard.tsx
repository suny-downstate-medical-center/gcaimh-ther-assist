import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Stack,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
} from '@mui/material';
import {
  SelfImprovement as SelfImprovementIcon,
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import { Intervention, InterventionSession } from '../../types/clientPortal';

interface ToolsDashboardProps {
  onNavigateBack?: () => void;
}

export const ToolsDashboard: React.FC<ToolsDashboardProps> = ({ onNavigateBack }) => {
  const portal = useClientPortal();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [activeSession, setActiveSession] = useState<InterventionSession | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await portal.listInterventions();
      setInterventions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interventions');
      console.error('[ToolsDashboard] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartIntervention = async (intervention: Intervention) => {
    try {
      const session = await portal.startInterventionSession(intervention.id);
      setSelectedIntervention(intervention);
      setActiveSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start intervention');
      console.error('[ToolsDashboard] Error starting intervention:', err);
    }
  };

  const handleCloseModal = () => {
    setSelectedIntervention(null);
    setActiveSession(null);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Self-Regulation Tools
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
        Self-Regulation Tools
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Use these evidence-based interventions when you need support. Each tool is designed to
        help you manage difficult emotions and thoughts.
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Intervention Cards */}
      {interventions.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <SelfImprovementIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No tools available
          </Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {interventions.map((intervention) => (
            <Card key={intervention.id}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                    {intervention.name}
                  </Typography>
                  {intervention.durationMinutes && (
                    <Chip
                      icon={<ScheduleIcon />}
                      label={`${intervention.durationMinutes} min`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>

                <Typography variant="body2" color="text.secondary" paragraph>
                  {intervention.description}
                </Typography>

                {intervention.instructions && (
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-line',
                      color: 'text.secondary',
                      fontStyle: 'italic',
                      pl: 2,
                      borderLeft: 2,
                      borderColor: 'divider',
                    }}
                  >
                    {intervention.instructions}
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => handleStartIntervention(intervention)}
                >
                  Start
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      {/* Timer Modal */}
      {selectedIntervention && activeSession && (
        <InterventionTimerModal
          intervention={selectedIntervention}
          session={activeSession}
          onClose={handleCloseModal}
        />
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
          <strong>Important:</strong> These tools are meant to complement therapy, not replace it.
          If you're experiencing a mental health emergency, please contact 988 (Suicide & Crisis
          Lifeline) or go to your nearest emergency room.
        </Typography>
      </Box>
    </Box>
  );
};

// Timer Modal Component
interface InterventionTimerModalProps {
  intervention: Intervention;
  session: InterventionSession;
  onClose: () => void;
}

const InterventionTimerModal: React.FC<InterventionTimerModalProps> = ({
  intervention,
  session,
  onClose,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(
    intervention.durationMinutes ? intervention.durationMinutes * 60 : 0
  );
  const [isRunning, setIsRunning] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSeconds = intervention.durationMinutes ? intervention.durationMinutes * 60 : 0;
  const progress = totalSeconds > 0 ? ((totalSeconds - timeRemaining) / totalSeconds) * 100 : 0;

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: { xs: 300, md: 400 } },
      }}
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {intervention.name}
          </Typography>
          <IconButton edge="end" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {/* Timer Display */}
        <Box sx={{ textAlign: 'center', py: 4 }}>
          {isCompleted ? (
            <>
              <CheckCircleIcon sx={{ fontSize: { xs: 56, md: 80 }, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                Complete!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Great job completing this intervention.
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h2" sx={{ fontWeight: 600, mb: 2, fontFamily: 'monospace', fontSize: { xs: '2rem', sm: '2.5rem', md: '3.75rem' } }}>
                {formatTime(timeRemaining)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  mb: 3,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                  },
                }}
              />
            </>
          )}
        </Box>

        {/* Instructions */}
        {intervention.instructions && !isCompleted && (
          <Card sx={{ bgcolor: 'grey.50', mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Instructions
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-line',
                  color: 'text.secondary',
                }}
              >
                {intervention.instructions}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Post-session prompt */}
        {isCompleted && intervention.journalPrompt && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Reflection prompt:</strong>
            </Typography>
            <Typography variant="body2">{intervention.journalPrompt}</Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!isCompleted && (
          <Button
            onClick={() => setIsRunning(!isRunning)}
            startIcon={isRunning ? <PauseIcon /> : <PlayArrowIcon />}
            variant="outlined"
          >
            {isRunning ? 'Pause' : 'Resume'}
          </Button>
        )}
        <Button onClick={onClose} variant={isCompleted ? 'contained' : 'text'}>
          {isCompleted ? 'Done' : 'End Early'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
