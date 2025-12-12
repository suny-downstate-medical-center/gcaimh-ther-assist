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
}

const PathwayTab: React.FC<PathwayTabProps> = ({ onCitationClick }) => {
  const handleCitationClick = () => {
    const citationData = {
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
    
    if (onCitationClick) {
      onCitationClick(citationData);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      pb: 4,
      position: 'relative',
    }}>
      {/* Main pathway content */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontSize: '28px',
            fontWeight: 400,
            lineHeight: '36px',
            color: '#1f1f1f',
          }}
        >
          The patient's increasing distress, dissociative symptoms, and disclosure of suicidal ideation indicate that the current cognitive-heavy approach is insufficient to manage their overwhelming anxiety and ensure safety.
        </Typography>

        <Typography 
          variant="h5" 
          sx={{ 
            fontSize: '28px',
            fontWeight: 400,
            lineHeight: '36px',
            color: '#1f1f1f',
          }}
        >
          While cognitive restructuring is a core CBT technique¹, it is not effectively translating to real-world symptom reduction for this patient, highlighting a need for more immediate, experiential, and skills-based interventions.
        </Typography>

        <Typography 
          variant="h5" 
          sx={{ 
            fontSize: '28px',
            fontWeight: 400,
            lineHeight: '36px',
            color: '#1f1f1f',
          }}
        >
          The patient's explicit feedback ('Maybe this approach just isn't working for me') is a crucial indicator that the current emphasis needs adjustment
        </Typography>
      </Box>

      {/* Techniques and Citations Row */}
      <Box sx={{ display: 'flex', gap: 6, mt: 2 }}>
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
            <Chip
              label="Cognitive Restructuring"
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
            <Chip
              label="Psychoeducation"
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
            <Chip
              label="Grounding (5-4-3-2-1)"
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
            <Chip
              label="Exposure (proposed)"
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
          <Typography 
            variant="body2" 
            onClick={handleCitationClick}
            sx={{ 
              fontSize: '14px',
              color: '#0b57d0',
              textDecoration: 'underline',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'none',
              },
            }}
          >
            1. Comprehensive-CBT-for-Social-Phobia-Manual.pdf
          </Typography>
        </Box>
      </Box>

    </Box>
  );
};

export default PathwayTab;
