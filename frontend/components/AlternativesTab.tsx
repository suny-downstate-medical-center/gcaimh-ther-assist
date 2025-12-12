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

const AlternativesTab: React.FC = () => {
  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      pb: 4,
    }}>
      {/* Safety Planning Section */}
      <Box sx={{ display: 'flex', gap: 4 }}>
        {/* Left Content */}
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
            Safety Planning
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
            Given the patient's difficulty managing overwhelming anxiety ('anxiety just takes over completely') and dissociative symptoms, integrating skills from Dialectical Behavior Therapy (DBT) such as distress tolerance (e.g., TIPP skills, self-soothing) and emotion regulation would be highly beneficial. These skills provide concrete tools for managing intense emotional states that cognitive work alone cannot address.
          </Typography>
        </Box>

        {/* Right Content */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '14px',
                fontWeight: 500,
                color: '#444746',
                mb: 1,
              }}
            >
              TIPP skills (Temperature, Intense exercise, Paced breathing, Paired muscle relaxation)
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '14px',
                fontWeight: 500,
                color: '#444746',
                mb: 1,
              }}
            >
              Self-soothing with the five senses
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '14px',
                fontWeight: 500,
                color: '#444746',
                mb: 1,
              }}
            >
              Pros and Cons of tolerating distress
            </Typography>
          </Box>

          <Box>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '14px',
                fontWeight: 500,
                color: '#444746',
                mb: 1,
              }}
            >
              Mindfulness of current emotion
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Systematic Graded Exposure Section */}
      <Box sx={{ display: 'flex', gap: 4 }}>
        {/* Left Content */}
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
            Systematic Graded Exposure with Skills Integration
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
            Exposure therapy is the most effective treatment for anxiety disorders, especially social anxiety. However, for this patient, it needs to be introduced gradually and explicitly linked with distress tolerance skills to ensure they can manage the anxiety experienced during exposure, rather than becoming overwhelmed or dissociating.
          </Typography>
        </Box>

        {/* Right Content */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '14px',
                fontWeight: 500,
                color: '#444746',
                mb: 1,
              }}
            >
              Hierarchy development
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '14px',
                fontWeight: 500,
                color: '#444746',
                mb: 1,
              }}
            >
              In-vivo or imaginal exposure (graduated)
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '14px',
                fontWeight: 500,
                color: '#444746',
                mb: 1,
              }}
            >
              Interoceptive exposure (if panic is a significant component)
            </Typography>
          </Box>

          <Box>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '14px',
                fontWeight: 500,
                color: '#444746',
                mb: 1,
              }}
            >
              Systematic desensitization
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AlternativesTab;
