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

/**
 * PatientSummary — Patient-facing post-session summary.
 *
 * This is a simplified, patient-friendly variant of TherSummary.
 * It strips out clinical-internal data (risk assessment, technique counts,
 * transcript, key moments timeline, clinical manual references, session
 * line chart) and presents only what helps the patient between sessions:
 *
 *   - Session overview (date, duration)
 *   - Progress highlights (positively framed)
 *   - Homework assignments (with interactive checkboxes)
 *   - Follow-up recommendations (in plain language)
 *   - Next session reminder
 *
 * Data flow:
 *   Backend LLM generates SessionSummary → App.tsx stores it →
 *   App.tsx maps subset of fields into PatientSummaryProps →
 *   This component renders the patient-safe view.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Checkbox,
  Divider,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  EmojiEvents,
  Assignment,
  CalendarToday,
  Timer,
  CheckCircle,
  TipsAndUpdates,
  Print,
} from '@mui/icons-material';

// ── Props ─────────────────────────────────────────────────────────

export interface PatientSummaryProps {
  onNavigateBack?: () => void;
  patientName?: string;
  sessionDate?: string;
  sessionDuration?: number; // seconds
  progressIndicators?: string[];
  homeworkAssignments?: Array<{
    task: string;
    rationale: string;
  }>;
  followUpRecommendations?: string[];
  nextSessionDate?: string; // optional reminder
}

// ── Component ─────────────────────────────────────────────────────

const PatientSummary: React.FC<PatientSummaryProps> = ({
  onNavigateBack,
  patientName = 'Your',
  sessionDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
  sessionDuration = 0,
  progressIndicators = [],
  homeworkAssignments = [],
  followUpRecommendations = [],
  nextSessionDate,
}) => {
  // Track which homework items the patient has checked off
  const [checkedHomework, setCheckedHomework] = useState<Record<number, boolean>>({});

  const toggleHomework = (index: number) => {
    setCheckedHomework((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const durationMinutes = Math.floor(sessionDuration / 60);
  const completedCount = Object.values(checkedHomework).filter(Boolean).length;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#f0f4f9',
        p: { xs: 2, md: 3 },
      }}
    >
      {/* Top Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        {onNavigateBack && (
          <Button
            startIcon={<ArrowBack />}
            onClick={onNavigateBack}
            sx={{
              color: '#0b57d0',
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 500,
              '&:hover': { backgroundColor: 'rgba(11, 87, 208, 0.04)' },
            }}
          >
            Back
          </Button>
        )}
        <Button
          startIcon={<Print />}
          onClick={() => window.print()}
          sx={{
            color: '#444746',
            textTransform: 'none',
            fontSize: '14px',
            fontWeight: 500,
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
          }}
        >
          Print
        </Button>
      </Box>

      {/* Content — single-column, card-based layout */}
      <Box
        sx={{
          maxWidth: 720,
          width: '100%',
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* ── Header Card ─────────────────────────────────── */}
        <Paper
          sx={{
            p: 4,
            borderRadius: '16px',
            boxShadow: 'none',
            border: '1px solid #e0e3e7',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafd 100%)',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#1f1f1f',
              mb: 1,
            }}
          >
            {patientName === 'Your' ? 'Your Session Summary' : `${patientName}'s Session Summary`}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday sx={{ fontSize: 18, color: '#444746' }} />
              <Typography variant="body2" sx={{ fontSize: '14px', color: '#444746' }}>
                {sessionDate}
              </Typography>
            </Box>
            {durationMinutes > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer sx={{ fontSize: 18, color: '#444746' }} />
                <Typography variant="body2" sx={{ fontSize: '14px', color: '#444746' }}>
                  {durationMinutes} minutes
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* ── Progress Highlights ──────────────────────────── */}
        {progressIndicators.length > 0 && (
          <Paper
            sx={{
              p: 4,
              borderRadius: '16px',
              boxShadow: 'none',
              border: '1px solid #e0e3e7',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <EmojiEvents sx={{ fontSize: 24, color: '#128937' }} />
              <Typography
                variant="h6"
                sx={{ fontSize: '20px', fontWeight: 500, color: '#1f1f1f' }}
              >
                Your Progress
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ fontSize: '14px', color: '#444746', mb: 2 }}
            >
              Here is what went well in today's session:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {progressIndicators.map((indicator, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}
                >
                  <CheckCircle
                    sx={{ fontSize: 20, color: '#128937', mt: 0.25, flexShrink: 0 }}
                  />
                  <Typography
                    variant="body1"
                    sx={{ fontSize: '16px', color: '#1f1f1f', lineHeight: 1.5 }}
                  >
                    {indicator}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* ── Homework Assignments ─────────────────────────── */}
        {homeworkAssignments.length > 0 && (
          <Paper
            sx={{
              p: 4,
              borderRadius: '16px',
              boxShadow: 'none',
              border: '1px solid #e0e3e7',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Assignment sx={{ fontSize: 24, color: '#0b57d0' }} />
                <Typography
                  variant="h6"
                  sx={{ fontSize: '20px', fontWeight: 500, color: '#1f1f1f' }}
                >
                  Between-Session Practice
                </Typography>
              </Box>
              {homeworkAssignments.length > 1 && (
                <Chip
                  label={`${completedCount}/${homeworkAssignments.length} done`}
                  size="small"
                  sx={{
                    backgroundColor:
                      completedCount === homeworkAssignments.length
                        ? '#e6f4ea'
                        : '#f0f4f9',
                    color:
                      completedCount === homeworkAssignments.length
                        ? '#128937'
                        : '#444746',
                    fontWeight: 500,
                    fontSize: '13px',
                  }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {homeworkAssignments.map((hw, index) => (
                <Box key={index}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      py: 2,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.02)' },
                      borderRadius: '8px',
                      px: 1,
                      mx: -1,
                    }}
                    onClick={() => toggleHomework(index)}
                  >
                    <Checkbox
                      checked={!!checkedHomework[index]}
                      onChange={() => toggleHomework(index)}
                      sx={{
                        p: 0,
                        mt: 0.25,
                        color: '#c4c7c5',
                        '&.Mui-checked': { color: '#128937' },
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontSize: '16px',
                          fontWeight: 500,
                          color: checkedHomework[index] ? '#444746' : '#1f1f1f',
                          textDecoration: checkedHomework[index]
                            ? 'line-through'
                            : 'none',
                          lineHeight: 1.5,
                        }}
                      >
                        {hw.task}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '14px',
                          color: '#444746',
                          mt: 0.5,
                          lineHeight: 1.4,
                        }}
                      >
                        {hw.rationale}
                      </Typography>
                    </Box>
                  </Box>
                  {index < homeworkAssignments.length - 1 && (
                    <Divider sx={{ backgroundColor: '#f0f4f9', ml: 5 }} />
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* ── Follow-up Recommendations ────────────────────── */}
        {followUpRecommendations.length > 0 && (
          <Paper
            sx={{
              p: 4,
              borderRadius: '16px',
              boxShadow: 'none',
              border: '1px solid #e0e3e7',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <TipsAndUpdates sx={{ fontSize: 24, color: '#b16300' }} />
              <Typography
                variant="h6"
                sx={{ fontSize: '20px', fontWeight: 500, color: '#1f1f1f' }}
              >
                What to Keep in Mind
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {followUpRecommendations.map((rec, index) => (
                <Typography
                  key={index}
                  variant="body1"
                  sx={{
                    fontSize: '16px',
                    color: '#1f1f1f',
                    lineHeight: 1.5,
                    pl: 3,
                    position: 'relative',
                    '&::before': {
                      content: `"${index + 1}."`,
                      position: 'absolute',
                      left: 0,
                      color: '#444746',
                      fontWeight: 500,
                    },
                  }}
                >
                  {rec}
                </Typography>
              ))}
            </Box>
          </Paper>
        )}

        {/* ── Next Session Reminder ────────────────────────── */}
        {nextSessionDate && (
          <Paper
            sx={{
              p: 3,
              borderRadius: '16px',
              boxShadow: 'none',
              border: '1px solid #d3e3fd',
              backgroundColor: '#f0f4ff',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <CalendarToday sx={{ fontSize: 22, color: '#0b57d0' }} />
            <Box>
              <Typography
                variant="body2"
                sx={{ fontSize: '13px', color: '#444746', fontWeight: 500 }}
              >
                Next Session
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontSize: '16px', color: '#0b57d0', fontWeight: 500 }}
              >
                {nextSessionDate}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* ── Footer ───────────────────────────────────────── */}
        <Box sx={{ textAlign: 'center', py: 3, opacity: 0.6 }}>
          <Typography variant="body2" sx={{ fontSize: '12px', color: '#444746' }}>
            This summary was generated by your therapist's session assistant.
            If you have questions, please discuss them at your next session.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default PatientSummary;
