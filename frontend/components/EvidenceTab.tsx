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
import { ChatBubbleOutline } from '@mui/icons-material';
import { Alert } from '../types/types';

const QuoteCard = ({ time, text }: { time: string, text: string }) => (
  <Paper
    sx={{
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      border: '1px solid #c4c7c5',
      borderRadius: '16px',
      flex: 1,
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="caption" sx={{ color: '#444746' }}>{time}</Typography>
      <ChatBubbleOutline sx={{ color: '#444746', fontSize: 20 }} />
    </Box>
    <Typography variant="body1" sx={{ color: '#444746' }}>
      {text}
    </Typography>
  </Paper>
);

interface EvidenceTabProps {
  currentAlert?: Alert | null;
  sessionDuration?: number;
}

const EvidenceTab: React.FC<EvidenceTabProps> = ({ currentAlert, sessionDuration = 0 }) => {
  // Format session time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!currentAlert) {
    return (
      <Box sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        overflow: 'auto',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography variant="h5" sx={{
          fontWeight: 400,
          fontSize: { xs: '20px', sm: '24px', md: '28px' },
          lineHeight: { xs: '28px', md: '36px' },
          color: '#444746',
          textAlign: 'center',
        }}>
          Evidence will appear here when alerts are generated during the session.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      overflow: 'auto',
      height: '100%',
    }}>
      {/* Alert message as main content */}
      <Typography variant="h5" sx={{
        fontWeight: 400,
        fontSize: { xs: '20px', sm: '24px', md: '28px' },
        lineHeight: { xs: '28px', md: '36px' },
        color: '#1f1f1f',
      }}>
        {currentAlert.message}
      </Typography>

      {/* Evidence section */}
      {currentAlert.evidence && currentAlert.evidence.length > 0 && (
        <Box>
          <Typography variant="overline" sx={{ color: '#444746', fontWeight: 'bold', fontSize: '14px' }}>
            EVIDENCE
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 1, flexWrap: 'wrap' }}>
            {currentAlert.evidence.map((ev, idx) => (
              <QuoteCard
                key={idx}
                time={currentAlert.timestamp
                  ? new Date(currentAlert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : formatTime(sessionDuration)
                }
                text={`"${ev}"`}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Recommendation section */}
      {currentAlert.recommendation && (
        <Box>
          <Typography variant="overline" sx={{ color: '#444746', fontWeight: 'bold', fontSize: '14px' }}>
            RECOMMENDATION
          </Typography>
          <Box sx={{ mt: 1 }}>
            {(Array.isArray(currentAlert.recommendation) ? currentAlert.recommendation : [currentAlert.recommendation]).map((rec, idx) => (
              <Typography key={idx} variant="body1" sx={{
                color: '#1f1f1f',
                mb: 1,
                pl: 2,
                borderLeft: '3px solid #0b57d0',
              }}>
                {rec}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default EvidenceTab;
