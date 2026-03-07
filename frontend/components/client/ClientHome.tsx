import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  LinearProgress,
  Chip,
  Grid,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Spa as SpaIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Assignment as AssignmentIcon,
  MenuBook as JournalIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import {
  HomeworkAssignment,
  PsychoeducationModule,
  Intervention,
  ClientProgress,
  JournalEntry,
} from '../../types/clientPortal';
import { SessionAnalysisCard } from './SessionAnalysisCard';

interface ClientHomeProps {
  onNavigateToHomework: () => void;
  onNavigateToTools: () => void;
  onNavigateToModule: (moduleId: string) => void;
  onNavigateToLibrary: () => void;
  onNavigateToIntegrativeAnalysis: () => void;
  onNavigateToJournal: () => void;
  onNavigateToProgress: () => void;
}

export const ClientHome: React.FC<ClientHomeProps> = ({
  onNavigateToHomework,
  onNavigateToTools,
  onNavigateToModule,
  onNavigateToLibrary,
  onNavigateToIntegrativeAnalysis,
  onNavigateToJournal,
  onNavigateToProgress,
}) => {
  const portal = useClientPortal();
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [modules, setModules] = useState<Map<string, PsychoeducationModule>>(new Map());
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [progress, setProgress] = useState<ClientProgress | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsData, modulesData, interventionsData, progressData, journalData] = await Promise.all([
        portal.listHomeworkAssignments(),
        portal.listModules(),
        portal.listInterventions(),
        portal.getClientProgress(),
        portal.listJournalEntries(),
      ]);

      setAssignments(assignmentsData);

      const moduleMap = new Map<string, PsychoeducationModule>();
      modulesData.forEach((mod) => moduleMap.set(mod.id, mod));
      setModules(moduleMap);

      setInterventions(interventionsData);
      setProgress(progressData);
      setJournalEntries(journalData);
    } catch (err) {
      console.error('[ClientHome] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeAssignments = assignments.filter((a) => a.status !== 'COMPLETED');
  const todayAssignments = activeAssignments.slice(0, 3);
  const allTools = interventions;

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Typography variant="h3" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' } }}>
        Welcome back!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Here's your mental wellness dashboard for today
      </Typography>

      {/* Navigation Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}
            onClick={onNavigateToHomework}
          >
            <CardContent>
              <Stack alignItems="center" spacing={2}>
                <AssignmentIcon color="primary" sx={{ fontSize: 48 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Independent Practice
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  View your assignments and track progress
                </Typography>
                <Chip
                  label={`${activeAssignments.length} active`}
                  color="primary"
                  size="small"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}
            onClick={onNavigateToTools}
          >
            <CardContent>
              <Stack alignItems="center" spacing={2}>
                <SpaIcon color="success" sx={{ fontSize: 48 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Tools
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Self-regulation and grounding exercises
                </Typography>
                <Chip
                  label={`${interventions.length} available`}
                  color="success"
                  size="small"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}
            onClick={onNavigateToLibrary}
          >
            <CardContent>
              <Stack alignItems="center" spacing={2}>
                <CheckCircleIcon color="info" sx={{ fontSize: 48 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Library
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Explore all available modules and resources
                </Typography>
                <Chip
                  label="Browse"
                  color="info"
                  size="small"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}
            onClick={onNavigateToJournal}
          >
            <CardContent>
              <Stack alignItems="center" spacing={2}>
                <JournalIcon color="warning" sx={{ fontSize: 48 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Journal
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Reflect on your learning and insights
                </Typography>
                <Chip
                  label={journalEntries.length > 0 ? `${journalEntries.length} entries` : 'Start writing'}
                  color="warning"
                  size="small"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}
            onClick={onNavigateToProgress}
          >
            <CardContent>
              <Stack alignItems="center" spacing={2}>
                <BarChartIcon color="secondary" sx={{ fontSize: 48 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Progress
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Weekly check-ins and symptom trends
                </Typography>
                <Chip
                  label="Check in"
                  color="secondary"
                  size="small"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Session Analysis Card */}
      <Box sx={{ mb: 4 }}>
        <SessionAnalysisCard onNavigateToIntegrativeAnalysis={onNavigateToIntegrativeAnalysis} />
      </Box>

      <Grid container spacing={3}>
        {/* Today's Plan */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'primary.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <AssignmentIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Today's Plan
                </Typography>
              </Stack>

              {todayAssignments.length === 0 ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  All caught up! No assignments due today.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {todayAssignments.map((assignment) => {
                    const module = modules.get(assignment.moduleId);
                    if (!module) return null;

                    return (
                      <Card key={assignment.id} variant="outlined">
                        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {module.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {module.estimatedMinutes} min • {module.category}
                              </Typography>
                            </Box>
                            <Button
                              variant={assignment.status === 'IN_PROGRESS' ? 'contained' : 'outlined'}
                              size="small"
                              onClick={() => onNavigateToModule(module.id)}
                              startIcon={
                                assignment.status === 'IN_PROGRESS' ? <PlayArrowIcon /> : undefined
                              }
                            >
                              {assignment.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {activeAssignments.length > 3 && (
                    <Button variant="text" onClick={onNavigateToHomework} sx={{ alignSelf: 'flex-start' }}>
                      View all {activeAssignments.length} assignments
                    </Button>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Reset Tools */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <SpaIcon color="success" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Quick Reset
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose a tool to regulate your nervous system
              </Typography>

              <Stack spacing={1} sx={{ maxHeight: 320, overflowY: 'auto' }}>
                {allTools.map((tool) => (
                  <Button
                    key={tool.id}
                    variant="outlined"
                    fullWidth
                    onClick={onNavigateToTools}
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      py: 1,
                      px: 1.5,
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {tool.title}
                      </Typography>
                      <Chip
                        label={tool.type.replace(/_/g, ' ')}
                        size="small"
                        sx={{ mt: 0.5, fontSize: '0.65rem', height: 20 }}
                      />
                    </Box>
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Progress & Brain Skills */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <TrendingUpIcon color="warning" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Progress & Brain Skills
                </Typography>
              </Stack>

              <Stack spacing={3}>
                {/* Streak */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Current Streak
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: 'warning.main' }}>
                    {progress?.currentStreak || 0} days
                  </Typography>
                </Box>

                {/* Completion Rate */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      Weekly Completion
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {progress?.weeklyCompletionRate || 0}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, progress?.weeklyCompletionRate || 0)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: 'warning.main',
                      },
                    }}
                  />
                </Box>

                {/* Brain Skills */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Brain Skills Practiced
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                    {progress?.skillsPracticed.slice(0, 5).map((skill) => (
                      <Chip key={skill} label={skill} size="small" variant="outlined" />
                    )) || (
                      <Typography variant="caption" color="text.secondary">
                        Complete assignments to build skills
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Journal Entries */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <JournalIcon color="warning" />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Recent Journal
                  </Typography>
                </Stack>
                <Button size="small" onClick={onNavigateToJournal}>
                  View All
                </Button>
              </Stack>

              {journalEntries.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No journal entries yet. Start reflecting on your progress!
                  </Typography>
                  <Button variant="outlined" size="small" onClick={onNavigateToJournal}>
                    Write First Entry
                  </Button>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {journalEntries.slice(0, 3).map((entry) => (
                    <Card
                      key={entry.id}
                      variant="outlined"
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                      onClick={onNavigateToJournal}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(entry.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 0.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {entry.learned || entry.meaning || entry.nextSessionNotes || 'No content'}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
