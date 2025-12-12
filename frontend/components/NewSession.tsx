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

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Collapse,
  Badge,
  Drawer,
  Fab,
  useMediaQuery,
  useTheme,
  LinearProgress,
} from '@mui/material';
import {
  Mic,
  Stop,
  Pause,
  PlayArrow,
  Info,
  TrendingUp,
  FiberManualRecord,
  ExpandLess,
  ExpandMore,
  Article,
  Shield,
  Close,
  Chat,
  SwapHoriz,
  Psychology,
  ArrowBack,
  VolumeUp,
  Build,
  Lightbulb,
  Assessment,
  Explore,
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import TranscriptDisplay from './TranscriptDisplay';
import AlertDisplay from './AlertDisplay';
import SessionMetrics from './SessionMetrics';
import PathwayIndicator from './PathwayIndicator';
import SessionPhaseIndicator from './SessionPhaseIndicator.tsx';
import SessionSummaryModal from './SessionSummaryModal';
import RationaleModal from './RationaleModal';
import CitationModal from './CitationModal';
import SessionVitals from './SessionVitals';
import { useAudioStreamingWebSocket } from '../hooks/useAudioStreamingWebSocket';
import { useTherapyAnalysis } from '../hooks/useTherapyAnalysis';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration } from '../utils/timeUtils';
import { getStatusColor } from '../utils/colorUtils';
import { renderMarkdown } from '../utils/textRendering';
import { processNewAlert, cleanupOldAlerts } from '../utils/alertDeduplication';
import { SessionContext, Alert as IAlert, Citation, SessionSummary } from '../types/types';
import { testTranscriptData } from '../utils/mockTranscript.ts';
import { mockPatients } from '../utils/mockPatients';

interface NewSessionProps {
  onNavigateBack: () => void;
  patientId?: string | null;
}

