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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Close,
  Assignment,
  TrendingUp,
  Warning,
  CheckCircle,
  Psychology,
  MenuBook,
  Download,
  Print,
  Info,
} from '@mui/icons-material';
import { SessionSummary } from '../types/types';
import { formatTimestamp } from '../utils/timeUtils';

interface SessionSummaryModalProps {
  open: boolean;
  onClose: () => void;
  summary: SessionSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  sessionId: string | null;
}

const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  open,
  onClose,
  summary,
  loading,
  error,
  onRetry,
  sessionId,
}) => {

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return '#10b981';
      case 'moderate':
        return '#f59e0b';
      case 'high':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const handleExport = () => {
    if (!summary) return;
    
    const content = JSON.stringify(summary, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-summary-${sessionId || 'unknown'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          minHeight: '80vh',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(248, 250, 252, 0.85) 100%)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 25px 70px -10px rgba(0, 0, 0, 0.18)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, transparent 100%)',
            pointerEvents: 'none',
          },
        },
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(11, 87, 208, 0.9) 0%, rgba(0, 99, 155, 0.9) 100%)',
        color: 'white',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Assignment sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={600} sx={{ fontSize: '1.75rem' }}>
            Session Summary
          </Typography>
          {sessionId && (
            <Chip
              label={`Session ${sessionId}`}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            />
          )}
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: 'white' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: 400,
            flexDirection: 'column',
            gap: 2,
          }}>
            <CircularProgress size={48} />
            <Typography color="text.secondary" sx={{ fontSize: '1.1rem' }}>
              Generating comprehensive session analysis...
            </Typography>
          </Box>
        ) : summary ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Session Overview */}
            <Paper sx={{ 
              p: 3, 
              background: 'linear-gradient(135deg, rgba(250, 251, 253, 0.6) 0%, rgba(245, 247, 250, 0.7) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.08)',
            }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.35rem' }}>
                <TrendingUp /> Session Overview
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mt: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>Duration</Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1.1rem' }}>
                    {summary.duration_minutes} minutes
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>Techniques Used</Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1.1rem' }}>
                    {summary.techniques_used.length} techniques
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>Patient Risk Level</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={summary.risk_assessment.level.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: getRiskColor(summary.risk_assessment.level),
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>

            {/* Key Moments */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.35rem' }}>
                <Psychology /> Key Therapeutic Moments
              </Typography>
              <List>
                {summary.key_moments.map((moment, idx) => (
                  <ListItem key={idx} sx={{ pl: 0 }}>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ fontSize: '1.05rem' }}>
                          <Chip label={formatTimestamp(moment.time)} size="small" sx={{ mr: 1, fontSize: '0.8rem' }} />
                          <span style={{ fontSize: '1.05rem' }}>{moment.description}</span>
                        </Box>
                      }
                      secondary={<span style={{ fontSize: '0.95rem' }}>{moment.significance}</span>}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            <Divider />

            {/* Progress & Areas for Improvement */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.35rem' }}>
                  Progress Indicators
                </Typography>
                <List dense>
                  {summary.progress_indicators.map((indicator, idx) => (
                    <ListItem key={idx} sx={{ pl: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle fontSize="small" color="success" />
                      </ListItemIcon>
                      <ListItemText primary={<span style={{ fontSize: '1.05rem' }}>{indicator}</span>} />
                    </ListItem>
                  ))}
                </List>
              </Box>
              
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.35rem' }}>
                  Areas for Improvement
                </Typography>
                <List dense>
                  {summary.areas_for_improvement.map((area, idx) => (
                    <ListItem key={idx} sx={{ pl: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Warning fontSize="small" color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={<span style={{ fontSize: '1.05rem' }}>{area}</span>} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>

            <Divider />

            {/* Homework Assignments */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.35rem' }}>
                <Assignment /> Homework Assignments
              </Typography>
              {summary.homework_assignments.map((hw, idx) => (
                <Paper key={idx} sx={{ 
                  p: 2, 
                  mb: 2, 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}>
                  <Typography variant="body1" fontWeight={600} gutterBottom sx={{ fontSize: '1.1rem' }}>
                    {hw.task}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: '1rem' }}>
                    Rationale: {hw.rationale}
                  </Typography>
                  {hw.manual_reference && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <MenuBook fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                        {hw.manual_reference}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>

            {/* Follow-up Recommendations */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontSize: '1.35rem' }}>
                Follow-up Recommendations
              </Typography>
              <List dense>
                {summary.follow_up_recommendations.map((rec, idx) => (
                  <ListItem key={idx} sx={{ pl: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Info fontSize="small" color="info" />
                    </ListItemIcon>
                    <ListItemText primary={<span style={{ fontSize: '1.05rem' }}>{rec}</span>} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        ) : error ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: 400,
            flexDirection: 'column',
            gap: 2,
          }}>
            <Warning color="error" sx={{ fontSize: 48 }} />
            <Typography color="error">{error}</Typography>
            <Button variant="contained" onClick={onRetry}>
              Retry
            </Button>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          startIcon={<Download />}
          onClick={handleExport}
          disabled={!summary}
        >
          Export
        </Button>
        <Button
          startIcon={<Print />}
          onClick={handlePrint}
          disabled={!summary}
        >
          Print
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionSummaryModal;
