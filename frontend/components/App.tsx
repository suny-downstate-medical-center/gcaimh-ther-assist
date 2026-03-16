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

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Fab,
} from '@mui/material';
import {
  ArrowBack,
} from '@mui/icons-material';
import LandingPage from './LandingPage';
import NewSession from './NewSession';
import NewTherSession from './NewTherSession';
import TherSummary from './TherSummary';
import PatientSummary from './PatientSummary';
import Patients from './Patients';
import Patient from './Patient';
import LoginPage from './LoginPage';
import { ClientApp } from './client/ClientApp';
import ClientPortalManagementPage from './therapist/clientPortal/ClientPortalManagementPage';
import SchedulingDashboard from './scheduling/SchedulingDashboard';
import { useAuth } from '../contexts/AuthContext';
import { mockPatients } from '../utils/mockPatients';
import { Patient as PatientType, SessionSummary } from '../types/types';
import { useTherapyAnalysis } from '../hooks/useTherapyAnalysis';

const App: React.FC = () => {
  const { currentUser } = useAuth();

  // Get auth token for API calls
  const [authToken, setAuthToken] = useState<string | null>(null);
  useEffect(() => {
    const getToken = async () => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setAuthToken(token);
        } catch (e) {
          console.error('Failed to get auth token:', e);
        }
      }
    };
    getToken();
  }, [currentUser]);

  // Lifted patient state — initialized from mock data, updated in-memory on session save
  const [patients, setPatients] = useState<PatientType[]>(mockPatients);

  // Hook for fetching sessions from Firestore
  const { fetchPatientSessions } = useTherapyAnalysis({
    onAnalysis: () => {}, // Not used here
    authToken,
  });

  // Last session summary — stored when session completes, passed to TherSummary view
  const [lastSessionSummary, setLastSessionSummary] = useState<SessionSummary | null>(null);
  const [lastSessionDuration, setLastSessionDuration] = useState(0);
  const [lastSessionId, setLastSessionId] = useState('');

  // Navigation state
  const [currentView, setCurrentView] = useState<'landing' | 'patients' | 'schedule' | 'newSession' | 'patient' | 'therSummary' | 'patientSummary' | 'clientPortal' | 'clientPortalManagement'>('landing');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [sessionPatientId, setSessionPatientId] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<Array<{
    view: 'landing' | 'patients' | 'schedule' | 'newSession' | 'patient' | 'therSummary' | 'patientSummary' | 'clientPortal' | 'clientPortalManagement';
    patientId?: string | null;
    sessionPatientId?: string | null;
  }>>([]);

  // If user is not authenticated, show login page
  if (!currentUser) {
    return <LoginPage />;
  }

  // Callback when a session is saved — updates in-memory patient list and stores full summary
  const handleSessionSaved = useCallback((session: {
    id: string;
    date: string;
    duration: string;
    summary: string;
    fullSummary?: SessionSummary;
  }) => {
    // Store full summary for TherSummary view
    if (session.fullSummary) {
      setLastSessionSummary(session.fullSummary);
      setLastSessionId(session.id);
      setLastSessionDuration(parseInt(session.duration, 10) * 60 || 0); // Convert min → sec
    }

    if (!sessionPatientId) return;

    setPatients(prev => prev.map(p => {
      if (p.id !== sessionPatientId) return p;

      const durationMin = parseInt(session.duration, 10) || 0;
      const newSession = {
        id: session.id,
        date: session.date,
        duration: durationMin,
        summary: session.summary,
      };

      return {
        ...p,
        lastVisit: session.date,
        sessionHistory: [...(p.sessionHistory || []), newSession],
      };
    }));

    console.log('[App] Session saved for patient', sessionPatientId, '— updated in-memory patient list');
  }, [sessionPatientId]);

  // Navigation handlers
  const pushToHistory = (view: typeof currentView, patientId?: string | null) => {
    setNavigationHistory(prev => [...prev, { view: currentView, patientId: selectedPatientId }]);
  };

  const handleNavigateToPatients = () => {
    pushToHistory(currentView, selectedPatientId);
    setCurrentView('patients');
  };

  const handleNavigateToSchedule = () => {
    pushToHistory(currentView, selectedPatientId);
    setCurrentView('schedule');
  };

  const handleNavigateToNewSession = (patientId?: string) => {
    pushToHistory(currentView, selectedPatientId);
    setSessionPatientId(patientId || null);
    setCurrentView('newSession');
  };

  const handleNavigateToLanding = () => {
    setCurrentView('landing');
    setSelectedPatientId(null);
    setNavigationHistory([]);
  };

  const handleNavigateToPatient = async (patientId: string) => {
    pushToHistory(currentView, selectedPatientId);
    setSelectedPatientId(patientId);
    setCurrentView('patient');

    // Fetch sessions from Firestore and merge with existing data
    try {
      const firestoreSessions = await fetchPatientSessions(patientId);
      if (firestoreSessions.length > 0) {
        setPatients(prev => prev.map(p => {
          if (p.id !== patientId) return p;

          // Merge Firestore sessions with existing (avoid duplicates by ID)
          const existingIds = new Set((p.sessionHistory || []).map(s => s.id));
          const newSessions = firestoreSessions.filter((s: any) => !existingIds.has(s.id));

          return {
            ...p,
            sessionHistory: [...(p.sessionHistory || []), ...newSessions],
          };
        }));
        console.log(`[App] Loaded ${firestoreSessions.length} sessions from Firestore for patient ${patientId}`);
      }
    } catch (e) {
      console.error('[App] Failed to fetch patient sessions:', e);
    }
  };

  const handleNavigateToTherSummary = () => {
    pushToHistory(currentView, selectedPatientId);
    setCurrentView('therSummary');
  };

  const handleNavigateToPatientSummary = () => {
    pushToHistory(currentView, selectedPatientId);
    setCurrentView('patientSummary');
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const previousView = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentView(previousView.view);
      setSelectedPatientId(previousView.patientId || null);
    } else {
      // If no history, go to landing page
      handleNavigateToLanding();
    }
  };

  // Render the appropriate view based on current state
  const handleNavigateToClientPortal = () => {
    pushToHistory(currentView, selectedPatientId);
    setCurrentView('clientPortal');
  };

  if (currentView === 'landing') {
    return (
      <LandingPage
        onNavigateToPatients={handleNavigateToPatients}
        onNavigateToSchedule={handleNavigateToSchedule}
        onNavigateToNewSession={handleNavigateToNewSession}
        onNavigateToClientPortal={handleNavigateToClientPortal}
      />
    );
  }

  if (currentView === 'patients') {
    return (
      <Patients
        patients={patients}
        onNavigateBack={handleGoBack}
        onNavigateToNewSession={handleNavigateToNewSession}
        onNavigateToPatient={handleNavigateToPatient}
      />
    );
  }

  if (currentView === 'patient' && selectedPatientId) {
    return (
      <Patient
        patients={patients}
        patientId={selectedPatientId}
        onNavigateBack={handleGoBack}
        onNavigateToNewSession={handleNavigateToNewSession}
        onNavigateToClientPortal={(patientId) => {
          pushToHistory(currentView, selectedPatientId);
          setCurrentView('clientPortalManagement');
        }}
      />
    );
  }

  if (currentView === 'clientPortal') {
    return (
      <Box sx={{ position: 'relative' }}>
        <Fab
          size="medium"
          color="primary"
          aria-label="back"
          onClick={handleGoBack}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 9999,
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
        <ClientApp />
      </Box>
    );
  }

  if (currentView === 'clientPortalManagement') {
    return (
      <ClientPortalManagementPage
        clientId={selectedPatientId!}
        onNavigateBack={handleGoBack}
      />
    );
  }

  if (currentView === 'schedule') {
    return (
      <Box sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--background-gradient)',
        overflow: 'hidden',
      }}>
        <SchedulingDashboard
          patients={patients}
          onNavigateBack={handleGoBack}
          onNavigateToPatient={(id) => { setSelectedPatientId(id); pushToHistory(currentView, selectedPatientId); setCurrentView('patient'); }}
          onNavigateToNewSession={(id) => { if (id) setSessionPatientId(id); pushToHistory(currentView, selectedPatientId); setCurrentView('newSession'); }}
        />
      </Box>
    );
  }

  // Keep old schedule placeholder as fallback (unused — SchedulingDashboard above)
  if (false) {
    return (
      <Box sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--background-gradient)',
        overflow: 'hidden',
      }}>
        <Box sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}>
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
            {/* Back Button and Title Row */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, position: 'relative' }}>
              <Fab
                size="medium"
                color="primary"
                aria-label="back"
                onClick={handleGoBack}
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
                variant="h4" 
                sx={{ 
                  color: 'var(--primary)', 
                  fontWeight: 600,
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '100%',
                  textAlign: 'center'
                }}
              >
                Schedule
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              Schedule management functionality coming soon.
            </Typography>
          </Paper>
        </Box>
      </Box>
    );
  }

  if (currentView === 'therSummary') {
    const summaryPatientName = sessionPatientId
      ? patients.find(p => p.id === sessionPatientId)?.name || 'Session Summary'
      : 'Session Summary';

    // Map SessionSummary → TherSummary props (use real data if available, fallback to defaults)
    const riskLevelMap: Record<string, 'Low' | 'Medium' | 'High'> = {
      low: 'Low', moderate: 'Medium', high: 'High',
    };

    return (
      <TherSummary
        onNavigateBack={handleGoBack}
        onViewPatientSummary={handleNavigateToPatientSummary}
        sessionData={{
          id: lastSessionId || 'Session ID',
          date: lastSessionSummary?.session_date || new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
          }),
          duration: lastSessionDuration || 2460,
          techniquesUsed: lastSessionSummary?.techniques_used?.length || 0,
          riskLevel: riskLevelMap[lastSessionSummary?.risk_assessment?.level || 'low'] || 'Low',
          patientName: summaryPatientName,
        }}
        progressIndicators={lastSessionSummary?.progress_indicators}
        areasForImprovement={lastSessionSummary?.areas_for_improvement}
        followUpRecommendations={lastSessionSummary?.follow_up_recommendations}
        homeworkAssignments={lastSessionSummary?.homework_assignments?.map(hw => ({
          title: hw.task,
          description: hw.rationale,
          reference: hw.manual_reference || '',
        }))}
        alternateTherapyPaths={lastSessionSummary?.alternate_therapy_paths}
      />
    );
  }

  if (currentView === 'patientSummary') {
    const patientName = sessionPatientId
      ? patients.find(p => p.id === sessionPatientId)?.name || undefined
      : undefined;

    return (
      <PatientSummary
        onNavigateBack={handleGoBack}
        patientName={patientName}
        sessionDate={lastSessionSummary?.session_date || new Date().toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })}
        sessionDuration={lastSessionDuration || 0}
        progressIndicators={lastSessionSummary?.progress_indicators}
        homeworkAssignments={lastSessionSummary?.homework_assignments?.map(hw => ({
          task: hw.task,
          rationale: hw.rationale,
          // Note: manual_reference intentionally omitted — patient-facing view
        }))}
        followUpRecommendations={lastSessionSummary?.follow_up_recommendations}
      />
    );
  }

  // NewSession view - render the therapy session component
  return (
    <NewTherSession
      onNavigateBack={handleGoBack}
      patientId={sessionPatientId}
      onSessionSaved={handleSessionSaved}
    />
  );
};

export default App;
