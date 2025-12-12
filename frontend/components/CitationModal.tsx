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
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Close,
  Description,
  FormatQuote,
  MenuBook,
  Article,
} from '@mui/icons-material';
import { openGcsFile } from '../utils/storageUtils';
import { useAuth } from '../contexts/AuthContext';

interface Citation {
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
}

interface CitationModalProps {
  open: boolean;
  onClose: () => void;
  citation: Citation | null;
}

const CitationModal: React.FC<CitationModalProps> = ({ open, onClose, citation }) => {
  const { currentUser } = useAuth();

  const handleViewSource = async () => {
    if (!citation?.source?.uri) return;
    
    try {
      const authToken = await currentUser?.getIdToken();
      await openGcsFile(citation.source.uri, authToken);
    } catch (error) {
      console.error('Error opening source file:', error);
    }
  };

  if (!citation) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.9) 100%)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 20px 60px -8px rgba(0, 0, 0, 0.15)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%)',
            pointerEvents: 'none',
          },
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MenuBook sx={{ 
            fontSize: 28,
            background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }} />
          <Box>
            <Typography variant="h6" fontWeight={600} color="text.primary">
              Evidence Reference
            </Typography>
            <Chip
              label={`Citation [${citation.citation_number}]`}
              size="small"
              sx={{
                mt: 0.5,
                fontWeight: 700,
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
                color: 'white',
              }}
            />
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {citation.source?.title && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Description sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                SOURCE DOCUMENT
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {citation.source.title}
            </Typography>
            {citation.source.pages && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Pages: {citation.source.pages.first}
                {citation.source.pages.last !== citation.source.pages.first &&
                  `-${citation.source.pages.last}`}
              </Typography>
            )}
          </Box>
        )}

        {citation.source?.excerpt && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FormatQuote sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                EXCERPT
              </Typography>
            </Box>
            <Box
              sx={{
                p: 3,
                background: 'rgba(250, 251, 253, 0.8)',
                borderLeft: '4px solid rgba(11, 87, 208, 0.3)',
                borderRadius: '8px',
                maxHeight: '400px',
                overflowY: 'auto',
                // Custom scrollbar styling
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(0, 0, 0, 0.05)',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(11, 87, 208, 0.3)',
                  borderRadius: '4px',
                  '&:hover': {
                    background: 'rgba(11, 87, 208, 0.5)',
                  },
                },
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  color: 'text.primary',
                  fontStyle: 'italic',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                }}
              >
                "{citation.source.excerpt}"
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
        {citation.source?.uri && (
          <Button
            variant="outlined"
            startIcon={<Article />}
            onClick={handleViewSource}
            sx={{ mr: 'auto' }}
          >
            View Full Source
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CitationModal;
