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
  Box,
  Typography,
  IconButton,
  Paper,
  Button,
} from '@mui/material';
import { Close } from '@mui/icons-material';

interface ActionDetailsPanelProps {
  action: {
    title: string;
    description: string;
    icon: string;
  } | null;
  citation: {
    citation_number: number;
    source?: {
      title?: string;
      uri?: string;
      excerpt?: string;
      pages?: {
        first: number;
        last: number;
      };
    };
  } | null;
  onClose: () => void;
  isContraindication?: boolean;
}

const ActionDetailsPanel: React.FC<ActionDetailsPanelProps> = ({ action, citation, onClose, isContraindication }) => {
  const isVisible = action || citation;
  
  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 351,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
        gap: 2,
        backgroundColor: 'white',
        zIndex: 1200,
        transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
        borderRight: '1px solid #e0e0e0',
        visibility: isVisible ? 'visible' : 'hidden',
        overflowY: 'auto',
      }}
    >
      {action && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isContraindication ? 'Contraindication' : 'Immediate Action'}
            </Typography>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 500, mb: 1 }}>
              {action.title}
            </Typography>
            <Typography variant="body1">
              {action.description}
            </Typography>
          </Box>
        </>
      )}
      
      {citation && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', color: '#1f1f1f' }}>
              Source {citation.citation_number}
            </Typography>
            <IconButton onClick={onClose} sx={{ p: 0.5 }}>
              <Close sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
          
          {citation.source?.title && (
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  fontSize: '16px',
                  color: '#1f1f1f',
                  lineHeight: '24px',
                  mb: 1
                }}
              >
                {citation.source.title}
              </Typography>
              
              {citation.source.pages && (
                <>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: '12px',
                      color: '#666',
                      mb: 1
                    }}
                  >
                    Pages {citation.source.pages.first}
                    {citation.source.pages.last !== citation.source.pages.first &&
                      `-${citation.source.pages.last}`}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      fontWeight: 500,
                      borderColor: '#c4c7c5',
                      color: '#1f1f1f',
                      mb: 2,
                      '&:hover': {
                        borderColor: '#0b57d0',
                        backgroundColor: 'rgba(11, 87, 208, 0.04)',
                      },
                    }}
                  >
                    Show Full Text
                  </Button>
                </>
              )}
            </Box>
          )}

          {citation.source?.excerpt && (
            <Box>
              <Typography
                variant="body1"
                sx={{
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#1f1f1f',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {citation.source.excerpt}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default ActionDetailsPanel;
