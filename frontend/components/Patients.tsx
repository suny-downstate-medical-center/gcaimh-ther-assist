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

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Fab,
  TableSortLabel,
} from '@mui/material';
import {
  ArrowBack,
  Search,
  Visibility,
  Phone,
  Email,
  Add,
} from '@mui/icons-material';
import { Patient } from '../types/types';
import { mockPatients } from '../utils/mockPatients';

interface PatientsProps {
  onNavigateBack: () => void;
  onNavigateToNewSession: (patientId?: string) => void;
  onNavigateToPatient: (patientId: string) => void;
}

type SortableColumn = 'name' | 'age' | 'primaryConcern' | 'nextVisit' | 'lastVisit' | 'patientSince';
type SortDirection = 'asc' | 'desc';

const Patients: React.FC<PatientsProps> = ({ onNavigateBack, onNavigateToNewSession, onNavigateToPatient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortableColumn>('nextVisit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>(mockPatients);

  // Handle column sort
  const handleSort = (column: SortableColumn) => {
    const isAsc = sortColumn === column && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortColumn(column);
  };

  // Sort function
  const sortPatients = (patients: Patient[], column: SortableColumn, direction: SortDirection) => {
    return [...patients].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (column) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'age':
          aValue = a.age;
          bValue = b.age;
          break;
        case 'primaryConcern':
          aValue = (a.focusTopics || '').toLowerCase();
          bValue = (b.focusTopics || '').toLowerCase();
          break;
        case 'nextVisit':
          // Handle null dates by treating them as far future for desc, far past for asc
          aValue = a.nextVisit ? new Date(a.nextVisit).getTime() : (direction === 'desc' ? 0 : Infinity);
          bValue = b.nextVisit ? new Date(b.nextVisit).getTime() : (direction === 'desc' ? 0 : Infinity);
          break;
        case 'lastVisit':
          aValue = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          bValue = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
          break;
        case 'patientSince':
          aValue = new Date(a.patientSince).getTime();
          bValue = new Date(b.patientSince).getTime();
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

  // Filter and sort patients based on search term and sort settings
  React.useEffect(() => {
    let result = mockPatients;
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.focusTopics?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    result = sortPatients(result, sortColumn, sortDirection);
    
    setFilteredPatients(result);
  }, [searchTerm, sortColumn, sortDirection]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isToday = (dateString: string | null) => {
    if (!dateString) return false;
    const today = new Date();
    const date = new Date(dateString);
    return today.toDateString() === date.toDateString();
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
        pb: 4, // Add bottom padding
      }}>
        <Paper 
          elevation={3}
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            minHeight: 'calc(100vh - 80px)', // Adjust for reduced padding
            borderRadius: 2,
          }}
        >
          {/* Header */}
          <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
            {/* Back Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
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
              <Typography 
                variant="h3" 
                sx={{ 
                  color: 'var(--primary)', 
                  fontWeight: 600,
                }}
              >
                Patients
              </Typography>
            </Box>
            
            {/* Search Bar */}
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search patients by name or condition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 400 }}
            />
          </Box>

          {/* Patient List */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortColumn === 'name'}
                        direction={sortColumn === 'name' ? sortDirection : 'asc'}
                        onClick={() => handleSort('name')}
                      >
                        Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortColumn === 'age'}
                        direction={sortColumn === 'age' ? sortDirection : 'asc'}
                        onClick={() => handleSort('age')}
                      >
                        Age
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortColumn === 'nextVisit'}
                        direction={sortColumn === 'nextVisit' ? sortDirection : 'asc'}
                        onClick={() => handleSort('nextVisit')}
                      >
                        Next Session
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortColumn === 'lastVisit'}
                        direction={sortColumn === 'lastVisit' ? sortDirection : 'asc'}
                        onClick={() => handleSort('lastVisit')}
                      >
                        Last Session
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 400, width: '25%' }}>
                      Last Session Summary
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, maxWidth: 150, width: '10%' }}>
                      <TableSortLabel
                        active={sortColumn === 'primaryConcern'}
                        direction={sortColumn === 'primaryConcern' ? sortDirection : 'asc'}
                        onClick={() => handleSort('primaryConcern')}
                      >
                        Focus Topics
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortColumn === 'patientSince'}
                        direction={sortColumn === 'patientSince' ? sortDirection : 'asc'}
                        onClick={() => handleSort('patientSince')}
                      >
                        Patient Since
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow 
                      key={patient.id}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'blue', fontSize: '1.1rem' }}>
                            {patient.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            {patient.contactInfo?.phone && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Phone sx={{ fontSize: 12, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  {patient.contactInfo.phone}
                                </Typography>
                              </Box>
                            )}
                            {patient.contactInfo?.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Email sx={{ fontSize: 12, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  {patient.contactInfo.email}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{patient.age}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography 
                            variant="body2"
                            color={patient.nextVisit ? 'text.primary' : 'text.secondary'}
                          >
                            {formatDate(patient.nextVisit)}
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
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(patient.lastVisit)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 400, width: '25%' }}>
                        <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                          {patient.sessionHistory && patient.sessionHistory.length > 0 
                            ? patient.sessionHistory[patient.sessionHistory.length - 1].summary 
                            : 'No summary available'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 150, width: '10%' }}>
                        <Typography variant="body2">
                          {patient.focusTopics || 'Not specified'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(patient.patientSince)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            color="primary"
                            aria-label="view patient details"
                            onClick={() => onNavigateToPatient(patient.id)}
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="primary"
                            aria-label="start new session"
                            onClick={() => onNavigateToNewSession(patient.id)}
                          >
                            <Add />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Summary Footer */}
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#f5f5f5'
          }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredPatients.length} of {mockPatients.length} patients
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Patients;
