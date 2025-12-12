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
import { Box, Paper, Typography } from '@mui/material';
import { getStatusColor } from '../utils/colorUtils';

interface SessionVitalsProps {
  metrics: {
    therapeutic_alliance: 'strong' | 'moderate' | 'weak' | 'unknown' | 'listening';
    emotional_state: 'calm' | 'anxious' | 'distressed' | 'dissociated' | 'engaged' | 'unknown' | 'listening';
    engagement_level: number;
  };
  isListening?: boolean;
}

const SessionVitals: React.FC<SessionVitalsProps> = ({ metrics, isListening = false }) => {
  const { therapeutic_alliance, emotional_state, engagement_level } = metrics;

  const getEngagementStatus = (level: number): 'strong' | 'moderate' | 'weak' | 'unknown' | 'listening' => {
    if (isListening || therapeutic_alliance === 'listening' || emotional_state === 'listening') return 'listening';
    if (therapeutic_alliance === 'unknown' || emotional_state === 'unknown') return 'unknown';
    if (level > 0.7) return 'strong';
    if (level > 0.4) return 'moderate';
    return 'weak';
  };

  const getDisplayValue = (value: string, isListening: boolean) => {
    if (isListening) return 'Listening...';
    if (value === 'unknown') return 'Unknown';
    return value;
  };

  const getEngagementDisplayValue = (level: number, status: string) => {
    if (status === 'listening') return 'Listening...';
    if (status === 'unknown') return 'Unknown';
    return `${(level * 100).toFixed(0)}%`;
  };

  const engagementStatus = getEngagementStatus(engagement_level);

  return (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: 2,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">Therapeutic Alliance</Typography>
        <Typography variant="h6" sx={{ fontWeight: 600, textTransform: 'capitalize', color: getStatusColor(therapeutic_alliance) }}>
          {getDisplayValue(therapeutic_alliance, isListening)}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">Patient Emotional State</Typography>
        <Typography variant="h6" sx={{ fontWeight: 600, textTransform: 'capitalize', color: getStatusColor(emotional_state) }}>
          {getDisplayValue(emotional_state, isListening)}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">Patient Engagement Level</Typography>
        <Typography variant="h6" sx={{ fontWeight: 600, color: getStatusColor(engagementStatus) }}>
          {getEngagementDisplayValue(engagement_level, engagementStatus)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default SessionVitals;
