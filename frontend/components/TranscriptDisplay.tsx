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

import React, { useEffect, useRef } from 'react';
import { Box, Typography, Paper, Fade, Divider } from '@mui/material';

interface TranscriptEntry {
  text: string;
  timestamp: string;
  is_interim?: boolean;
}

interface TranscriptDisplayProps {
  transcript: TranscriptEntry[];
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ transcript }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new entries are added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Separate final and interim transcripts
  const finalTranscripts = transcript.filter(entry => !entry.is_interim);
  const interimTranscript = transcript.find(entry => entry.is_interim);

  return (
    <Box
      ref={scrollRef}
      sx={{
        height: '100%',
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(107, 114, 128, 0.5)',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(107, 114, 128, 0.7)',
          },
        },
      }}
    >
      {/* Display final transcripts as separate paragraphs */}
      {finalTranscripts.map((entry, index) => (
        <Box
          key={index}
          sx={{
            mb: 2.5,
            pb: 2,
            borderBottom: index < finalTranscripts.length - 1 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
            <Typography 
              variant="body1" 
              sx={{ 
                lineHeight: 1.7,
                flex: 1,
                color: 'var(--on-surface)',
                fontSize: '0.95rem',
              }}
            >
              {entry.text}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                minWidth: 'fit-content',
                fontSize: '0.7rem',
                color: 'var(--on-surface-variant)',
                opacity: 0.7,
                fontWeight: 500,
              }}
            >
              {formatTime(entry.timestamp)}
            </Typography>
          </Box>
        </Box>
      ))}
      
      {/* Show interim/partial transcript */}
      {interimTranscript && (
        <Fade in={true} timeout={300}>
          <Box
            sx={{
              mb: 2,
              p: 2,
              background: 'linear-gradient(135deg, rgba(11, 87, 208, 0.05) 0%, rgba(0, 99, 155, 0.05) 100%)',
              borderRadius: '12px',
              border: '1px dashed rgba(11, 87, 208, 0.3)',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { borderColor: 'rgba(11, 87, 208, 0.3)' },
                '50%': { borderColor: 'rgba(11, 87, 208, 0.1)' },
                '100%': { borderColor: 'rgba(11, 87, 208, 0.3)' },
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
                  animation: 'blink 1s infinite',
                  '@keyframes blink': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.3 },
                  },
                }}
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'var(--primary)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.7rem',
                }}
              >
                Listening...
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                lineHeight: 1.7,
                fontStyle: 'italic',
                color: 'var(--on-surface-variant)',
                fontSize: '0.95rem',
              }}
            >
              {interimTranscript.text}
            </Typography>
          </Box>
        </Fade>
      )}
      
      {/* Empty state */}
      {finalTranscripts.length === 0 && !interimTranscript && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'var(--on-surface-variant)',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, opacity: 0.7 }}>
            Transcript will appear here when you start speaking...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TranscriptDisplay;
