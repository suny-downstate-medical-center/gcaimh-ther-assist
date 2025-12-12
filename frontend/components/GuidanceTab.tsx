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
}

const GuidanceTab: React.FC<GuidanceTabProps> = ({ currentGuidance, onActionClick }) => {
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
        borderRadius: '16px',
        minHeight: '120px',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 2 }}>
        {getActionIcon(action.icon)}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 600, 
            fontSize: '16px', 
            lineHeight: '24px',
            color: '#1f1f1f',
          }}
        >
          {action.title}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '14px', 
            lineHeight: '20px',
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
      gap: 6,
      pb: 4, // Add padding bottom to prevent cutoff
    }}>
      <Typography 
        variant="h6" 
        sx={{ 
          fontSize: '28px',
          fontWeight: 400,
          lineHeight: '36px',
          color: '#1f1f1f',
          whiteSpace: 'pre-line',
        }}
      >
        {currentGuidance.content}
      </Typography>

      {/* Action Cards */}
      <Box sx={{ display: 'flex', gap: 4 }}>
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
