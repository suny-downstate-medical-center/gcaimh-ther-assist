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
import { Box, Paper, Typography, LinearProgress, Tooltip } from '@mui/material';
import { HealthAndSafety, NaturePeople, Category, Exposure } from '@mui/icons-material';

interface GuidanceTabProps {
  currentGuidance: {
    title: string;
    time: string;
    content: string;
    immediateActions: Array<{
      title: string;
      description: string;
      icon: 'safety' | 'grounding';
    }>;
    contraindications: Array<{
      title: string;
      description: string;
      icon: 'cognitive' | 'exposure';
    }>;
  };
  onActionClick: (action: any, isContraindication: boolean) => void;
  alerts?: any[];
  transcript?: any[];
  pathwayGuidance?: any;
  sessionMetrics?: {
    engagement_level: number;
    therapeutic_alliance: string;
    emotional_state: string;
    arousal_level: string;
  };
}

const GuidanceTab: React.FC<GuidanceTabProps> = ({ currentGuidance, onActionClick, sessionMetrics }) => {
  const getEmotionalStateColor = (state: string) => {
    switch (state) {
      case 'calm': return '#128937';
      case 'engaged': return '#0b57d0';
      case 'anxious': return '#f59e0b';
      case 'distressed': return '#ef4444';
      case 'dissociated': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  const getArousalColor = (level: string) => {
    switch (level) {
      case 'low': return '#3b82f6';
      case 'moderate': return '#10b981';
      case 'high': return '#f59e0b';
      case 'elevated': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getAllianceColor = (alliance: string) => {
    switch (alliance) {
      case 'strong': return '#128937';
      case 'moderate': return '#f59e0b';
      case 'weak': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getActionIcon = (iconType: string) => {
    switch (iconType) {
      case 'safety': return <HealthAndSafety sx={{ fontSize: 24, color: '#128937' }} />;
      case 'grounding': return <NaturePeople sx={{ fontSize: 24, color: '#128937' }} />;
      case 'cognitive': return <Category sx={{ fontSize: 24, color: '#b3261e' }} />;
      case 'exposure': return <Exposure sx={{ fontSize: 24, color: '#b3261e' }} />;
      default: return <HealthAndSafety sx={{ fontSize: 24, color: '#128937' }} />;
    }
  };

  const ActionCard = ({ action, isContraindication = false }: { 
    action: any; 
    isContraindication?: boolean; 
  }) => (
    <Paper
      onClick={() => onActionClick(action, isContraindication)}
      sx={{
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: '1px solid #c4c7c5',
        borderRadius: '12px',
        minHeight: '80px',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 1 }}>
        {getActionIcon(action.icon)}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            fontSize: '14px',
            lineHeight: '20px',
            color: '#1f1f1f',
          }}
        >
          {action.title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: '12px',
            lineHeight: '18px',
            color: '#444746',
          }}
        >
          {action.description}
        </Typography>
      </Box>
    </Paper>
  );

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      pb: 2,
    }}>
      {/* Live Session Metrics */}
      {sessionMetrics && (
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {/* Engagement Level */}
          <Tooltip title="Patient's active participation in the therapeutic process, derived from verbal responsiveness and topic engagement." arrow placement="bottom">
          <Box sx={{
            flex: 1,
            p: 1.5,
            border: '1px solid #e9ebf1',
            borderRadius: '12px',
            backgroundColor: '#fafbfd',
            minWidth: 0,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: '10px', color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Engagement
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '13px', color: '#1f1f1f', flexShrink: 0 }}>
                {Math.round(sessionMetrics.engagement_level * 100)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={sessionMetrics.engagement_level * 100}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: '#e8eaed',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: sessionMetrics.engagement_level >= 0.7 ? '#128937' : sessionMetrics.engagement_level >= 0.4 ? '#f59e0b' : '#ef4444',
                },
              }}
            />
          </Box>
          </Tooltip>

          {/* Therapeutic Alliance */}
          <Tooltip title="Strength of the therapist-patient working relationship, assessed from rapport cues and collaborative language." arrow placement="bottom">
          <Box sx={{
            flex: 1,
            p: 1.5,
            border: '1px solid #e9ebf1',
            borderRadius: '12px',
            backgroundColor: '#fafbfd',
            minWidth: 0,
          }}>
            <Typography sx={{ fontSize: '10px', color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.3px', mb: 0.5 }}>
              Alliance
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: getAllianceColor(sessionMetrics.therapeutic_alliance), flexShrink: 0 }} />
              <Typography sx={{ fontWeight: 600, fontSize: '13px', color: '#1f1f1f', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {sessionMetrics.therapeutic_alliance}
              </Typography>
            </Box>
          </Box>
          </Tooltip>

          {/* Emotional State */}
          <Tooltip title="Patient's current affective presentation, inferred from linguistic sentiment and emotional expression patterns." arrow placement="bottom">
          <Box sx={{
            flex: 1,
            p: 1.5,
            border: '1px solid #e9ebf1',
            borderRadius: '12px',
            backgroundColor: '#fafbfd',
            minWidth: 0,
          }}>
            <Typography sx={{ fontSize: '10px', color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.3px', mb: 0.5 }}>
              Emotional State
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: getEmotionalStateColor(sessionMetrics.emotional_state), flexShrink: 0 }} />
              <Typography sx={{ fontWeight: 600, fontSize: '13px', color: '#1f1f1f', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {sessionMetrics.emotional_state}
              </Typography>
            </Box>
          </Box>
          </Tooltip>

          {/* Arousal Level */}
          <Tooltip title="Patient's physiological activation level, estimated from speech rate, intensity, and affect markers." arrow placement="bottom">
          <Box sx={{
            flex: 1,
            p: 1.5,
            border: '1px solid #e9ebf1',
            borderRadius: '12px',
            backgroundColor: '#fafbfd',
            minWidth: 0,
          }}>
            <Typography sx={{ fontSize: '10px', color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.3px', mb: 0.5 }}>
              Arousal Level
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: getArousalColor(sessionMetrics.arousal_level), flexShrink: 0 }} />
              <Typography sx={{ fontWeight: 600, fontSize: '13px', color: '#1f1f1f', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {sessionMetrics.arousal_level}
              </Typography>
            </Box>
          </Box>
          </Tooltip>
        </Box>
      )}

      <Typography
        variant="h6"
        sx={{
          fontSize: '16px',
          fontWeight: 400,
          lineHeight: '24px',
          color: '#1f1f1f',
          whiteSpace: 'pre-line',
          maxHeight: '120px',
          overflow: 'auto',
        }}
      >
        {currentGuidance.content}
      </Typography>

      {/* Action Cards */}
      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Immediate Actions */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: '#444746',
            mb: 2,
            letterSpacing: '0.5px',
          }}>
            IMMEDIATE ACTIONS
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {currentGuidance.immediateActions.map((action, index) => (
              <Box key={index} sx={{ flex: 1 }}>
                <ActionCard action={action} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Contraindications */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: '#444746',
            mb: 2,
            letterSpacing: '0.5px',
          }}>
            CONTRAINDICATIONS
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {currentGuidance.contraindications.map((action, index) => (
              <Box key={index} sx={{ flex: 1 }}>
                <ActionCard action={action} isContraindication />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default GuidanceTab;
