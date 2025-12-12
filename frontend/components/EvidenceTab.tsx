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

const EvidenceTab = () => {
  return (
    <Box sx={{ 
      p: 3, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 3,
      overflow: 'auto',
      height: '100%',
    }}>
      <Typography variant="h5" sx={{
        fontWeight: 400,
        fontSize: '28px',
        lineHeight: '36px',
        color: '#1f1f1f',
      }}>
        The patient has disclosed suicidal ideation ('thoughts about hurting myself... to make the anxiety stop') and a recent specific incident ('looking at my knife set... had to leave the room').
      </Typography>
      <Typography variant="h5" sx={{
        fontWeight: 400,
        fontSize: '28px',
        lineHeight: '36px',
        color: '#1f1f1f',
      }}>
        This requires immediate, direct assessment of intent, plan, and means, followed by collaborative safety planning.
      </Typography>
      <Box>
        <Typography variant="overline" sx={{ color: '#444746', fontWeight: 'bold', fontSize: '14px' }}>
          EVIDENCE
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <QuoteCard 
            time="02:47" 
            text={"\"I haven't done anything, but the thoughts are getting stronger. Yesterday I was looking at my knife set in the kitchen and... I had to leave the room.\""} 
          />
          <QuoteCard 
            time="03:01"
            text='"Sometimes when everything gets too overwhelming, I have thoughts about... hurting myself. Just to make the anxiety stop."'
          />
        </Box>
      </Box>
    </Box>
  );
};

export default EvidenceTab;
