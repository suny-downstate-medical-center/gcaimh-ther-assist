import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  LinearProgress,
  Grid,
  Paper,
  Divider,
  Button,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  EmojiObjects as InsightIcon,
  Psychology as PsychologyIcon,
  Star as StarIcon,
  Assignment as AssignmentIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import { IntegrativeAnalysis, TherapySession } from '../../types/clientPortal';

interface IntegrativeAnalysisPageProps {
  onNavigateBack?: () => void;
}

export const IntegrativeAnalysisPage: React.FC<IntegrativeAnalysisPageProps> = ({ onNavigateBack }) => {
  const portal = useClientPortal();
  const [analysis, setAnalysis] = useState<IntegrativeAnalysis | null>(null);
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analysisData, sessionsData] = await Promise.all([
        portal.getIntegrativeAnalysis(),
        portal.listTherapySessions(),
      ]);
      setAnalysis(analysisData);
      setSessions(sessionsData);
    } catch (err) {
      console.error('[IntegrativeAnalysis] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (!analysis) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Integrative Session Analysis
        </Typography>
        <Typography color="text.secondary">
          No analysis data available yet.
        </Typography>
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
      <Stack spacing={1} mb={4}>
        <Typography variant="h3" sx={{ fontWeight: 600 }}>
          Integrative Session Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive analysis across all {sessions.length} therapy sessions
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        {/* Overall Progress */}
        <Grid item xs={12}>
          <Card sx={{ borderLeft: 4, borderColor: 'primary.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Overall Progress
                </Typography>
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {analysis.overallProgress}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Themes */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'secondary.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <TimelineIcon color="secondary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Key Patterns
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {analysis.patterns.map((pattern, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.5, bgcolor: 'secondary.50' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {idx + 1}. {pattern}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Recommended Focus */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <AssignmentIcon color="warning" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recommended Focus Areas
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {analysis.recommendations.map((focus, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: 'warning.main',
                        mt: 1,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {focus}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Growth Trajectory */}
        <Grid item xs={12}>
          <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <TrendingUpIcon color="success" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Growth Areas
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {analysis.growthAreas.map((area, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        mt: 1,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {area}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Pattern Identification */}
        <Grid item xs={12}>
          <Card sx={{ borderLeft: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <InsightIcon color="info" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Identified Patterns
                </Typography>
              </Stack>
              <Grid container spacing={2}>
                {analysis.patterns.map((pattern, idx) => (
                  <Grid item xs={12} sm={6} key={idx}>
                    <Card variant="outlined" sx={{ bgcolor: 'info.50', borderColor: 'info.200' }}>
                      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <Chip
                            label={idx + 1}
                            size="small"
                            color="info"
                            sx={{ minWidth: 28, height: 24 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {pattern}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Strengths Evolution */}
        <Grid item xs={12}>
          <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <StarIcon color="success" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Strength Areas
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {analysis.strengthAreas.map((strength, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                    <StarIcon sx={{ fontSize: 16, color: 'success.main', mt: 0.3 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {strength}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Clinical Insights */}
        <Grid item xs={12}>
          <Card sx={{ borderLeft: 4, borderColor: 'secondary.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <PsychologyIcon color="secondary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Clinical Insights & Recommendations
                </Typography>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                {analysis.therapeuticInsights.map((insight, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                    <PsychologyIcon sx={{ fontSize: 16, color: 'secondary.main', mt: 0.3 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {insight}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Session Summary Footer */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Analysis Summary
            </Typography>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {sessions.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Sessions
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                  {analysis.patterns.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Patterns
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {analysis.patterns.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Patterns Identified
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  {analysis.recommendations.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Focus Areas
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
