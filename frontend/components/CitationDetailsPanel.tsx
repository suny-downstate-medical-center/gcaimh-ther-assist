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
} from '@mui/material';
import { Close } from '@mui/icons-material';

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

interface CitationDetailsPanelProps {
  citation: Citation | null;
  onClose: () => void;
}

const CitationDetailsPanel: React.FC<CitationDetailsPanelProps> = ({ citation, onClose }) => {
  // Mock citation data for demonstration - in real app this would come from props
  const mockCitation = {
    citation_number: 1,
    source: {
      title: 'Comprehensive-CBT-for-Social-Phobia-Manual.pdf',
      excerpt: `Exposure Therapy Manuals and Guidebooks General Application as well as in particular disorder:

Abramowitz, J. S., Deacon, B. J., & Whiteside, S. P. H. (2019). Exposure therapy for anxiety: Principles and Practice. The Guilford Press. Davis, C. S., Lauterbach, D. (2018). Handbook of exposure therapies. Academic Press. Smits, J. A. J., Powers, M. B., & Otto, M. W. (2019). Exposure therapy for anxiety disorders: A practitioner-centered transdiagnostic approach. Oxford University Press. Stille, H., Jacqueut, J., & Aflamendi, J. (2022). Clinical Guide to Exposure Therapy Beyond Specific Phobias. Springer Publications. P. & Margraf, J. (2002). Clinical Guide to Exposure Therapy. Beyond Specific Phobias. Springer Publications. P. Obsessive-Compulsive Disorder Foa, E. B., Yadin, E., & Lichner, T. K. (2012). Exposure and response prevention for obsessive-compulsive disorder: Therapist guide. Oxford University Press. Steketee, G., & Frost, R. O. (2019). Prolonged exposure therapy for PTSD. Therapist Guide. Oxford University Press. Tull, C. L. (2006). Managing social anxiety: A cognitive behavioral guide. Social Phobia/Social Anxiety Disorder Foa, E. B., Hembree, E. A., & Rothbaum, B. O., and Rauch, S.A.M. (2019). Prolonged exposure therapy for PTSD. Therapist Guide. (2nd ed.). Oxford University Press.`,
      pages: {
        first: 1,
        last: 3
      }
    }
  };

  const displayCitation = citation || mockCitation;

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 351,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
        gap: 2,
        backgroundColor: 'white',
        zIndex: 1200,
        transform: citation ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
        borderLeft: '1px solid #e0e0e0',
        visibility: citation ? 'visible' : 'hidden',
        overflowY: 'auto',
      }}
    >
      {displayCitation && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', color: '#1f1f1f' }}>
              Source {displayCitation.citation_number}
            </Typography>
            <IconButton onClick={onClose} sx={{ p: 0.5 }}>
              <Close sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
          
          {displayCitation.source?.title && (
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
                {displayCitation.source.title}
              </Typography>
              
              {displayCitation.source.pages && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontSize: '12px',
                    color: '#666',
                    mb: 2
                  }}
                >
                  Pages {displayCitation.source.pages.first}
                  {displayCitation.source.pages.last !== displayCitation.source.pages.first &&
                    `-${displayCitation.source.pages.last}`}
                </Typography>
              )}
            </Box>
          )}

          {displayCitation.source?.excerpt && (
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
                {displayCitation.source.excerpt}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default CitationDetailsPanel;
