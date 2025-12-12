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
import { Box, Paper, Typography, Button, Chip, Collapse, IconButton, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { SwapHoriz, CheckCircle, Warning, TrendingDown, ExpandMore, Info, ErrorOutline, PlayCircle } from '@mui/icons-material';
import { Citation } from '../types/types';
import { renderTextWithCitations, renderMarkdown } from '../utils/textRendering';
import CitationModal from './CitationModal';

interface PathwayIndicatorProps {
  currentApproach: string;
  effectiveness: 'effective' | 'struggling' | 'ineffective' | 'unknown';
  changeUrgency?: 'none' | 'monitor' | 'consider' | 'recommended';
  rationale?: string;
  immediateActions?: string[];
  contraindications?: string[];
  alternativePathways?: Array<{
    approach: string;
    reason: string;
    techniques: string[];
  }>;
  citations?: Citation[];
  history?: Array<{
    timestamp: string;
    effectiveness: 'effective' | 'struggling' | 'ineffective' | 'unknown';
    change_urgency: 'none' | 'monitor' | 'consider' | 'recommended';
    rationale?: string;
  }>;
  onCitationClick: (citation: Citation) => void;
}

const PathwayIndicator: React.FC<PathwayIndicatorProps> = ({ 
  currentApproach, 
  effectiveness,
  rationale,
  immediateActions,
  contraindications,
  alternativePathways,
  citations = [],
  onCitationClick
}) => {
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const getEffectivenessColor = () => {
    switch (effectiveness) {
      case 'effective':
        return 'success';
      case 'struggling':
        return 'warning';
      case 'ineffective':
        return 'error';
      case 'unknown':
        return 'default';
      default:
        return 'default';
    }
  };

  const getEffectivenessIcon = () => {
    switch (effectiveness) {
      case 'effective':
        return <CheckCircle />;
      case 'struggling':
        return <Warning />;
      case 'ineffective':
        return <TrendingDown />;
      case 'unknown':
        return null;
      default:
        return null;
    }
  };

  const getEffectivenessGradient = () => {
    switch (effectiveness) {
      case 'effective':
        return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'struggling':
        return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      case 'ineffective':
        return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      case 'unknown':
        return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
      default:
        return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }
  };

  const getEffectivenessGlow = () => {
    switch (effectiveness) {
      case 'effective':
        return '0 0 20px rgba(16, 185, 129, 0.15)';
      case 'struggling':
        return '0 0 20px rgba(245, 158, 11, 0.15)';
      case 'ineffective':
        return '0 0 30px rgba(239, 68, 68, 0.2)';
      case 'unknown':
        return 'none';
      default:
        return 'none';
    }
  };

  return (
    <>
    <Paper
      sx={{
        p: 3,
        background: effectiveness === 'ineffective' 
          ? 'rgba(255, 255, 255, 0.9)' 
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: effectiveness === 'ineffective'
          ? `0 20px 40px -8px rgba(239, 68, 68, 0.15), ${getEffectivenessGlow()}`
          : '0 20px 40px -8px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: effectiveness === 'ineffective'
            ? `0 25px 50px -8px rgba(239, 68, 68, 0.2), ${getEffectivenessGlow()}`
            : '0 25px 50px -8px rgba(0, 0, 0, 0.1)',
        },
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 200px)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            color: 'var(--primary)',
            fontWeight: 600,
          }}
        >
          <SwapHoriz sx={{ 
            fontSize: 28,
            color: 'rgba(11, 87, 208, 0.6)',
            opacity: 0.8,
          }} /> 
          Current Pathway
        </Typography>
        {(immediateActions?.length || contraindications?.length || rationale) && (
          <IconButton
            size="small"
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            sx={{
              transform: detailsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            <ExpandMore />
          </IconButton>
        )}
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'var(--on-surface-variant)',
            fontWeight: 500,
            mb: 0.5,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.75rem',
          }}
        >
          Approach
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 600,
            color: 'var(--on-surface)',
            fontSize: '1.1rem',
          }}
        >
          {currentApproach}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            borderRadius: 0,
            bgcolor: effectiveness === 'effective'
              ? 'rgba(16, 185, 129, 0.08)'
              : effectiveness === 'struggling'
              ? 'rgba(245, 158, 11, 0.08)'
              : effectiveness === 'ineffective'
              ? 'rgba(239, 68, 68, 0.08)'
              : 'rgba(107, 114, 128, 0.08)',
            color: effectiveness === 'effective'
              ? 'rgba(5, 150, 105, 0.9)'
              : effectiveness === 'struggling'
              ? 'rgba(217, 119, 6, 0.9)'
              : effectiveness === 'ineffective'
              ? 'rgba(220, 38, 38, 0.9)'
              : 'rgba(75, 85, 99, 0.9)',
            border: effectiveness === 'effective'
              ? '1px solid rgba(16, 185, 129, 0.2)'
              : effectiveness === 'struggling'
              ? '1px solid rgba(245, 158, 11, 0.2)'
              : effectiveness === 'ineffective'
              ? '1px solid rgba(239, 68, 68, 0.2)'
              : '1px solid rgba(107, 114, 128, 0.2)',
          }}
        >
          {getEffectivenessIcon() && React.cloneElement(getEffectivenessIcon() as React.ReactElement, {
            sx: {
              fontSize: 16,
              opacity: 0.8,
            }
          })}
          <Typography variant="caption" fontWeight={600}>
            {effectiveness.charAt(0).toUpperCase() + effectiveness.slice(1)}
          </Typography>
        </Box>
      </Box>

      {effectiveness !== 'effective' && effectiveness !== 'unknown' && (
        <Box
          sx={{
            mt: 2.5,
            p: 2,
            background: effectiveness === 'struggling'
              ? 'rgba(245, 158, 11, 0.08)'
              : 'rgba(239, 68, 68, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: effectiveness === 'struggling'
              ? '1px solid rgba(245, 158, 11, 0.2)'
              : '1px solid rgba(239, 68, 68, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600,
              color: effectiveness === 'struggling' 
                ? '#d97706'
                : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: effectiveness === 'struggling'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 700,
                boxShadow: effectiveness === 'struggling'
                  ? '0 0 12px rgba(245, 158, 11, 0.3)'
                  : '0 0 12px rgba(239, 68, 68, 0.3)',
              }}
            >
              {effectiveness === 'struggling' ? '!' : '!!'}
            </Box>
            {effectiveness === 'struggling' 
              ? 'Monitor closely - Consider alternative approaches if no improvement'
              : 'Immediate pathway change recommended'}
          </Typography>
        </Box>
      )}

      {/* Expanded Details Section */}
      <Collapse in={detailsExpanded}>
        <Box sx={{ 
          mt: 2, 
          pt: 2, 
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          maxHeight: '400px',
          overflow: 'auto',
          // Custom scrollbar
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(11, 87, 208, 0.2)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(11, 87, 208, 0.3)',
            },
          },
        }}>
          {rationale && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <Info sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  RATIONALE
                </Typography>
              </Box>
              <Box sx={{ color: 'text.primary' }}>
                {renderTextWithCitations(rationale, {
                  citations,
                  onCitationClick: onCitationClick,
                  markdown: true
                })}
              </Box>
            </Box>
          )}

          {immediateActions && immediateActions.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <PlayCircle sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  IMMEDIATE ACTIONS
                </Typography>
              </Box>
              <List dense sx={{ p: 0 }}>
                {immediateActions.map((action, idx) => (
                  <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box sx={{ color: 'text.primary' }}>
                          {renderTextWithCitations(action, {
                            citations,
                            onCitationClick: onCitationClick,
                            markdown: true
                          })}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {contraindications && contraindications.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <ErrorOutline sx={{ fontSize: 16, color: 'error.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  CONTRAINDICATIONS
                </Typography>
              </Box>
              <List dense sx={{ p: 0 }}>
                {contraindications.map((contraindication, idx) => (
                  <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <Warning sx={{ fontSize: 14, color: 'error.main' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box sx={{ color: 'text.primary' }}>
                          {renderTextWithCitations(contraindication, {
                            citations,
                            onCitationClick: onCitationClick,
                            markdown: true
                          })}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {alternativePathways && alternativePathways.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <SwapHoriz sx={{ fontSize: 16, color: 'warning.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  ALTERNATIVE PATHWAYS
                </Typography>
              </Box>
              {alternativePathways.map((pathway, idx) => (
                <Box 
                  key={idx} 
                  sx={{ 
                    p: 1.5, 
                    mb: 1, 
                    background: 'rgba(250, 251, 253, 0.5)',
                    borderRadius: '8px',
                    border: '1px solid rgba(196, 199, 205, 0.2)',
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    {pathway.approach}
                  </Typography>
                  <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 0.5 }}>
                    {renderTextWithCitations(pathway.reason, {
                      citations,
                      onCitationClick: onCitationClick,
                      markdown: true
                    })}
                  </Box>
                  {pathway.techniques.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {pathway.techniques.map((technique, tIdx) => (
                        <Chip
                          key={tIdx}
                          label={technique}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
    </>
  );
};

export default PathwayIndicator;
