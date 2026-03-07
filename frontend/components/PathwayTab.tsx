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
import { Box, Typography, Chip } from '@mui/material';

interface PathwayTabProps {
  onCitationClick?: (citation: any) => void;
  onActionClick?: (action: any, isContraindication: boolean) => void;
  currentGuidance?: any;
  citations?: any[];
  techniques?: string[];
  currentAlert?: any;
  pathwayIndicators?: {
    current_approach_effectiveness: string;
    change_urgency: string;
  };
}

const PathwayTab: React.FC<PathwayTabProps> = ({ onCitationClick, currentGuidance, citations = [], techniques = [], pathwayIndicators }) => {
  const getEffectivenessStyle = (effectiveness: string) => {
    switch (effectiveness) {
      case 'effective': return { bg: '#ddf8d8', border: '#beefbb', color: '#128937', label: 'Effective' };
      case 'struggling': return { bg: '#fef3cd', border: '#fde68a', color: '#92400e', label: 'Struggling' };
      case 'ineffective': return { bg: '#fee2e2', border: '#fca5a5', color: '#b91c1c', label: 'Ineffective' };
      default: return { bg: '#f3f4f6', border: '#d1d5db', color: '#6b7280', label: 'Unknown' };
    }
  };

  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case 'none': return { bg: '#f3f4f6', border: '#d1d5db', color: '#6b7280', label: 'No Change Needed' };
      case 'monitor': return { bg: '#e8f0fe', border: '#a8c7fa', color: '#0b57d0', label: 'Monitor' };
      case 'consider': return { bg: '#fef3cd', border: '#fde68a', color: '#92400e', label: 'Consider Change' };
      case 'recommended': return { bg: '#fee2e2', border: '#fca5a5', color: '#b91c1c', label: 'Change Recommended' };
      default: return { bg: '#f3f4f6', border: '#d1d5db', color: '#6b7280', label: 'Unknown' };
    }
  };
  const handleCitationClick = (citation: any) => {
    if (onCitationClick) {
      onCitationClick(citation);
    }
  };

  // Extract rationale text, splitting on sentence boundaries for display
  const rationale = currentGuidance?.rationale || '';
  const rationaleLines = rationale
    ? rationale.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 0)
    : [];

  const hasData = rationaleLines.length > 0 || techniques.length > 0 || citations.length > 0;

  if (!hasData) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
        <Typography variant="body1" sx={{ fontSize: '16px', color: '#444746', textAlign: 'center' }}>
          Waiting for comprehensive analysis...
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
          Pathway guidance will appear here after the first analysis cycle completes.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      pb: 2,
      position: 'relative',
    }}>
      {/* Main pathway content — dynamic rationale */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rationaleLines.map((line: string, index: number) => (
          <Typography
            key={index}
            variant="h5"
            sx={{
              fontSize: '22px',
              fontWeight: 400,
              lineHeight: '30px',
              color: '#1f1f1f',
            }}
          >
            {line}
          </Typography>
        ))}
      </Box>

      {/* Pathway Indicators */}
      {pathwayIndicators && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {/* Approach Effectiveness */}
          {(() => {
            const style = getEffectivenessStyle(pathwayIndicators.current_approach_effectiveness);
            return (
              <Chip
                label={`Approach: ${style.label}`}
                size="medium"
                sx={{
                  backgroundColor: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: '20px',
                  '& .MuiChip-label': {
                    fontSize: '13px',
                    fontWeight: 600,
                    color: style.color,
                  },
                }}
              />
            );
          })()}

          {/* Change Urgency */}
          {(() => {
            const style = getUrgencyStyle(pathwayIndicators.change_urgency);
            return (
              <Chip
                label={`Urgency: ${style.label}`}
                size="medium"
                sx={{
                  backgroundColor: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: '20px',
                  '& .MuiChip-label': {
                    fontSize: '13px',
                    fontWeight: 600,
                    color: style.color,
                  },
                }}
              />
            );
          })()}
        </Box>
      )}

      {/* Techniques and Citations Row */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 3, md: 4 }, mt: 1 }}>
        {/* Techniques Detected */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#444746',
            mb: 2,
            letterSpacing: '0.5px',
          }}>
            TECHNIQUES DETECTED
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {techniques.length > 0 ? techniques.map((technique, index) => (
              <Chip
                key={index}
                label={technique}
                size="medium"
                sx={{
                  backgroundColor: '#e8f0fe',
                  border: '1px solid #c4c7c5',
                  borderRadius: '20px',
                  '& .MuiChip-label': {
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#1f1f1f',
                  },
                }}
              />
            )) : (
              <Typography variant="body2" sx={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                No techniques detected yet
              </Typography>
            )}
          </Box>
        </Box>

        {/* Citations */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#444746',
            mb: 2,
            letterSpacing: '0.5px',
          }}>
            CITATIONS
          </Typography>
          {citations.length > 0 ? citations.map((citation, index) => (
            <Typography
              key={index}
              variant="body2"
              onClick={() => handleCitationClick(citation)}
              sx={{
                fontSize: '14px',
                color: '#0b57d0',
                textDecoration: 'underline',
                cursor: 'pointer',
                mb: 0.5,
                '&:hover': {
                  textDecoration: 'none',
                },
              }}
            >
              {citation.citation_number || index + 1}. {citation.source?.title || 'Unknown Source'}
              {citation.source?.pages ? ` (p. ${citation.source.pages.first}–${citation.source.pages.last})` : ''}
            </Typography>
          )) : (
            <Typography variant="body2" sx={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
              No citations available
            </Typography>
          )}
        </Box>
      </Box>

    </Box>
  );
};

export default PathwayTab;
