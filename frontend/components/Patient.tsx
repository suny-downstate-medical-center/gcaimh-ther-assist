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
  Paper,
  Typography,
  Fab,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  Divider,
  Button,
  IconButton,
  TableSortLabel,
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Phone,
  Email,
  CalendarToday,
  MedicalServices,
  Add,
  Edit,
  Delete,
} from '@mui/icons-material';
import { Patient as PatientType, SessionHistory } from '../types/types';
import { mockPatients } from '../utils/mockPatients';

interface PatientProps {
  patientId: string;
  onNavigateBack: () => void;
  onNavigateToNewSession: (patientId?: string) => void;
}

type SortableColumn = 'date' | 'duration' | 'summary';
type SortDirection = 'asc' | 'desc';

const Patient: React.FC<PatientProps> = ({ patientId, onNavigateBack, onNavigateToNewSession }) => {
  const patient = mockPatients.find(p => p.id === patientId);
  const [sortColumn, setSortColumn] = useState<SortableColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [sortedSessionHistory, setSortedSessionHistory] = useState<SessionHistory[]>([]);

  const sessionHistory = patient?.sessionHistory || [];

  // Handle column sort
  const handleSort = (column: SortableColumn) => {
    const isAsc = sortColumn === column && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortColumn(column);
  };

  // Sort function
  const sortSessions = (sessions: SessionHistory[], column: SortableColumn, direction: SortDirection) => {
    return [...sessions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (column) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'summary':
          aValue = a.summary.toLowerCase();
          bValue = b.summary.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Sort sessions when component mounts or sort settings change
  useEffect(() => {
    const sorted = sortSessions(sessionHistory, sortColumn, sortDirection);
    setSortedSessionHistory(sorted);
  }, [sessionHistory, sortColumn, sortDirection]);

  // Check if a date is today
  const isToday = (dateString: string | null) => {
    if (!dateString) return false;
    const today = new Date();
    const date = new Date(dateString);
    return today.toDateString() === date.toDateString();
  };

  if (!patient) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--background-gradient)',
      }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error">
            Patient not found
          </Typography>
        </Paper>
      </Box>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return {
          backgroundColor: '#4caf50',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#45a049',
          }
        };
      case 'paused':
        return {
          backgroundColor: '#ff9800',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#f57c00',
          }
        };
      case 'inactive':
        return {
          backgroundColor: '#f44336',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#d32f2f',
          }
        };
      default:
        return {
          backgroundColor: '#9e9e9e',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#757575',
          }
        };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'inactive':
        return 'Inactive';
      default:
        return 'Unknown';
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--background-gradient)',
    }}>
      {/* Main Content */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        p: 3,
        gap: 3,
      }}>
        {/* Patient Information Card */}
        <Paper elevation={3} sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
              {/* Back Button */}
              <Fab
                size="medium"
                color="primary"
                aria-label="back"
                onClick={onNavigateBack}
                sx={{
                  background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00639b 0%, #0b57d0 100%)',
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 8px 20px -4px rgba(11, 87, 208, 0.35)',
                }}
              >
                <ArrowBack />
              </Fab>
              <Avatar
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: 'var(--primary)',
                  fontSize: '2rem',
                  fontWeight: 600,
                }}
              >
                {patient.name.split(' ').map(n => n[0]).join('')}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 600, color: 'var(--primary)' }}>
                  {patient.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                  <Chip 
                    label={getStatusLabel(patient.status)}
                    size="small"
                    sx={getStatusStyles(patient.status)}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Age {patient.age}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => onNavigateToNewSession(patientId)}
                sx={{
                  background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00639b 0%, #0b57d0 100%)',
                    transform: 'scale(1.02)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 12px -2px rgba(11, 87, 208, 0.35)',
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                }}
              >
                New Session
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Person color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Contact Information
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {patient.contactInfo?.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone sx={{ fontSize: 20, color: 'text.secondary' }} />
                          <Typography variant="body1">
                            {patient.contactInfo.phone}
                          </Typography>
                        </Box>
                      )}
                      {patient.contactInfo?.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Email sx={{ fontSize: 20, color: 'text.secondary' }} />
                          <Typography variant="body1">
                            {patient.contactInfo.email}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <MedicalServices color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Treatment Information
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Patient Since
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(patient.patientSince)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Focus Topics
                        </Typography>
                        <Typography variant="body1">
                          {patient.focusTopics || 'Not specified'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <CalendarToday color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Session Schedule
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Next Session
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body1">
                            {patient.nextVisit ? formatDate(patient.nextVisit) : 'Not scheduled'}
                          </Typography>
                          {isToday(patient.nextVisit) && (
                            <Chip
                              label="!"
                              size="small"
                              sx={{
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                height: 24,
                                '& .MuiChip-label': {
                                  px: 1
                                },
                                boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
                                border: '1px solid #bbdefb'
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Last Session
                        </Typography>
                        <Typography variant="body1">
                          {patient.lastVisit ? formatDate(patient.lastVisit) : 'No previous session'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Last Session Summary
                    </Typography>
                    <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                      {sessionHistory.length > 0 
                        ? sessionHistory[sessionHistory.length - 1].summary 
                        : 'No summary available for the last session.'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* Session History */}
        <Paper elevation={3} sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--primary)', mb: 3 }}>
              Session History
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortColumn === 'date'}
                        direction={sortColumn === 'date' ? sortDirection : 'asc'}
                        onClick={() => handleSort('date')}
                      >
                        Session Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortColumn === 'duration'}
                        direction={sortColumn === 'duration' ? sortDirection : 'asc'}
                        onClick={() => handleSort('duration')}
                      >
                        Duration
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 400 }}>
                      <TableSortLabel
                        active={sortColumn === 'summary'}
                        direction={sortColumn === 'summary' ? sortDirection : 'asc'}
                        onClick={() => handleSort('summary')}
                      >
                        Session Summary
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 120 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedSessionHistory.map((session) => (
                    <TableRow key={session.id} hover>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {formatDate(session.date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {session.duration} minutes
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                          {session.summary}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            sx={{
                              color: 'var(--primary)',
                              '&:hover': {
                                backgroundColor: 'rgba(11, 87, 208, 0.1)',
                                transform: 'scale(1.1)',
                              },
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            aria-label="edit session"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            sx={{
                              color: '#f44336',
                              '&:hover': {
                                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                transform: 'scale(1.1)',
                              },
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            aria-label="delete session"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ 
              p: 2, 
              mt: 2,
              borderTop: '1px solid #e0e0e0',
              backgroundColor: '#f5f5f5',
              borderRadius: '0 0 8px 8px'
            }}>
              <Typography variant="body2" color="text.secondary">
                Showing {sessionHistory.length} previous sessions
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Patient;
