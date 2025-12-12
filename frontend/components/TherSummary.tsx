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
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  Print,
  Timer,
  Psychology,
  TrendingDown,
  Assessment,
  Warning,
  Info,
  MenuBook,
  AccessTime,
  Description,
  ArrowForward,
} from '@mui/icons-material';
import SessionLineChart from './SessionLineChart';
import { formatDuration } from '../utils/timeUtils';
import { testTranscriptData } from '../utils/mockTranscript';

interface TherSummaryProps {
  onNavigateBack?: () => void;
  sessionData?: {
    id: string;
    date: string;
    duration: number; // in seconds
    techniquesUsed: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    patientName?: string;
  };
  progressIndicators?: string[];
  areasForImprovement?: string[];
  followUpRecommendations?: string[];
  homeworkAssignments?: Array<{
    title: string;
    description: string;
    reference: string;
  }>;
}

const TherSummary: React.FC<TherSummaryProps> = ({
  onNavigateBack,
  sessionData = {
    id: 'Session ID',
    date: 'September 5, 2026 at 10:45 AM',
    duration: 2460, // 41 minutes
    techniquesUsed: 18,
    riskLevel: 'Low',
    patientName: 'John Doe',
  },
  progressIndicators = [
    'Increased awareness of thought patterns',
    'Willingness to challenge automatic thoughts',
    'Engaged in homework assignments',
  ],
  areasForImprovement = [
    'Practice emotion regulation techniques',
    'Develop stronger coping strategies for acute anxiety',
  ],
  followUpRecommendations = [
    'Review thought diary entries at next session',
    'Consider introducing exposure exercises if ready',
  ],
  homeworkAssignments = [
    {
      title: 'Complete thought diary for anxiety-provoking situations',
      description: 'Build awareness of cognitive patterns',
      reference: 'CBT Manual p.45-47',
    },
    {
      title: 'Practice progressive muscle relaxation daily',
      description: 'Develop somatic coping skills',
      reference: 'CBT Manual p.45-47',
    },
  ],
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'performance' | 'key-moments' | 'transcript'>('performance');

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'Low': return '#128937';
      case 'Medium': return '#b16300';
      case 'High': return '#db372d';
      default: return '#444746';
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
        }}>
          {/* Sidebar */}
          <Box sx={{ 
            width: 351,
            display: 'flex',
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
              }}>
                John Doe
              </Typography>
              <Typography variant="body2" sx={{ 
                fontSize: '14px', 
                fontWeight: 500,
                color: '#444746',
                mb: 1,
              }}>
                {sessionData.date}
              </Typography>
            </Box>

            {/* Navigation Menu */}
            <Box>
              <Typography variant="h5" sx={{ 
                fontSize: '22px', 
                fontWeight: 500, 
                lineHeight: '28px',
                color: '#444746',
                mb: 3,
              }}>
                Session Summary
              </Typography>
              {[
                { key: 'performance', label: 'Performance', icon: <Assessment sx={{ fontSize: 24, color: '#444746' }} /> },
                { key: 'key-moments', label: 'Key Moments', icon: <AccessTime sx={{ fontSize: 24, color: '#444746' }} /> },
                { key: 'transcript', label: 'Transcript', icon: <Description sx={{ fontSize: 24, color: '#444746' }} /> },
              ].map((item) => (
                <Box
                  key={item.key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 56,
                    px: 0,
                    py: 1,
                    cursor: 'pointer',
                    backgroundColor: activeTab === item.key ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                  onClick={() => setActiveTab(item.key as any)}
                >
                  <Box sx={{ mr: 1.5, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {activeTab === item.key && item.icon ? item.icon : null}
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
            pb: 0,
            pt: 4,
            px: 0,
            gap: 3,
            overflow: 'auto',
            minHeight: 0,
          }}>
            {activeTab === 'performance' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Progress Indicators */}
                <Box sx={{ backgroundColor: 'white', px: 0, py: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" sx={{ 
                      fontSize: '22px', 
                      fontWeight: 400, 
                      color: '#1f1f1f' 
                    }}>
                      Progress Indicators
                    </Typography>
                    <Assessment sx={{ fontSize: 24, color: '#128937' }} />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {progressIndicators.map((indicator, index) => (
                      <Typography key={index} variant="body1" sx={{ 
                        fontSize: '16px',
                        color: '#444746',
                        '&::before': {
                          content: '"•"',
                          color: '#444746',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          width: '1em',
                          marginLeft: '1.5em',
                        }
                      }}>
                        {indicator}
                      </Typography>
                    ))}
                  </Box>
                </Box>

                <Divider sx={{ backgroundColor: '#c4c7c5' }} />

                {/* Areas for Improvement */}
                <Box sx={{ backgroundColor: 'white', px: 0, py: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" sx={{ 
                      fontSize: '22px', 
                      fontWeight: 400, 
                      color: '#1f1f1f' 
                    }}>
                      Areas for Improvement
                    </Typography>
                    <Warning sx={{ fontSize: 24, color: '#b16300' }} />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {areasForImprovement.map((area, index) => (
                      <Typography key={index} variant="body1" sx={{ 
                        fontSize: '16px',
                        color: '#444746',
                        '&::before': {
                          content: '"•"',
                          color: '#444746',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          width: '1em',
                          marginLeft: '1.5em',
                        }
                      }}>
                        {area}
                      </Typography>
                    ))}
                  </Box>
                </Box>

                <Divider sx={{ backgroundColor: '#c4c7c5' }} />

                {/* Follow-up Recommendations */}
                <Box sx={{ backgroundColor: 'white', px: 0, py: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" sx={{ 
                      fontSize: '22px', 
                      fontWeight: 400, 
                      color: '#1f1f1f' 
                    }}>
                      Follow-up Recommendations
                    </Typography>
                    <Info sx={{ fontSize: 24, color: '#0b57d0' }} />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {followUpRecommendations.map((recommendation, index) => (
                      <Typography key={index} variant="body1" sx={{ 
                        fontSize: '16px',
                        color: '#444746',
                        '&::before': {
                          content: '"•"',
                          color: '#444746',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          width: '1em',
                          marginLeft: '1.5em',
                        }
                      }}>
                        {recommendation}
                      </Typography>
                    ))}
                  </Box>
                </Box>

                {/* Homework Section */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  flex: 1,
                  justifyContent: 'flex-end',
                  pt: 4,
                }}>
                  <Typography variant="body2" sx={{ 
                    fontSize: '14px', 
                    fontWeight: 700,
                    color: '#444746',
                    letterSpacing: '0.1px',
                  }}>
                    HOMEWORK
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {homeworkAssignments.map((assignment, index) => (
                      <Paper 
                        key={index}
                        sx={{ 
                          flex: 1,
                          p: 2,
                          border: '1px solid #c4c7c5',
                          borderRadius: '16px',
                          backgroundColor: 'white',
                          boxShadow: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        <Typography variant="body1" sx={{ 
                          fontSize: '16px',
                          fontWeight: 500,
                          color: '#1f1f1f',
                          textAlign: 'center',
                        }}>
                          {assignment.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '14px',
                            color: '#444746',
                          }}>
                            {assignment.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ 
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#0b57d0',
                              letterSpacing: '0.1px',
                            }}>
                              {assignment.reference}
                            </Typography>
                            <MenuBook sx={{ fontSize: 20, color: '#0b57d0' }} />
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
            
            {activeTab === 'key-moments' && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 0,
                px: 4,
                py: 0,
                position: 'relative',
              }}>
                {/* Key Moment 1 */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  gap: 3,
                  position: 'relative',
                  pb: 4,
                }}>
                  <Box sx={{
                    position: 'relative',
                    zIndex: 2,
                    mt: 0.5,
                  }}>
                    <Timer sx={{ 
                      fontSize: 24, 
                      color: '#128937',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      p: 0.5,
                    }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ 
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#444746',
                      mb: 1,
                    }}>
                      03:30
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      fontSize: '16px',
                      fontWeight: 400,
                      color: '#1f1f1f',
                      mb: 0.5,
                    }}>
                      Client expressed anxiety about upcoming presentation
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      fontSize: '14px',
                      fontWeight: 400,
                      color: '#444746',
                    }}>
                      Core fear identified - social evaluation
                    </Typography>
                  </Box>
                  
                  {/* Connecting Line */}
                  <Box sx={{
                    position: 'absolute',
                    left: 12,
                    top: 32,
                    width: 2,
                    height: 78,
                    backgroundColor: '#c4c7c5',
                    zIndex: 1,
                  }} />
                </Box>

                {/* Key Moment 2 */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  gap: 3,
                  position: 'relative',
                }}>
                  <Box sx={{
                    position: 'relative',
                    zIndex: 2,
                    mt: 0.5,
                  }}>
                    <Timer sx={{ 
                      fontSize: 24, 
                      color: '#128937',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      p: 0.5,
                    }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ 
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#444746',
                      mb: 1,
                    }}>
                      15:30
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      fontSize: '16px',
                      fontWeight: 400,
                      color: '#1f1f1f',
                      mb: 0.5,
                    }}>
                      Successful cognitive restructuring of catastrophic thinking
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      fontSize: '14px',
                      fontWeight: 400,
                      color: '#444746',
                    }}>
                      Breakthrough in recognizing thinking patterns
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
            
            {activeTab === 'transcript' && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                px: 4,
                py: 0,
                overflow: 'auto',
                height: '100%',
              }}>
                {/* Transcript Content */}
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}>
                  {/* First transcript entry */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      gap: 1,
                      mb: 1,
                    }}>
                      <Typography variant="body2" sx={{ 
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#444746',
                        minWidth: '40px',
                      }}>
                        03:30
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#0b57d0',
                      }}>
                        Therapist
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ 
                      fontSize: '16px',
                      color: '#1f1f1f',
                      lineHeight: 1.5,
                      ml: '50px',
                    }}>
                      Good afternoon, Sarah. How are you feeling today?
                    </Typography>
                  </Box>

                  {/* Second transcript entry */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      gap: 1,
                      mb: 1,
                    }}>
                      <Typography variant="body2" sx={{ 
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#444746',
                        minWidth: '40px',
                      }}>
                        03:37
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#b16300',
                      }}>
                        Patient
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ 
                      fontSize: '16px',
                      color: '#1f1f1f',
                      lineHeight: 1.5,
                      ml: '50px',
                    }}>
                      I've been having a really tough week. The anxiety has been pretty overwhelming.
                    </Typography>
                  </Box>

                  {/* Patient Insights inline entry */}
                  <Box sx={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e9ebf1',
                    borderRadius: 2,
                    p: 3,
                    mb: 3,
                    maxWidth: '600px',
                  }}>
                    {/* Header with Title and View Coaching */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      mb: 2,
                    }}>
                      <Typography variant="h6" sx={{ 
                        fontSize: '16px', 
                        fontWeight: 500, 
                        color: '#1f1f1f',
                      }}>
                        Explore Patient's Internal Experience
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: '#0b57d0',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontSize: '14px', 
                          fontWeight: 500,
                          mr: 0.5,
                        }}>
                          View Coaching
                        </Typography>
                        <ArrowForward sx={{ fontSize: 16 }} />
                      </Box>
                    </Box>

                    <Typography variant="body2" sx={{ 
                      fontSize: '14px', 
                      color: '#444746',
                      mb: 3,
                      lineHeight: 1.4,
                    }}>
                      Connect physical sensations to thoughts / emotions and identify specific triggers or fears.
                    </Typography>

                    {/* Metrics */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Emotional State */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          backgroundColor: '#b16300' 
                        }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '14px', 
                            fontWeight: 500,
                            color: '#1f1f1f' 
                          }}>
                            Emotional State
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            fontSize: '14px', 
                            color: '#444746' 
                          }}>
                            Distressed
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ 
                          fontSize: '16px', 
                          fontWeight: 600,
                          color: '#1f1f1f' 
                        }}>
                          70%
                        </Typography>
                      </Box>

                      {/* Engagement Level */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          backgroundColor: '#0b57d0' 
                        }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '14px', 
                            fontWeight: 500,
                            color: '#1f1f1f' 
                          }}>
                            Engagement Level
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ 
                          fontSize: '16px', 
                          fontWeight: 600,
                          color: '#1f1f1f' 
                        }}>
                          70%
                        </Typography>
                      </Box>

                      {/* Therapeutic Alliance */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          backgroundColor: '#7b68ee' 
                        }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ 
                            fontSize: '14px', 
                            fontWeight: 500,
                            color: '#1f1f1f' 
                          }}>
                            Therapeutic Alliance
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ 
                          fontSize: '16px', 
                          fontWeight: 600,
                          color: '#1f1f1f' 
                        }}>
                          Moderate
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Continue with more transcript entries */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      gap: 1,
                      mb: 1,
                    }}>
                      <Typography variant="body2" sx={{ 
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#444746',
                        minWidth: '40px',
                      }}>
                        03:44
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#0b57d0',
                      }}>
                        Therapist
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ 
                      fontSize: '16px',
                      color: '#1f1f1f',
                      lineHeight: 1.5,
                      ml: '50px',
                    }}>
                      I'm sorry to hear you're struggling. Can you tell me more about what's been triggering your anxiety this week?
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
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
              
              <SessionLineChart duration={sessionData.duration} />
            </Box>

            {/* Event markers - positioned based on Figma design */}
            <Box sx={{ 
              position: 'absolute', 
              bottom: -40, 
              left: 0, 
              right: 0, 
              height: 32,
              backgroundColor: '#f8fafd',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
            }}>
              {/* Time labels */}
              <Typography variant="caption" sx={{ 
                fontSize: '11px',
                fontWeight: 500,
                color: '#444746',
                letterSpacing: '0.1px',
              }}>
                00:00
              </Typography>
              
              {/* Event icons */}
              <Box sx={{ position: 'relative', flex: 1, height: '100%' }}>
                <Psychology sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '6%', 
                  transform: 'translate(-50%, -50%)',
                  fontSize: 20, 
                  color: '#c05a01' 
                }} />
                <Warning sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '11%', 
                  transform: 'translate(-50%, -50%)',
                  fontSize: 20, 
                  color: '#db372d' 
                }} />
                <Psychology sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '31%', 
                  transform: 'translate(-50%, -50%)',
                  fontSize: 20, 
                  color: '#c05a01' 
                }} />
                <Warning sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '52%', 
                  transform: 'translate(-50%, -50%)',
                  fontSize: 20, 
                  color: '#db372d' 
                }} />
                <Psychology sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '73%', 
                  transform: 'translate(-50%, -50%)',
                  fontSize: 20, 
                  color: '#c05a01' 
                }} />
                <Box sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '85%', 
                  transform: 'translate(-50%, -50%)',
                  fontSize: 20, 
                  color: '#128937',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  ⚕️
                </Box>
                <Box sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '94%', 
                  transform: 'translate(-50%, -50%)',
                  fontSize: 20, 
                  color: '#128937',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  🌿
                </Box>
              </Box>
              
              <Typography variant="caption" sx={{ 
                fontSize: '11px',
                fontWeight: 500,
                color: '#444746',
                letterSpacing: '0.1px',
              }}>
                {formatDuration(sessionData.duration)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Session Header with KPIs - Now at Bottom */}
        <Box sx={{ 
          backgroundColor: 'white',
          borderTop: '1px solid #f0f4f9',
          borderRadius: '0 0 8px 8px',
        }}>
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
                {sessionData.id}
              </Typography>
            </Box>

            {/* Duration */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              px: 3, 
              py: 2,
              borderRight: '1px solid #f0f4f9',
            }}>
              <Timer sx={{ fontSize: 24, color: '#444746' }} />
              <Box>
                <Typography variant="caption" sx={{ 
                  fontSize: '11px', 
                  color: '#444746',
                  letterSpacing: '0.1px',
                }}>
                  Duration
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '16px', color: '#1f1f1f' }}>
                  {Math.floor(sessionData.duration / 60)} minutes
                </Typography>
              </Box>
            </Box>

            {/* Techniques Used */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              px: 3, 
              py: 2,
              borderRight: '1px solid #f0f4f9',
            }}>
              <Psychology sx={{ fontSize: 24, color: '#444746' }} />
              <Box>
                <Typography variant="caption" sx={{ 
                  fontSize: '11px', 
                  color: '#444746',
                  letterSpacing: '0.1px',
                }}>
                  Techniques used
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '16px', color: '#1f1f1f' }}>
                  {sessionData.techniquesUsed}
                </Typography>
              </Box>
            </Box>

            {/* Risk Level */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              px: 3, 
              py: 2,
              borderRight: '1px solid #f0f4f9',
            }}>
              <TrendingDown sx={{ fontSize: 24, color: getRiskLevelColor(sessionData.riskLevel) }} />
              <Box>
                <Typography variant="caption" sx={{ 
                  fontSize: '11px', 
                  color: '#444746',
                  letterSpacing: '0.1px',
                }}>
                  Risk level
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '16px', color: '#1f1f1f' }}>
                  {sessionData.riskLevel}
                </Typography>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'flex-end',
              gap: 1, 
              px: 2, 
              py: 2,
            }}>
              <IconButton
                sx={{
                  color: '#444746',
                  width: 40,
                  height: 40,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <Download sx={{ fontSize: 24 }} />
              </IconButton>
              <IconButton
                sx={{
                  color: '#444746',
                  width: 40,
                  height: 40,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <Print sx={{ fontSize: 24 }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TherSummary;
