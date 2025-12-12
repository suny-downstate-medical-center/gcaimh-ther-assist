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

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Divider,
  Chip,
} from '@mui/material';
import {
  History,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface HistoryEntry<T> {
  id: string;
  timestamp: Date;
  data: T;
}

interface HistoryManagerProps<T> {
  currentData: T;
  title: string;
  renderItem: (item: T, timestamp: Date) => React.ReactNode;
  maxHistory?: number;
}

function HistoryManager<T>({ 
  currentData, 
  title, 
  renderItem,
  maxHistory = 10 
}: HistoryManagerProps<T>) {
  const [history, setHistory] = useState<HistoryEntry<T>[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Add to history when currentData changes
  useEffect(() => {
    if (currentData && JSON.stringify(currentData) !== '{}') {
      setHistory(prev => {
        const newEntry: HistoryEntry<T> = {
          id: Date.now().toString(),
          timestamp: new Date(),
          data: currentData,
        };
        
        // Check if data is the same as the last entry
        if (prev.length > 0) {
          const lastEntry = prev[0];
          if (JSON.stringify(lastEntry.data) === JSON.stringify(currentData)) {
            return prev;
          }
        }
        
        // Add new entry and limit history size
        return [newEntry, ...prev].slice(0, maxHistory);
      });
    }
  }, [currentData, maxHistory]);

  if (history.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          p: 1,
          borderRadius: '8px',
          '&:hover': {
            background: 'rgba(0, 0, 0, 0.02)',
          },
        }}
        onClick={() => setHistoryExpanded(!historyExpanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <History sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {title} History
          </Typography>
          <Chip
            label={history.length}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          />
        </Box>
        <IconButton size="small">
          {historyExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={historyExpanded}>
        <Box
          sx={{
            maxHeight: 300,
            overflowY: 'auto',
            mt: 1,
            p: 1,
            background: 'rgba(250, 251, 253, 0.5)',
            borderRadius: '8px',
            border: '1px solid rgba(196, 199, 205, 0.2)',
            // Custom scrollbar
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '3px',
              '&:hover': {
                background: 'rgba(0, 0, 0, 0.3)',
              },
            },
          }}
        >
          {history.map((entry, index) => (
            <Box key={entry.id}>
              <Box sx={{ py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                  </Typography>
                  {index === 0 && (
                    <Chip
                      label="Latest"
                      size="small"
                      color="primary"
                      sx={{
                        height: 16,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                      }}
                    />
                  )}
                </Box>
                {renderItem(entry.data, entry.timestamp)}
              </Box>
              {index < history.length - 1 && (
                <Divider sx={{ my: 1, opacity: 0.5 }} />
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

export default HistoryManager;
