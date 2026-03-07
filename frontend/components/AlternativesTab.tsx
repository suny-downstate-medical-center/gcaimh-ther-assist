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
import { Box, Typography } from '@mui/material';

interface AlternativesTabProps {
  alternativePathways?: any[];
  citations?: any[];
  onCitationClick?: (citation: any) => void;
  hasReceivedComprehensiveAnalysis?: boolean;
  waitingForComprehensiveJobId?: number | null;
  displayedComprehensiveJobId?: number | null;
  displayedRealtimeJobId?: number | null;
  currentAlert?: any;
}

const AlternativesTab: React.FC<AlternativesTabProps> = ({
  alternativePathways = [],
  citations = [],
  onCitationClick,
}) => {
  const hasData = alternativePathways.length > 0;

  if (!hasData) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
        <Typography variant="body1" sx={{ fontSize: '16px', color: '#444746', textAlign: 'center' }}>
          Waiting for comprehensive analysis...
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
          Alternative therapeutic pathways will appear here after the first analysis cycle completes.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      pb: 4,
    }}>
      {/* Dynamic alternative pathway sections */}
      {alternativePathways.map((pathway, index) => (
        <Box key={index} sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 4 } }}>
          {/* Left Content — approach name + reason */}
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: '20px',
                fontWeight: 500,
                lineHeight: '28px',
                color: '#1f1f1f',
                mb: 3,
              }}
            >
              {pathway.approach || `Alternative ${index + 1}`}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: '16px',
                lineHeight: '24px',
                color: '#444746',
                whiteSpace: 'pre-line',
              }}
            >
              {pathway.reason || 'No rationale provided.'}
            </Typography>
          </Box>

          {/* Right Content — techniques */}
          <Box sx={{ flex: 1 }}>
            {pathway.techniques && pathway.techniques.length > 0 ? (
              pathway.techniques.map((technique: string, tIndex: number) => (
                <Box key={tIndex} sx={{ mb: 3 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#444746',
                      mb: 1,
                    }}
                  >
                    {technique}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" sx={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                No specific techniques listed
              </Typography>
            )}
          </Box>
        </Box>
      ))}

      {/* Citations section */}
      {citations.length > 0 && (
        <Box sx={{ borderTop: '1px solid #e0e0e0', pt: 3 }}>
          <Typography variant="body2" sx={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#444746',
            mb: 2,
            letterSpacing: '0.5px',
          }}>
            CITATIONS
          </Typography>
          {citations.map((citation, index) => (
            <Typography
              key={index}
              variant="body2"
              onClick={() => onCitationClick && onCitationClick(citation)}
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
          ))}
        </Box>
      )}
    </Box>
  );
};

export default AlternativesTab;
