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
  ListItem,
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
                label={`Session ${latestSession.sessionNumber} - ${format(new Date(latestSession.date), 'MMM d, yyyy')}`}
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
                  Primary Themes
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                  {latestSession.primaryThemes.slice(0, 3).map((theme) => (
                    <Chip key={theme} label={theme} size="small" />
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Engagement
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={latestSession.metrics.engagement}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {latestSession.metrics.engagement}%
                  </Typography>
                </Box>
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
                        primary={`Session ${session.sessionNumber}`}
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
                      Session {selectedSession.sessionNumber} - {format(new Date(selectedSession.date), 'MMMM d, yyyy')}
                    </Typography>

                    <Stack spacing={2}>
                      {/* Metrics */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Key Metrics
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Therapeutic Alliance</Typography>
                            <LinearProgress variant="determinate" value={selectedSession.metrics.therapeuticAlliance} sx={{ height: 6, borderRadius: 3, mb: 0.5 }} />
                            <Typography variant="body2">{selectedSession.metrics.therapeuticAlliance}%</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Engagement</Typography>
                            <LinearProgress variant="determinate" value={selectedSession.metrics.engagement} sx={{ height: 6, borderRadius: 3, mb: 0.5 }} />
                            <Typography variant="body2">{selectedSession.metrics.engagement}%</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Emotional State</Typography>
                            <LinearProgress variant="determinate" value={selectedSession.metrics.emotionalState} sx={{ height: 6, borderRadius: 3, mb: 0.5 }} />
                            <Typography variant="body2">{selectedSession.metrics.emotionalState}%</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Arousal</Typography>
                            <LinearProgress variant="determinate" value={selectedSession.metrics.arousal} sx={{ height: 6, borderRadius: 3, mb: 0.5 }} />
                            <Typography variant="body2">{selectedSession.metrics.arousal}%</Typography>
                          </Grid>
                        </Grid>
                      </Box>

                      <Divider />

                      {/* Themes */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Primary Themes
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {selectedSession.primaryThemes.map((theme) => (
                            <Chip key={theme} label={theme} size="small" color="primary" />
                          ))}
                        </Stack>
                      </Box>

                      {/* Therapeutic Moments */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          <InsightIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                          Key Therapeutic Moments
                        </Typography>
                        <Stack spacing={1}>
                          {selectedSession.therapeuticMoments.map((moment, idx) => (
                            <Card key={idx} variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                  <Chip label={moment.type} size="small" sx={{ bgcolor: '#0b57d0', color: '#fff', border: 'none' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    Intensity: {moment.intensity}/5
                                  </Typography>
                                </Stack>
                                <Typography variant="body2">{moment.description}</Typography>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      </Box>

                      {/* Clinical Summary */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Clinical Summary
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedSession.clinicalSummary}
                        </Typography>
                      </Box>

                      {/* Strengths */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Strengths Observed
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {selectedSession.strengthsObserved.map((strength) => (
                            <Chip key={strength} label={strength} size="small" variant="outlined" color="success" />
                          ))}
                        </Stack>
                      </Box>

                      {/* Skills Practiced */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Skills Practiced
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {selectedSession.skillsPracticed.map((skill) => (
                            <Chip key={skill} label={skill} size="small" variant="outlined" />
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
