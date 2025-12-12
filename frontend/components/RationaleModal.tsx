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
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Grid,
} from '@mui/material';
import { Close, PlayCircle, CheckCircle, ErrorOutline, Warning, Info, Psychology, Lightbulb } from '@mui/icons-material';
import { renderTextWithCitations } from '../utils/textRendering';
import { Citation } from '../types/types';

interface RationaleModalProps {
  open: boolean;
  onClose: () => void;
  rationale: string | undefined;
  immediateActions?: string[];
  contraindications?: string[];
  citations?: Citation[];
  onCitationClick: (citation: Citation) => void;
  detectedTechniques?: string[];
  alternativePathways?: Array<{
    approach: string;
    reason: string;
    techniques: string[];
  }>;
}

const RationaleModal: React.FC<RationaleModalProps> = ({ 
  open, 
  onClose, 
  rationale, 
  immediateActions, 
  contraindications, 
  citations = [], 
  onCitationClick,
  detectedTechniques = [],
  alternativePathways = []
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="rationale-modal-title"
      aria-describedby="rationale-modal-description"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 900,
          bgcolor: 'rgba(255, 255, 255, 0.9)', // Less opaque background
          backdropFilter: 'blur(5px)', // Blur the background
          boxShadow: 24,
          borderRadius: 2,
          maxHeight: '90vh',
          overflow: 'hidden', // Hide overflow to prevent scrollbar from overrunning rounded edges
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with close button and title - fixed at top */}
        <Box sx={{ position: 'relative', p: 4, pb: 2, flex: '0 0 auto' }}>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <Close />
          </IconButton>
          <Typography id="rationale-modal-title" variant="h6" component="h2" sx={{ color: 'var(--primary)', fontWeight: 600, mb: 2, fontSize: '1.5rem' }}>
            Rationale Details
          </Typography>
        </Box>
        
        {/* Scrollable content area */}
        <Box sx={{ 
          px: 4, 
          pb: 4, 
          flex: '1 1 auto', 
          overflowY: 'auto',
          // Custom scrollbar styling to match rounded container
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(0,0,0,0.3)',
          },
        }}>
          <Box>
            {rationale && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <Info sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    RATIONALE
                  </Typography>
                </Box>
                <Paper
                  sx={{
                    p: 2,
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    boxShadow: 'none',
                  }}
                >
                  <Typography component="div" sx={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
                    {renderTextWithCitations(rationale, {
                      citations,
                      onCitationClick: onCitationClick,
                      markdown: true
                    })}
                  </Typography>
                </Paper>
              </Box>
            )}

            {immediateActions && immediateActions.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <PlayCircle sx={{ fontSize: 20, color: 'success.main' }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.9rem' }}>
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
                        primary={<Typography component="div" sx={{ fontSize: '1.05rem', lineHeight: 1.5 }}>{renderTextWithCitations(action, {
                          citations,
                          onCitationClick: onCitationClick,
                          markdown: true
                        })}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {contraindications && contraindications.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <ErrorOutline sx={{ fontSize: 20, color: 'error.main' }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.9rem' }}>
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
                        primary={<Typography component="div" sx={{ fontSize: '1.05rem', lineHeight: 1.5 }}>{renderTextWithCitations(contraindication, {
                          citations,
                          onCitationClick: onCitationClick,
                          markdown: true
                        })}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Technique Tiles Section */}
            {detectedTechniques.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                  <Psychology sx={{ fontSize: 20, color: 'var(--primary)' }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.9rem' }}>
                    DETECTED TECHNIQUES
                  </Typography>
                </Box>

                {/* Detected Techniques */}
                <Box>
                  <Grid container spacing={1}>
                    {detectedTechniques.map((technique, idx) => (
                      <Grid item key={idx}>
                        <Chip
                          label={technique}
                          icon={<CheckCircle sx={{ fontSize: 14 }} />}
                          sx={{
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: '#059669',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '0.9rem',
                            height: 32,
                            '& .MuiChip-label': {
                              fontSize: '0.9rem',
                            },
                            '& .MuiChip-icon': {
                              color: '#059669',
                            },
                            '&:hover': {
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            },
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default RationaleModal;
