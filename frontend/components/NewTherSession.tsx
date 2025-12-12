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

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  useTheme,
  useMediaQuery,
  IconButton,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  HealthAndSafety,
  NaturePeople,
  Category,
  Exposure,
  Check,
  Warning,
  Psychology,
  Timeline,
  Stop,
  FiberManualRecord,
  ArrowBack,
  Search,
  CallSplit,
  Route,
} from '@mui/icons-material';
import { Alert, SessionMetrics, PathwayIndicators } from '../types/types';
import { formatDuration } from '../utils/timeUtils';
import { getStatusColor } from '../utils/colorUtils';
import SessionLineChart from './SessionLineChart';
import ActionDetailsPanel from './ActionDetailsPanel';
import EvidenceTab from './EvidenceTab';
import PathwayTab from './PathwayTab';
import GuidanceTab from './GuidanceTab';
import AlternativesTab from './AlternativesTab';

interface NewTherSessionProps {
  onNavigateBack?: () => void;
  onStopRecording?: () => void;
  patientId?: string | null;
  alerts?: Alert[];
  sessionMetrics?: SessionMetrics;
  pathwayIndicators?: PathwayIndicators;
  sessionDuration?: number;
  sessionPhase?: string;
  sessionId?: string;
  currentGuidance?: {
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
}

const NewTherSession: React.FC<NewTherSessionProps> = ({
  onNavigateBack,
  onStopRecording,
  patientId,
  alerts = [],
  sessionMetrics = {
    engagement_level: 70,
    therapeutic_alliance: 'moderate',
    techniques_detected: ['CBT', 'Cognitive Restructuring'],
    emotional_state: 'distressed',
    phase_appropriate: true,
  },
  pathwayIndicators = {
    current_approach_effectiveness: 'effective',
    alternative_pathways: ['Cognitive Restructuring', 'Strong adherence'],
    change_urgency: 'none',
  },
  sessionDuration = 382, // 06:22 in seconds
  sessionPhase = 'Beginning (1 - 10 minutes)',
  sessionId = 'Session ID',
  currentGuidance = {
    title: "Explore Patient's Internal Experience",
    time: '03:22',
    content: `Consider asking: 'When your heart started racing and you felt like you had to leave, what was going through your mind at that exact moment?'

Alternatively, 'What was it like to experience those physical sensations in that situation?'

This can help connect physical sensations to thoughts / emotions and identify specific triggers or fears.`,
    immediateActions: [
      {
        title: 'Safety Planning',
        description: 'Immediately complete a comprehensive safety plan with the patient',
        icon: 'safety',
      },
      {
        title: 'Reinforce Grounding',
        description: 'Continue and reinforce the use of grounding techniques (e.g., 5-4-3-2-1).',
        icon: 'grounding',
      },
    ],
    contraindications: [
      {
        title: 'Over-reliance on Cognitive Restructuring',
        description: 'Continuing to push cognitive restructuring is contraindicated.',
        icon: 'cognitive',
      },
      {
        title: 'Premature or Unsupported Exposure',
        description: 'While exposure is indicated and proposed, proceeding with exposure exercises could be counterproductive.',
        icon: 'exposure',
      },
    ],
  },
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [activeTab, setActiveTab] = useState<'guidance' | 'evidence' | 'pathway' | 'alternatives'>('guidance');
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [selectedCitation, setSelectedCitation] = useState<any>(null);
  const [isContraindication, setIsContraindication] = useState(false);

  // Generate current date in the format "Month Day, Year"
  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleActionClick = (action: any, isContra: boolean) => {
    setSelectedAction(action);
    setSelectedCitation(null); // Clear citation if action is selected
    setIsContraindication(isContra);
  };

  const handleCitationClick = (citation: any) => {
    setSelectedCitation(citation);
    setSelectedAction(null); // Clear action if citation is selected
  };

  const handleClosePanel = () => {
    setSelectedAction(null);
    setSelectedCitation(null);
  };

  const getEmotionalStateColor = (state: string) => {
    switch (state) {
      case 'calm': return '#128937';
      case 'anxious': return '#f59e0b';
      case 'distressed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      background: '#f0f4f9',
      p: 2,
    }}>
      {/* Main Container */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1,
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        {/* Main Content Area */}
        <Box sx={{ 
          display: 'flex', 
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <ActionDetailsPanel
            action={selectedAction}
            citation={selectedCitation}
            onClose={handleClosePanel}
            isContraindication={isContraindication}
          />
          {/* Sidebar */}
          <Box sx={{ 
            width: 351,
            display: 'flex',
            transform: (selectedAction || selectedCitation) ? 'translateX(-100%)' : 'translateX(0)',
            transition: 'transform 0.3s ease-in-out',
            flexDirection: 'column',
            gap: 6,
            p: 3,
          }}>
            {/* Title Section */}
            <Box>
              <Typography variant="h6" sx={{ 
                fontSize: '24px', 
                fontWeight: 600, 
                color: '#1f1f1f',
                mb: 1,
              }}>
                John Doe
              </Typography>
              <Typography variant="body2" sx={{ 
                fontSize: '14px', 
                color: '#444746',
                mb: 2,
              }}>
                {getCurrentDate()}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology sx={{ fontSize: 24, color: '#c05a01' }} />
                <Typography variant="h5" sx={{ 
                  fontSize: '22px', 
                  fontWeight: 500, 
                  lineHeight: '28px',
                  color: '#444746',
                }}>
                  {currentGuidance.title}
                </Typography>
              </Box>
            </Box>

            {/* Navigation Menu */}
            <Box>
              {[
                { key: 'guidance', label: 'Guidance', icon: <Category sx={{ fontSize: 24, color: '#444746' }} /> },
                { key: 'evidence', label: 'Evidence', icon: <Search sx={{ fontSize: 24, color: '#444746' }} /> },
                { key: 'pathway', label: 'Pathway', icon: <Route sx={{ fontSize: 24, color: '#444746' }} /> },
                { key: 'alternatives', label: 'Alternatives', icon: <CallSplit sx={{ fontSize: 24, color: '#444746' }} /> },
              ].map((item) => (
                <Box
                  key={item.key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 56,
                    px: 1.5,
                    py: 1,
                    cursor: 'pointer',
                    backgroundColor: activeTab === item.key ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                    borderBottom: item.key !== 'alternatives' ? '1px solid rgba(196, 199, 197, 0.3)' : 'none',
                  }}
                  onClick={() => setActiveTab(item.key as any)}
                >
                  <Box sx={{ mr: 1.5, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {activeTab === item.key ? item.icon : null}
                  </Box>
                  <Typography variant="body1" sx={{ fontSize: '16px', color: '#1f1f1f' }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Main Content */}
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: 3,
            gap: 2,
            overflow: 'auto',
            minHeight: 0, // Important for proper flex behavior
          }}>
            {activeTab === 'guidance' && (
              <GuidanceTab 
                currentGuidance={currentGuidance} 
                onActionClick={handleActionClick} 
              />
            )}
            {activeTab === 'evidence' && <EvidenceTab />}
            {activeTab === 'pathway' && <PathwayTab onCitationClick={handleCitationClick} />}
            {activeTab === 'alternatives' && <AlternativesTab />}
          </Box>
        </Box>

        {/* Timeline Section */}
        <Box sx={{ 
          backgroundColor: 'white',
          p: 2,
          borderTop: '1px solid #f0f4f9',
        }}>
          {/* Chart Grid */}
          <Box sx={{ position: 'relative', mb: 2 }}>
            <Box sx={{ 
              height: 84,
              backgroundColor: 'white',
              border: '1px solid #e9ebf1',
              borderRadius: 1,
              position: 'relative',
            }}>
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    top: i * 16,
                    left: 0,
                    right: 0,
                    height: '1px',
                    backgroundColor: '#e9ebf1',
                  }}
                />
              ))}
              
              <SessionLineChart duration={sessionDuration} />
            </Box>

            {/* Event markers */}
            <Tooltip title="Explore Patient's Internal Experience">
              <IconButton sx={{ position: 'absolute', bottom: -10, left: 86, transform: 'translateX(-50%)' }}>
                <Psychology sx={{ fontSize: 20, color: '#c05a01' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Suicidal Ideation Detected">
              <IconButton sx={{ position: 'absolute', bottom: -10, left: 151, transform: 'translateX(-50%)' }}>
                <Warning sx={{ fontSize: 20, color: '#db372d' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Explore Patient's Internal Experience">
              <IconButton sx={{ position: 'absolute', bottom: -10, left: 414, transform: 'translateX(-50%)' }}>
                <Psychology sx={{ fontSize: 20, color: '#c05a01' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Safety Plan Initiated">
              <IconButton sx={{ position: 'absolute', bottom: -10, right: 180, transform: 'translateX(50%)' }}>
                <HealthAndSafety sx={{ fontSize: 20, color: '#128937' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Grounding Exercise">
              <IconButton sx={{ position: 'absolute', bottom: -10, right: 60, transform: 'translateX(50%)' }}>
                <NaturePeople sx={{ fontSize: 20, color: '#128937' }} />
              </IconButton>
            </Tooltip>
          </Box>

        </Box>

        {/* Session Header with KPIs - Now at Bottom */}
        <Box sx={{ 
          backgroundColor: 'white',
          borderTop: '1px solid #f0f4f9',
          borderRadius: '0 0 8px 8px',
        }}>
          {/* Pathway Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            px: 3,
            py: 2,
            borderBottom: '1px solid #f0f4f9',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Timeline sx={{ fontSize: 24, color: '#444746' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f1f1f' }}>
                Cognitive Behavioral Therapy
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                icon={<Check sx={{ fontSize: 18, color: '#0b57d0' }} />}
                label="Cognitive Restructuring +3"
                size="small"
                sx={{
                  backgroundColor: 'transparent',
                  border: '1px solid #c4c7c5',
                  borderRadius: '8px',
                  '& .MuiChip-icon': { color: '#0b57d0' },
                  '& .MuiChip-label': { 
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#0b57d0',
                  },
                }}
              />
              <Chip
                icon={<Check sx={{ fontSize: 18, color: '#128937' }} />}
                label="Strong Adherence"
                size="small"
                sx={{
                  backgroundColor: '#ddf8d8',
                  border: '1px solid #beefbb',
                  borderRadius: '8px',
                  '& .MuiChip-icon': { color: '#128937' },
                  '& .MuiChip-label': { 
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#128937',
                  },
                }}
              />
            </Box>
          </Box>

          {/* Session Metrics Row */}
          <Box sx={{ 
            display: 'flex',
            '& > *': { flex: 1 },
          }}>
            {/* Back Button and Session ID */}
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              px: 2, 
              py: 2, 
              borderRight: '1px solid #f0f4f9',
            }}>
              {onNavigateBack && (
                <Button
                  startIcon={<ArrowBack />}
                  onClick={onNavigateBack}
                  sx={{
                    color: '#0b57d0',
                    textTransform: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    minWidth: 'auto',
                    px: 2,
                    py: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(11, 87, 208, 0.04)',
                    },
                  }}
                >
                </Button>
              )}
              <Typography variant="h6" sx={{ fontWeight: 500, fontSize: '24px', color: '#1e1e1e' }}>
                {sessionId}
              </Typography>
            </Box>

            {/* Emotional State */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              px: 3, 
              py: 2,
              borderRight: '1px solid #f0f4f9',
            }}>
              <Box sx={{ 
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                backgroundColor: getEmotionalStateColor(sessionMetrics.emotional_state),
              }} />
              <Box>
                <Typography variant="caption" sx={{ 
                  fontSize: '11px', 
                  color: '#444746',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1px',
                }}>
                  Emotional State
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1f1f1f', textTransform: 'capitalize' }}>
                  {sessionMetrics.emotional_state}
                </Typography>
              </Box>
            </Box>

            {/* Engagement Level */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              px: 3, 
              py: 2,
              borderRight: '1px solid #f0f4f9',
            }}>
              <Box sx={{ 
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                backgroundColor: '#0b57d0',
              }} />
              <Box>
                <Typography variant="caption" sx={{ 
                  fontSize: '11px', 
                  color: '#444746',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1px',
                }}>
                  Engagement Level
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1f1f1f' }}>
                  {sessionMetrics.engagement_level}%
                </Typography>
              </Box>
            </Box>

            {/* Therapeutic Alliance */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              px: 3, 
              py: 2,
              borderRight: '1px solid #f0f4f9',
            }}>
              <Box sx={{ 
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                backgroundColor: '#9254ea',
              }} />
              <Box>
                <Typography variant="caption" sx={{ 
                  fontSize: '11px', 
                  color: '#444746',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1px',
                }}>
                  Therapeutic Alliance
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1f1f1f', textTransform: 'capitalize' }}>
                  {sessionMetrics.therapeutic_alliance}
                </Typography>
              </Box>
            </Box>

            {/* Phase Indicator */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              px: 3, 
              py: 2,
              borderRight: '1px solid #f0f4f9',
            }}>
              <Check sx={{ fontSize: 24, color: '#128937' }} />
              <Box>
                <Typography variant="caption" sx={{ 
                  fontSize: '11px', 
                  color: '#444746',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1px',
                }}>
                  {sessionPhase}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1f1f1f' }}>
                  Phase-appropriate
                </Typography>
              </Box>
            </Box>

            {/* Timer and Controls */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'flex-end',
              gap: 2, 
              px: 3, 
              py: 2,
            }}>
              <Typography variant="h6" sx={{ fontWeight: 400, fontSize: '28px', color: '#444746' }}>
                {formatDuration(sessionDuration)}
              </Typography>
              <Box sx={{ 
                position: 'relative',
                width: 40,
                height: 40,
              }}>
                {/* Progress circle would go here */}
                <Box sx={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '3px solid #e0e0e0',
                  borderTop: '3px solid #0b57d0',
                  transform: 'rotate(45deg)',
                }} />
              </Box>
              <IconButton
                onClick={onStopRecording}
                sx={{
                  backgroundColor: '#f9dedc',
                  color: '#8c1d18',
                  width: 40,
                  height: 40,
                  '&:hover': {
                    backgroundColor: '#f5c6c6',
                  },
                }}
              >
                <Stop />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

    </Box>
  );
};

export default NewTherSession;
