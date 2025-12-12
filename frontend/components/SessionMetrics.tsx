// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { Box, Typography, LinearProgress, Chip, Grid } from '@mui/material';
import {
  Mood,
  MoodBad,
  SentimentSatisfied,
  SentimentVeryDissatisfied,
} from '@mui/icons-material';

interface SessionMetricsProps {
  metrics: {
    engagement_level: number;
    therapeutic_alliance: 'weak' | 'moderate' | 'strong';
    techniques_detected: string[];
    emotional_state: 'calm' | 'anxious' | 'distressed' | 'dissociated' | 'unknown';
    phase_appropriate: boolean;
  };
}

const SessionMetrics: React.FC<SessionMetricsProps> = ({ metrics }) => {
  const getEmotionIcon = () => {
    switch (metrics.emotional_state) {
      case 'calm':
        return <Mood color="success" />;
      case 'anxious':
        return <SentimentSatisfied color="warning" />;
      case 'distressed':
        return <MoodBad color="error" />;
      case 'dissociated':
        return <SentimentVeryDissatisfied color="error" />;
      case 'unknown':
        return <SentimentSatisfied color="disabled" />;
      default:
        return <SentimentSatisfied color="disabled" />;
    }
  };

  const getAllianceColor = () => {
    switch (metrics.therapeutic_alliance) {
      case 'strong':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'weak':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Grid container spacing={2}>
        {/* Engagement Level */}
        <Grid item xs={12}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Engagement Level
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {Math.round(metrics.engagement_level * 100)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={metrics.engagement_level * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor: metrics.engagement_level > 0.7 ? 'success.main' : 
                          metrics.engagement_level > 0.4 ? 'warning.main' : 'error.main',
                },
              }}
            />
          </Box>
        </Grid>

        {/* Therapeutic Alliance */}
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Therapeutic Alliance
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Chip
                label={metrics.therapeutic_alliance.charAt(0).toUpperCase() + metrics.therapeutic_alliance.slice(1)}
                size="small"
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  background: metrics.therapeutic_alliance === 'strong' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : metrics.therapeutic_alliance === 'moderate'
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                }}
              />
            </Box>
          </Box>
        </Grid>

        {/* Emotional State */}
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getEmotionIcon()}
            <Box>
              <Typography variant="caption" color="text.secondary">
                Emotional State
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {metrics.emotional_state}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Techniques Detected */}
        <Grid item xs={12}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              Techniques Detected:
            </Typography>
            {metrics.techniques_detected.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {metrics.techniques_detected.map((technique, idx) => (
                  <Chip
                    key={idx}
                    label={technique}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                No techniques detected yet
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Phase Appropriate */}
        <Grid item xs={12}>
          <Box
            sx={{
              p: 1,
              borderRadius: 0,
              bgcolor: metrics.phase_appropriate 
                ? 'rgba(16, 185, 129, 0.08)' 
                : 'rgba(245, 158, 11, 0.08)',
              color: metrics.phase_appropriate 
                ? 'rgba(5, 150, 105, 0.9)' 
                : 'rgba(217, 119, 6, 0.9)',
              textAlign: 'center',
              border: metrics.phase_appropriate 
                ? '1px solid rgba(16, 185, 129, 0.2)' 
                : '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <Typography variant="caption" fontWeight={600}>
              {metrics.phase_appropriate 
                ? '✓ Phase-Appropriate Progress' 
                : '⚠ Consider Phase Adjustment'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SessionMetrics;