const NewSession: React.FC<NewSessionProps> = ({ onNavigateBack, patientId }) => {
  const { currentUser } = useAuth();
  const isDesktop = useMediaQuery(useTheme().breakpoints.up('lg'));
  const isWideScreen = useMediaQuery('(min-width:1024px)');
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState<'microphone' | 'test' | 'audio' | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [pausedTime, setPausedTime] = useState(0); // Total paused time in seconds
  const [lastPauseTime, setLastPauseTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [newTranscriptCount, setNewTranscriptCount] = useState(0);
  const [sessionContext] = useState<SessionContext>({
    session_type: 'CBT',
    primary_concern: 'Anxiety',
    current_approach: 'Cognitive Behavioral Therapy',
  });
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [wordsSinceLastAnalysis, setWordsSinceLastAnalysis] = useState(0);
  const [selectedAlertIndex, setSelectedAlertIndex] = useState<number | null>(null);

  const [transcript, setTranscript] = useState<Array<{
    text: string;
    timestamp: string;
    is_interim?: boolean;
  }>>([]);

  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [sessionMetrics, setSessionMetrics] = useState({
    engagement_level: 0.0,
    therapeutic_alliance: 'unknown' as 'strong' | 'moderate' | 'weak' | 'unknown',
    techniques_detected: [] as string[],
    emotional_state: 'unknown' as 'calm' | 'anxious' | 'distressed' | 'dissociated' | 'engaged' | 'unknown',
    phase_appropriate: false,
  });
  const [pathwayIndicators, setPathwayIndicators] = useState({
    current_approach_effectiveness: 'unknown' as 'effective' | 'struggling' | 'ineffective' | 'unknown',
    alternative_pathways: [] as string[],
    change_urgency: 'monitor' as 'none' | 'monitor' | 'consider' | 'recommended',
  });
  const [pathwayGuidance, setPathwayGuidance] = useState<{
    rationale?: string;
    immediate_actions?: string[];
    contraindications?: string[];
    alternative_pathways?: Array<{
      approach: string;
      reason: string;
      techniques: string[];
    }>;
  }>({});
  const [pathwayHistory, setPathwayHistory] = useState<Array<{
    timestamp: string;
    effectiveness: 'effective' | 'struggling' | 'ineffective' | 'unknown';
    change_urgency: 'none' | 'monitor' | 'consider' | 'recommended';
    rationale?: string;
  }>>([]);
  const [riskLevel] = useState<'low' | 'moderate' | 'high' | null>(null);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [sessionSummaryClosed, setSessionSummaryClosed] = useState(false);
  const [showRationaleModal, setShowRationaleModal] = useState(false);
  const [citationModalOpen, setCitationModalOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  
  // Comprehensive analysis tracking
  const [hasReceivedComprehensiveAnalysis, setHasReceivedComprehensiveAnalysis] = useState(false);
  
  // Test mode state
  const [isTestMode, setIsTestMode] = useState(false);
  const testIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if a session has been completed to keep test buttons hidden
  const [hasCompletedSession, setHasCompletedSession] = useState(false);

  // Audio streaming hook with WebSocket for both microphone and file
  const { 
    isConnected, 
    startMicrophoneRecording, 
    startAudioFileStreaming,
    pauseAudioStreaming,
    resumeAudioStreaming,
    stopStreaming, 
    isPlayingAudio,
    audioProgress,
    sessionId 
  } = useAudioStreamingWebSocket({
    authToken,
    onTranscript: (newTranscript: any) => {
      if (newTranscript.is_interim) {
        setTranscript(prev => {
          const newEntry = {
            text: newTranscript.transcript || '',
            timestamp: newTranscript.timestamp || new Date().toISOString(),
            is_interim: true,
          };
          
          if (prev.length > 0 && prev[prev.length - 1].is_interim) {
            return [...prev.slice(0, -1), newEntry];
          }
          return [...prev, newEntry];
        });
      } else {
        setTranscript(prev => {
          const filtered = prev.filter(entry => !entry.is_interim);
          return [...filtered, {
            text: newTranscript.transcript || '',
            timestamp: newTranscript.timestamp || new Date().toISOString(),
            is_interim: false,
          }];
        });
        
        if (!transcriptOpen) {
          setNewTranscriptCount(prev => prev + 1);
        }
      }
    },
    onError: (error: string) => {
      // Log streaming errors for debugging but don't show them as alerts
      // Only show therapeutic guidance alerts from successful analysis
      console.error('Streaming error (not shown to user):', error);
    }
  });

  // Get Firebase auth token
  useEffect(() => {
    const getAuthToken = async () => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setAuthToken(token);
        } catch (error) {
          console.error('Error getting auth token:', error);
          setAuthToken(null);
        }
      } else {
        setAuthToken(null);
      }
    };

    getAuthToken();
  }, [currentUser]);

  // Track logged analyses to prevent duplicate logs in Strict Mode
  const lastLoggedAnalysisRef = useRef<Set<string>>(new Set());

  const { analyzeSegment, generateSessionSummary } = useTherapyAnalysis({
    authToken,
    onAnalysis: (analysis) => {
      const analysisType = (analysis as any).analysis_type;
      const isRealtime = analysisType === 'realtime';
      
      // Create a unique identifier for this analysis to prevent duplicate logs
      const analysisId = `${analysisType}-${Date.now()}-${JSON.stringify(analysis).length}`;
      
      // Only log if we haven't logged this analysis before (prevents Strict Mode duplicate logs)
      if (!lastLoggedAnalysisRef.current.has(analysisId)) {
        lastLoggedAnalysisRef.current.add(analysisId);
        
        // Clean up old entries to prevent memory leaks (keep only last 50)
        if (lastLoggedAnalysisRef.current.size > 50) {
          const entries = Array.from(lastLoggedAnalysisRef.current);
          lastLoggedAnalysisRef.current = new Set(entries.slice(-25));
        }
      }
      
      if (isRealtime) {
        // Real-time analysis: Only update alerts
        if (analysis.alert) {
          const newAlert = {
            ...analysis.alert,
            sessionTime: sessionDuration,
            timestamp: new Date().toISOString()
          };

          setAlerts(prev => {
            const result = processNewAlert(newAlert, prev, { debugMode: false });

            if (result.shouldAdd) {
              const updatedAlerts = [newAlert, ...prev].slice(0, 8);
              
              // Create unique log identifier for this specific alert
              const alertLogId = `new-alert-${newAlert.timestamp}-${newAlert.title}`;
              if (!lastLoggedAnalysisRef.current.has(alertLogId)) {
                lastLoggedAnalysisRef.current.add(alertLogId);
                console.log(`[Session] ⚠️ New ${newAlert.category} alert: "${newAlert.title}" (${newAlert.timing})`);
              }
              
              return updatedAlerts;
            } else {
              const reason = result.blockReason || 'deduplication rules';
              const similarAlertInfo = result.similarAlert 
                ? ` (similar to: "${result.similarAlert.title}")` 
                : '';
              
              // Create unique log identifier for this specific filter event
              const filterLogId = `filter-alert-${Date.now()}-${analysis.alert?.title || 'unknown'}`;
              if (!lastLoggedAnalysisRef.current.has(filterLogId)) {
                lastLoggedAnalysisRef.current.add(filterLogId);
                console.log(`[Session] 🚫 Alert filtered: ${reason}${similarAlertInfo}`, {
                  filteredAlert: analysis.alert,
                  similarAlert: result.similarAlert
                });
              }
              
              return prev;
            }
          });
        }
      } else {
        // Comprehensive RAG analysis: Update metrics, pathway, citations
        setHasReceivedComprehensiveAnalysis(true);
        
        if (analysis.session_metrics) {
          setSessionMetrics(prev => ({
            ...prev,
            ...analysis.session_metrics
          }));
        }
        
        if (analysis.pathway_indicators) {
          const newIndicators = analysis.pathway_indicators;
          
          // Check if there's a change in urgency or effectiveness to add to history
          if (pathwayIndicators.change_urgency !== newIndicators.change_urgency ||
              pathwayIndicators.current_approach_effectiveness !== newIndicators.current_approach_effectiveness) {
            setPathwayHistory(prev => [...prev, {
              timestamp: new Date().toISOString(),
              effectiveness: newIndicators.current_approach_effectiveness || 'unknown',
              change_urgency: newIndicators.change_urgency || 'none',
              rationale: (analysis as any).pathway_guidance?.rationale
            }].slice(-10));
          }
          
          setPathwayIndicators(prev => ({
            ...prev,
            ...newIndicators
          }));
        }
        
        if ((analysis as any).pathway_guidance) {
          setPathwayGuidance((analysis as any).pathway_guidance);
        }
        
        if (analysis.citations) {
          setCitations(analysis.citations);
        }
      }
    },
  });

  // Update session duration every second (accounting for paused time)
  useEffect(() => {
    if (!isRecording || !sessionStartTime || isPaused) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - sessionStartTime.getTime()) / 1000);
      setSessionDuration(elapsed - pausedTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, sessionStartTime, isPaused, pausedTime]);

  // Store analysis functions in refs to avoid recreating intervals
  const analyzeSegmentRef = useRef(analyzeSegment);
  
  // Store transcript in ref to avoid stale closures
  const transcriptRef = useRef(transcript);
  const sessionMetricsRef = useRef(sessionMetrics);
  const alertsRef = useRef(alerts);
  const sessionContextRef = useRef(sessionContext);
  const sessionDurationRef = useRef(sessionDuration);
  
  useEffect(() => {
    analyzeSegmentRef.current = analyzeSegment;
  }, [analyzeSegment]);
  
  // Update refs when state changes
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  
  useEffect(() => {
    sessionMetricsRef.current = sessionMetrics;
  }, [sessionMetrics]);
  
  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);
  
  useEffect(() => {
    sessionContextRef.current = sessionContext;
  }, [sessionContext]);
  
  useEffect(() => {
    sessionDurationRef.current = sessionDuration;
  }, [sessionDuration]);

  // Word-based real-time analysis trigger (simplified)
  useEffect(() => {
    if (!isRecording || transcript.length === 0) return;
    
    const lastEntry = transcript[transcript.length - 1];
    if (!lastEntry || lastEntry.is_interim) return;
    
    // Count words in the new entry
    const newWords = lastEntry.text.split(' ').filter(word => word.trim()).length;
    
    setWordsSinceLastAnalysis(prev => {
      const updatedWordCount = prev + newWords;
      
      // Trigger analysis every 10 words
      const WORDS_PER_ANALYSIS = 10;
      const TRANSCRIPT_WINDOW_MINUTES = 5;
      
      if (updatedWordCount >= WORDS_PER_ANALYSIS) {
        console.log(`[Session] 🔄 Auto-analysis triggered (${updatedWordCount} words)`);
        
        // Get last 5 minutes of transcript
        const fiveMinutesAgo = new Date(Date.now() - TRANSCRIPT_WINDOW_MINUTES * 60 * 1000);
        const recentTranscript = transcript
          .filter(t => !t.is_interim && new Date(t.timestamp) > fiveMinutesAgo)
          .map(t => ({
            speaker: 'conversation',
            text: t.text,
            timestamp: t.timestamp
          }));
        
        if (recentTranscript.length > 0) {
          // Get the most recent alert for backend deduplication
          const recentAlert = alertsRef.current.length > 0 ? alertsRef.current[0] : null;
          
          // Trigger both real-time and comprehensive analysis
          analyzeSegmentRef.current(
            recentTranscript,
            { ...sessionContextRef.current, is_realtime: true },
            Math.floor(sessionDurationRef.current / 60),
            recentAlert
          );
          
          analyzeSegmentRef.current(
            recentTranscript,
            { ...sessionContextRef.current, is_realtime: false },
            Math.floor(sessionDurationRef.current / 60)
          );
        }
        
        // Reset word count
        return 0;
      }
      
      return updatedWordCount;
    });
  }, [transcript, isRecording]);

  const handleStartSession = async () => {
    setSessionStartTime(new Date());
    setIsRecording(true);
    setSessionType('microphone');
    setSessionSummaryClosed(false);
    setSessionSummary(null);
    setSummaryError(null);
    setPausedTime(0);
    setIsPaused(false);
    setHasReceivedComprehensiveAnalysis(false);
    await startMicrophoneRecording();
  };

  const handlePauseResume = async () => {
    if (isPaused) {
      // Resume
      const now = new Date();
      if (lastPauseTime) {
        const pauseDuration = Math.floor((now.getTime() - lastPauseTime.getTime()) / 1000);
        setPausedTime(prev => prev + pauseDuration);
      }
      setIsPaused(false);
      setLastPauseTime(null);
      
      // Resume based on session type
      if (sessionType === 'microphone') {
        await startMicrophoneRecording();
      } else if (sessionType === 'audio') {
        await resumeAudioStreaming();
      } else if (sessionType === 'test') {
        resumeTestMode();
      }
    } else {
      // Pause
      setIsPaused(true);
      setLastPauseTime(new Date());
      
      // Pause based on session type
      if (sessionType === 'microphone') {
        await stopStreaming();
      } else if (sessionType === 'audio') {
        pauseAudioStreaming();
      } else if (sessionType === 'test') {
        pauseTestMode();
      }
    }
  };

  const handleStopSession = async () => {
    setIsRecording(false);
    setIsPaused(false);
    setSessionType(null);
    setHasCompletedSession(true); // Mark that a session has been completed
    await stopStreaming();
    if (isTestMode) {
      stopTestMode();
    }
    if (transcript.length > 0) {
      requestSummary();
    }
  };

  const requestSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    setSessionSummaryClosed(true);
    try {
      const fullTranscript = transcript
        .filter(t => !t.is_interim)
        .map(t => ({
          speaker: 'conversation',
          text: t.text,
          timestamp: t.timestamp,
        }));
      
      const result = await generateSessionSummary(fullTranscript, sessionMetrics);

      if (result.summary) {
        setSessionSummary(result.summary);
      } else {
        throw new Error('Invalid summary response');
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      setSummaryError('Failed to generate session summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadTestTranscript = () => {
    setIsTestMode(true);
    setIsRecording(true);
    setSessionType('test');
    setSessionStartTime(new Date());
    setTranscript([]);
    setPausedTime(0);
    setIsPaused(false);
    setHasReceivedComprehensiveAnalysis(false);
    setPathwayGuidance({
      rationale: "This is a test rationale for the loaded transcript. The pathway is being monitored based on the current interaction.",
      immediate_actions: ["Test Action: Build more rapport with the client.", "Test Action: Validate the client's feelings about the situation."],
      contraindications: ["Test Contraindication: Avoid challenging the client's core beliefs at this early stage.", "Test Contraindication: Do not assign homework that is too demanding."],
    });
    
    let currentIndex = 0;
    testIntervalRef.current = setInterval(() => {
        if (currentIndex >= testTranscriptData.length) {
          if (testIntervalRef.current) {
            clearInterval(testIntervalRef.current);
            testIntervalRef.current = null;
          }
          setIsTestMode(false);
          return;
        }
        
        const entry = testTranscriptData[currentIndex];
        const formattedEntry = {
          text: entry.speaker ? `${entry.speaker}: ${entry.text}` : entry.text,
          timestamp: new Date().toISOString(),
          is_interim: false,
        };
        
        setTranscript(prev => [...prev, formattedEntry]);
        
        if (!transcriptOpen) {
          setNewTranscriptCount(prev => prev + 1);
        }
        
        currentIndex++;
    }, 2000);
  };

  const pauseTestMode = () => {
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
  };

  const resumeTestMode = () => {
    if (isTestMode && !testIntervalRef.current) {
      // Resume from where we left off
      const currentTranscriptLength = transcript.filter(t => !t.is_interim).length;
      let currentIndex = currentTranscriptLength;
      
      testIntervalRef.current = setInterval(() => {
        if (currentIndex >= testTranscriptData.length) {
          if (testIntervalRef.current) {
            clearInterval(testIntervalRef.current);
            testIntervalRef.current = null;
          }
          setIsTestMode(false);
          return;
        }
        
        const entry = testTranscriptData[currentIndex];
        const formattedEntry = {
          text: entry.speaker ? `${entry.speaker}: ${entry.text}` : entry.text,
          timestamp: new Date().toISOString(),
          is_interim: false,
        };
        
        setTranscript(prev => [...prev, formattedEntry]);
        
        if (!transcriptOpen) {
          setNewTranscriptCount(prev => prev + 1);
        }
        
        currentIndex++;
      }, 2000);
    }
  };

  const loadExampleAudio = async () => {
    setIsRecording(true);
    setSessionType('audio');
    setSessionStartTime(new Date());
    setTranscript([]);
    setSessionSummaryClosed(false);
    setSessionSummary(null);
    setSummaryError(null);
    setPausedTime(0);
    setIsPaused(false);
    setHasReceivedComprehensiveAnalysis(false);
    
    // Start streaming the example audio file
    await startAudioFileStreaming('/audio/suny-good-audio.mp3');
  };

  const stopTestMode = () => {
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
    setIsTestMode(false);
    setIsRecording(false);
  };

  const handleDismissAlert = (index: number) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  };

  const getRiskIndicatorColor = () => {
    switch (riskLevel) {
      case 'low': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  const selectedAlert = selectedAlertIndex !== null ? alerts[selectedAlertIndex] : null;

  // Track the last logged alert to prevent duplicate logs in Strict Mode
  const lastLoggedAlertRef = useRef<{
    selectedAlertIndex: number | null;
    alertId: string | null;
  }>({ selectedAlertIndex: null, alertId: null });

  // Log selectedAlert.recommendation whenever a new selectedAlert is chosen
  useEffect(() => {
    // Create a unique identifier for the current alert state
    const alertId = selectedAlert ? `${selectedAlert.timestamp}-${selectedAlert.title}` : null;
    const currentState = { selectedAlertIndex, alertId };
    
    // Only log if the state has actually changed (prevents Strict Mode duplicate logs)
    if (
      lastLoggedAlertRef.current.selectedAlertIndex !== currentState.selectedAlertIndex ||
      lastLoggedAlertRef.current.alertId !== currentState.alertId
    ) {
      lastLoggedAlertRef.current = currentState;
      
      if (selectedAlert && selectedAlert.recommendation) {
        console.log('[Alert Selection] Full alert details:', {
          title: selectedAlert.title,
          category: selectedAlert.category,
          timing: selectedAlert.timing,
          recommendation: selectedAlert.recommendation,
          timestamp: selectedAlert.timestamp
        });
      } else if (selectedAlert) {
        console.log('[Alert Selection] Selected alert has no recommendation:', {
          title: selectedAlert.title,
          category: selectedAlert.category,
          timing: selectedAlert.timing
        });
      } else {
        console.log('[Alert Selection] No alert selected');
      }
    }
  }, [selectedAlert, selectedAlertIndex]);

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
    setCitationModalOpen(true);
  };

  // Get patient name from patientId
  const getPatientName = () => {
    if (patientId) {
      const patient = mockPatients.find(p => p.id === patientId);
      return patient?.name || 'John Doe';
    }
    return 'New Session';
  };

  // Get next session number for the patient
  const getNextSessionNumber = () => {
    if (patientId) {
      const patient = mockPatients.find(p => p.id === patientId);
      if (patient && patient.sessionHistory) {
        return patient.sessionHistory.length + 1;
      }
      return 1; // First session if no history exists
    }
    return 1; // Default for new session without patient context
  };


  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--background-gradient)',
      overflow: 'hidden',
    }}>
      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        gap: 3, 
        p: 3, 
        overflow: 'auto', // Allow scrolling for the main content
        pr: transcriptOpen ? '450px' : '100px', // Space for right sidebar
        transition: 'padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Content Grid - Responsive for tablets */}
        <Box sx={{ 
          flex: 1,
          display: 'grid',
          gap: 3,
          gridTemplateColumns: isWideScreen ? '1fr 2fr' : '1fr',
        }}>
          {/* Section ID */}
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.08)',
              '&:hover': {
                boxShadow: '0 25px 50px -8px rgba(0, 0, 0, 0.1)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Back Button and Patient Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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
                variant="h4" 
                sx={{ 
                  color: 'var(--primary)',
                  fontWeight: 600,
                }}
              >
                {getPatientName()}
              </Typography>
            </Box>
            
            {/* Session Info and Start/Stop/Pause Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1">Session #{getNextSessionNumber()}</Typography>
              {!isRecording ? (
                <Button
                  variant="contained"
                  startIcon={<Mic />}
                  onClick={handleStartSession}
                  disabled={hasCompletedSession}
                  color="success"
                >
                  Start Session
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={isPaused ? <PlayArrow /> : <Pause />}
                    onClick={handlePauseResume}
                    sx={{ 
                      background: isPaused 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      '&:hover': { 
                        background: isPaused
                          ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                          : 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                      },
                    }}
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Stop />}
                    onClick={handleStopSession}
                    sx={{ 
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                      '&:hover': { 
                        background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                      },
                    }}
                  >
                    {isTestMode ? 'Stop Test' : isPlayingAudio ? 'Stop Audio' : 'End Session'}
                  </Button>
                </Box>
              )}
            </Box>
            
            <Box>
              <Typography variant="h6">Phase: Beginning</Typography>
              <Typography variant="body2" color="text.secondary">
                Rapport-building, agenda-setting (1-10 minutes)
              </Typography>
            </Box>
            <Paper 
              sx={{ 
                p: '2px 8px',
                backgroundColor: '#10b981', 
                color: 'white',
                textAlign: 'center',
                borderRadius: '12px',
                width: 'fit-content',
                alignSelf: 'flex-start'
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 500 }}>Phase-appropriate Progress</Typography>
            </Paper>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1, backgroundColor: 'grey.300', borderRadius: 1 }}>
                <Box 
                  sx={{ 
                    width: `${(sessionDuration / 300) * 100}%`, // Assumes 5 minutes
                    backgroundColor: 'primary.main', 
                    height: '8px', 
                    borderRadius: 1 
                  }} 
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {formatDuration(sessionDuration)}
              </Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              {alerts.map((alert, index) => {
                const timing = alert.timing || 'info';
                const getAlertColor = () => {
                  const normalizedTiming = timing?.toLowerCase();
                  switch (normalizedTiming) {
                    case 'now':
                      return '#dc2626'; // Red
                    case 'pause':
                      return '#d97706'; // Amber
                    case 'info':
                      return '#059669'; // Green
                    default:
                      return '#6b7280'; // Gray
                  }
                };

                const category = alert.category.toLowerCase() || 'process';
                const getContentIcon = () => {
                  // Safety takes precedence
                  if (category === 'safety') {
                    return <Shield sx={{ fontSize: 20, color: getAlertColor() }} />;
                  }
                  // Specific therapeutic techniques and interventions
                  if (category === 'technique') {
                  return <Psychology sx={{ fontSize: 20, color: getAlertColor() }} />;
                  }
                  // Pathway changes
                  if (category === 'pathway_change') {
                    return <SwapHoriz sx={{ fontSize: 20, color: getAlertColor() }} />;
                  }
                  // Engagement/motivation
                  if (category === 'engagement') {
                    return <Lightbulb sx={{ fontSize: 20, color: getAlertColor() }} />;
                  }
                  // Process observations
                  if (category === 'process') {
                    return <Assessment sx={{ fontSize: 20, color: getAlertColor() }} />;
                  }
                  // Default fallback (Psychology for unknown categories)
                  return <Build sx={{ fontSize: 20, color: getAlertColor() }} />;
                };

                return (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                      p: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      backgroundColor: selectedAlertIndex === index ? 'action.selected' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                    onClick={() => setSelectedAlertIndex(index)}
                  >
                    {getContentIcon()}
                    <Typography variant="body2">{alert.title}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Session Vitals */}
            <SessionVitals 
              metrics={sessionMetrics} 
              isListening={isRecording && !hasReceivedComprehensiveAnalysis} 
            />

            {/* Pathway Summary Section */}
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">Current Pathway</Typography>
                <Typography variant="h6" sx={{ color: 'var(--primary)', fontWeight: 600 }}>
                  {sessionContext.current_approach}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Effectiveness</Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: isRecording && !hasReceivedComprehensiveAnalysis
                      ? 'text.secondary'
                      : getStatusColor(pathwayIndicators.current_approach_effectiveness),
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}>
                  {isRecording && !hasReceivedComprehensiveAnalysis
                    ? 'Listening...'
                    : !hasReceivedComprehensiveAnalysis
                    ? 'Unknown'
                    : pathwayIndicators.current_approach_effectiveness
                  }
                </Typography>
              </Box>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => setShowRationaleModal(true)}
                disabled={!hasReceivedComprehensiveAnalysis}
              >
                Show Rationale
              </Button>
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              {/* Recommendation Section */}
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.08)',
                  '&:hover': {
                    boxShadow: '0 25px 50px -8px rgba(0, 0, 0, 0.1)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Typography 
                  variant="h5" 
                  gutterBottom 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    color: 'var(--primary)',
                    fontWeight: 600,
                  }}
                >
                  <Explore sx={{ 
                    fontSize: 28,
                    color: 'rgba(11, 87, 208, 0.6)',
                    opacity: 0.8,
                  }} /> 
                  Recommendation
                </Typography>
                {selectedAlert && selectedAlert.recommendation && selectedAlert.recommendation.length > 0 ? (
                  <Box sx={{ color: 'text.secondary' }}>
                    <Box component="ul" sx={{ margin: 0, paddingLeft: '1.5em' }}>
                      {selectedAlert.recommendation.map((item, index) => (
                        <Box component="li" key={index} sx={{ marginBottom: '0.25em' }}>
                          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                            {item}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    py: 6,
                    px: 3,
                    background: 'rgba(250, 251, 253, 0.5)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(196, 199, 205, 0.3)',
                  }}>
                    <Typography 
                      variant="body1" 
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      Recommendations will appear here.
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Evidence Section */}
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.08)',
                  '&:hover': {
                    boxShadow: '0 25px 50px -8px rgba(0, 0, 0, 0.1)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Typography 
                  variant="h5" 
                  gutterBottom 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    color: 'var(--primary)',
                    fontWeight: 600,
                  }}
                >
                  <Article sx={{ 
                    fontSize: 28,
                    color: 'rgba(11, 87, 208, 0.6)',
                    opacity: 0.8,
                  }} /> 
                  Evidence
                </Typography>
                {selectedAlert && selectedAlert.message && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                      {selectedAlert.message}
                    </Typography>
                  </Box>
                )}
                {selectedAlert && selectedAlert.evidence && selectedAlert.evidence.length > 0 && (
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {selectedAlert.evidence.map((item, index) => (
                      <Typography key={index} variant="body1" color="text.secondary" fontStyle="italic" sx={{ fontSize: '1.1rem' }}>
                        - {item}
                      </Typography>
                    ))}
                  </Box>
                )}
                {!selectedAlert && (
                  <Box sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    py: 6,
                    px: 3,
                    background: 'rgba(250, 251, 253, 0.5)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(196, 199, 205, 0.3)',
                  }}>
                    <Typography 
                      variant="body1" 
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      Evidence will appear here.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Floating Action Buttons */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1201, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
        {/* Reopen Session Summary Button */}
        {sessionSummaryClosed && !showSessionSummary && (
          <Fab
            color="secondary"
            variant="extended"
            aria-label="reopen session summary"
            onClick={() => {
              if (sessionSummary) {
                setShowSessionSummary(true);
              } else {
                requestSummary();
              }
            }}
            sx={{
              background: 'linear-gradient(135deg, #673ab7 0%, #512da8 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #512da8 0%, #673ab7 100%)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 8px 20px -4px rgba(103, 58, 183, 0.35)',
            }}
          >
            {summaryLoading ? (
              <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
            ) : (
              <Article sx={{ mr: 1 }} />
            )}
            {summaryLoading ? 'Generating...' : 'Summary'}
          </Fab>
        )}

        {/* Floating Transcript Toggle Button */}
        <Fab
          color="primary"
          aria-label="transcript"
          onClick={() => {
            setTranscriptOpen(!transcriptOpen);
            if (!transcriptOpen) {
              setNewTranscriptCount(0);
            }
          }}
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
          <Badge badgeContent={newTranscriptCount} color="error">
            <Chat />
          </Badge>
        </Fab>
      </Box>

      {/* Test Buttons */}
      {!isRecording && !isTestMode && !hasCompletedSession && (
        <Box sx={{ 
          position: 'fixed', 
          bottom: 24, 
          left: 24,
          zIndex: 1201,
          display: 'flex',
          gap: 1,
          flexDirection: 'column',
        }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<VolumeUp />}
            onClick={loadExampleAudio}
            sx={{ 
              borderColor: '#6366f1',
              color: '#6366f1',
              '&:hover': {
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(99, 102, 241, 0.04)',
              },
              fontWeight: 600,
              borderRadius: '16px',
              px: 2,
              py: 0.5,
            }}
          >
            Load Example Audio
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={loadTestTranscript}
            sx={{ 
              borderColor: '#0b57d0',
              color: '#0b57d0',
              '&:hover': {
                borderColor: '#00639b',
                backgroundColor: 'rgba(11, 87, 208, 0.04)',
              },
              fontWeight: 600,
              borderRadius: '16px',
              px: 2,
              py: 0.5,
            }}
          >
            Load Test Transcript
          </Button>
        </Box>
      )}

      {/* Right Sidebar - Transcript */}
      <Drawer
        anchor="right"
        open={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: isDesktop ? 400 : 350,
            p: 3,
            pt: 10,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(248, 250, 252, 0.85) 100%)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: '-8px 0 32px -4px rgba(0, 0, 0, 0.12)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.5)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%)',
              pointerEvents: 'none',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              color: 'var(--primary)',
              fontWeight: 600,
            }}
          >
            <Article sx={{ 
              fontSize: 28,
              background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }} />
            Live Transcript
          </Typography>
          <IconButton 
            onClick={() => setTranscriptOpen(false)}
            sx={{ 
              color: 'var(--on-surface-variant)',
              '&:hover': {
                background: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <Close />
          </IconButton>
        </Box>
        
        {(isRecording || isTestMode) && transcript.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                console.log('[Manual Analysis] Triggering both real-time and comprehensive analyses');
                const recentTranscript = transcript.slice(-10);
                if (recentTranscript.length > 0) {
                  const formattedTranscript = recentTranscript
                    .filter(t => !t.is_interim)
                    .map(t => ({
                      speaker: 'conversation',
                      text: t.text,
                      timestamp: t.timestamp
                    }));
                  
                  if (formattedTranscript.length > 0) {
                    // Trigger both analyses like the automatic word trigger does
                    analyzeSegment(
                      formattedTranscript, 
                      { ...sessionContext, is_realtime: true }, 
                      Math.floor(sessionDuration / 60)
                    );
                    analyzeSegment(
                      formattedTranscript, 
                      { ...sessionContext, is_realtime: false }, 
                      Math.floor(sessionDuration / 60)
                    );
                  }
                }
              }}
              sx={{ 
                borderColor: '#10b981',
                color: '#10b981',
                '&:hover': {
                  borderColor: '#059669',
                  backgroundColor: 'rgba(16, 185, 129, 0.04)',
                },
                fontWeight: 600,
                borderRadius: '16px',
                px: 2,
                py: 0.5,
              }}
            >
              Analyze Now
            </Button>
          </Box>
        )}
        
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <TranscriptDisplay transcript={transcript} />
        </Box>
      </Drawer>

      {/* Session Summary Modal */}
      <SessionSummaryModal
        open={showSessionSummary}
        onClose={() => setShowSessionSummary(false)}
        summary={sessionSummary}
        loading={summaryLoading}
        error={summaryError}
        onRetry={requestSummary}
        sessionId={sessionId}
      />

      <RationaleModal
        open={showRationaleModal}
        onClose={() => setShowRationaleModal(false)}
        rationale={pathwayGuidance.rationale}
        immediateActions={pathwayGuidance.immediate_actions}
        contraindications={pathwayGuidance.contraindications}
        citations={citations}
        onCitationClick={handleCitationClick}
        detectedTechniques={sessionMetrics.techniques_detected}
        alternativePathways={pathwayGuidance.alternative_pathways}
      />

      <CitationModal
        open={citationModalOpen}
        onClose={() => {
          setCitationModalOpen(false);
          setSelectedCitation(null);
        }}
        citation={selectedCitation}
      />
    </Box>
  );
};

export default NewSession;
