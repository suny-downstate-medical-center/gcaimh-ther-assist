import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  IconButton,
  Collapse,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  LinearProgress,
  Grid,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  EmojiObjects as InsightIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import { TherapySession } from '../../types/clientPortal';
import { format } from 'date-fns';

interface SessionAnalysisCardProps {
  onNavigateToIntegrativeAnalysis: () => void;
}

const getSessionNumber = (sessions: TherapySession[], session: TherapySession): number => {
  // Sessions are ordered most-recent-first; session number = total - index
  const idx = sessions.indexOf(session);
  return sessions.length - idx;
};

export const SessionAnalysisCard: React.FC<SessionAnalysisCardProps> = ({
  onNavigateToIntegrativeAnalysis,
}) => {
  const portal = useClientPortal();
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TherapySession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const sessionsData = await portal.listTherapySessions();
      setSessions(sessionsData);
      if (sessionsData.length > 0) {
        setSelectedSession(sessionsData[0]); // Most recent session
      }
    } catch (err) {
      console.error('[SessionAnalysisCard] Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  const handleSelectSession = (session: TherapySession) => {
    setSelectedSession(session);
  };

  if (loading) {
    return (
      <Card sx={{ borderLeft: 4, borderColor: 'secondary.main' }}>
        <CardContent>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card sx={{ borderLeft: 4, borderColor: 'secondary.main' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <PsychologyIcon color="secondary" />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Session Analysis
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            No therapy sessions recorded yet.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const latestSession = selectedSession || sessions[0];
  const latestSessionNumber = getSessionNumber(sessions, latestSession);

  return (
    <Card sx={{ borderLeft: 4, borderColor: 'secondary.main' }}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PsychologyIcon color="secondary" />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Session Analysis
            </Typography>
          </Stack>
          <IconButton onClick={handleExpand} size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>

        {/* Collapsed View - Overview */}
        {!expanded && (
          <Box>
            <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
              <Chip
                icon={<CalendarIcon />}
                label={`Session ${latestSessionNumber} - ${format(new Date(latestSession.date), 'MMM d, yyyy')}`}
                size="small"
                color="secondary"
                variant="outlined"
              />
              <Chip
                icon={<TimeIcon />}
                label={`${latestSession.durationMinutes} min`}
                size="small"
                variant="outlined"
              />
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Themes
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                  {latestSession.themes.slice(0, 3).map((theme) => (
                    <Chip key={theme} label={theme} size="small" />
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Emotional Shift
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {latestSession.emotionalState?.start} &rarr; {latestSession.emotionalState?.end}
                </Typography>
              </Grid>
            </Grid>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              Click to expand for full details
            </Typography>
          </Box>
        )}

        {/* Expanded View - Full Details */}
        <Collapse in={expanded}>
          <Box>
            <Grid container spacing={3}>
              {/* Session List */}
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Session History ({sessions.length})
                </Typography>
                <List sx={{ maxHeight: 400, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
                  {sessions.map((session) => (
                    <ListItemButton
                      key={session.id}
                      selected={selectedSession?.id === session.id}
                      onClick={() => handleSelectSession(session)}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemText
                        primary={`Session ${getSessionNumber(sessions, session)}`}
                        secondary={format(new Date(session.date), 'MMM d, yyyy')}
                      />
                    </ListItemButton>
                  ))}
                </List>

                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  startIcon={<TrendingUpIcon />}
                  onClick={onNavigateToIntegrativeAnalysis}
                  sx={{ mt: 2 }}
                >
                  Integrative Session Analysis
                </Button>
              </Grid>

              {/* Session Details */}
              <Grid item xs={12} md={8}>
                {selectedSession && (
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Session {getSessionNumber(sessions, selectedSession)} - {format(new Date(selectedSession.date), 'MMMM d, yyyy')}
                    </Typography>

                    <Stack spacing={2}>
                      {/* Summary */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Summary
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedSession.summary}
                        </Typography>
                      </Box>

                      {/* Emotional State */}
                      {selectedSession.emotionalState && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            Emotional State
                          </Typography>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Chip label={selectedSession.emotionalState.start} size="small" variant="outlined" />
                            <Typography variant="body2" color="text.secondary">&rarr;</Typography>
                            <Chip label={selectedSession.emotionalState.end} size="small" variant="outlined" />
                            <Chip
                              label={selectedSession.emotionalState.shift}
                              size="small"
                              sx={{
                                bgcolor: selectedSession.emotionalState.shift === 'Positive' ? '#059669' : '#d97706',
                                color: '#fff',
                              }}
                            />
                          </Stack>
                        </Box>
                      )}

                      <Divider />

                      {/* Themes */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Themes
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {selectedSession.themes.map((theme) => (
                            <Chip key={theme} label={theme} size="small" color="primary" />
                          ))}
                        </Stack>
                      </Box>

                      {/* Key Moments */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          <InsightIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                          Key Moments
                        </Typography>
                        <Stack spacing={1}>
                          {selectedSession.keyMoments.map((moment, idx) => (
                            <Card key={idx} variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="body2">{moment}</Typography>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      </Box>

                      {/* Techniques */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Techniques
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {selectedSession.techniques.map((technique) => (
                            <Chip key={technique} label={technique} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>

                      {/* Insights */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Insights
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {selectedSession.insights.map((insight) => (
                            <Chip key={insight} label={insight} size="small" variant="outlined" color="success" />
                          ))}
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};
