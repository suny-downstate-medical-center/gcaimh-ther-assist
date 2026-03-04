import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  useTheme,
  useMediaQuery,
  IconButton,
  Fab,
  Tooltip,
  Drawer,
  Badge,
  CircularProgress,
  Alert as MuiAlert,
  Collapse,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';
import {
  HealthAndSafety,
  NaturePeople,
  Category,
  Exposure,
  Check,
  Warning,
  Psychology,
  Timeline,
  Stop,
  FiberManualRecord,
  ArrowBack,
  Search,
  CallSplit,
  Route,
  Mic,
  Pause,
  PlayArrow,
  Chat,
  Close,
  VolumeUp,
  Article,
  Info,
  TrendingUp,
  ExpandLess,
  ExpandMore,
  Shield,
  SwapHoriz,
  Lightbulb,
  Assessment,
  Build,
  ContactSupport,
  Explore,
  UploadFile,
  Phone,
  Headphones,
  AudioFile,
  MusicNote,
} from '@mui/icons-material';
import { Alert, SessionMetrics, PathwayIndicators, SessionContext, Alert as IAlert, Citation, SessionSummary } from '../types/types';
import { formatDuration } from '../utils/timeUtils';
import { getStatusColor } from '../utils/colorUtils';
import { renderMarkdown } from '../utils/textRendering';
import { processNewAlert, cleanupOldAlerts } from '../utils/alertDeduplication';
import { mockPatients } from '../utils/mockPatients';
import { testTranscriptData, TestTranscriptEntry } from '../utils/mockTranscript';
import { ChartDataPoint, createChartDataPoint, pruneChartData } from '../utils/chartDataUtils';
// Mock chart data generator removed - analysis now builds chart data from actual responses
import SessionLineChart from './SessionLineChart';
import ActionDetailsPanel from './ActionDetailsPanel';
import EvidenceTab from './EvidenceTab';
import PathwayTab from './PathwayTab';
import GuidanceTab from './GuidanceTab';
import AlternativesTab from './AlternativesTab';
import TranscriptDisplay from './TranscriptDisplay';
import SessionSummaryModal from './SessionSummaryModal';
import RationaleModal from './RationaleModal';
import CitationModal from './CitationModal';
import TherapistNotesPanel from './TherapistNotesPanel';
import { useAudioStreamingWebSocketTher } from '../hooks/useAudioStreamingWebSocketTher';
import axios from 'axios';
import { useTherapyAnalysis } from '../hooks/useTherapyAnalysis';
import { useAuth } from '../contexts/AuthContext';
import BackendStatusIndicator from './BackendStatusIndicator';
import ActivityLog, { ActivityLogEntry } from './ActivityLog';

interface NewTherSessionProps {
  onNavigateBack?: () => void;
  onStopRecording?: () => void;
  patientId?: string | null;
  alerts?: Alert[];
  sessionMetrics?: SessionMetrics;
  pathwayIndicators?: PathwayIndicators;
  sessionDuration?: number;
  sessionPhase?: string;
  sessionId?: string;
  onSessionSaved?: (session: { id: string; date: string; duration: string; summary: string; fullSummary?: SessionSummary }) => void;
  currentGuidance?: {
    title: string;
    time: string;
    content: string;
    immediateActions: Array<{
      title: string;
      description: string;
      icon: 'safety' | 'grounding';
    }>;
    contraindications: Array<{
      title: string;
      description: string;
      icon: 'cognitive' | 'exposure';
    }>;
  };
}

const NewTherSession: React.FC<NewTherSessionProps> = ({
  onNavigateBack,
  patientId,
  onSessionSaved,
}) => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isWideScreen = useMediaQuery('(min-width:1024px)');
  
  // Generate a unique session instance ID for localStorage namespacing (once per page load)
  const [sessionInstanceId] = useState(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  });

  // Session setup dialog — therapist selects modality before recording starts
  const [showSessionSetup, setShowSessionSetup] = useState(false);
  const [setupSelectedModality, setSetupSelectedModality] = useState<string>('CBT');

  // Modality options available for therapist selection (simplified to 3 core types)
  const MODALITY_OPTIONS = [
    { code: 'CBT', name: 'Cognitive Behavioral Therapy', description: 'Includes standard CBT, Behavioral Activation, Exposure Therapy, and ACT techniques' },
    { code: 'DBT', name: 'Dialectical Behavior Therapy', description: 'Mindfulness, distress tolerance, emotion regulation, interpersonal effectiveness' },
    { code: 'IPT', name: 'Interpersonal Psychotherapy', description: 'Interpersonal role disputes, grief, role transitions, interpersonal deficits' },
  ];

  // Example audio files for demo (served from public/audio/)
  const EXAMPLE_AUDIO_OPTIONS = [
    { id: '305', name: 'Session 305', file: '/audio/305_AUDIO.wav', description: 'Therapy session recording (~7 min)' },
    { id: '307', name: 'Session 307', file: '/audio/307_AUDIO.wav', description: 'Therapy session recording (~5 min)' },
  ];

  // Word count tracking for minimum modality suggestion threshold
  const totalWordCountRef = useRef(0);
  const MIN_WORDS_FOR_MODALITY_SUGGESTION = 200;

  // Core session state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState<'microphone' | 'test' | 'audio' | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [pausedTime, setPausedTime] = useState(0);
  const [lastPauseTime, setLastPauseTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  
  // Transcript and analysis state
  const [transcript, setTranscript] = useState<Array<{
    text: string;
    timestamp: string;
    is_interim?: boolean;
    speaker?: string;
  }>>([]);
  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [sessionMetrics, setSessionMetrics] = useState({
    engagement_level: 0.0,
    therapeutic_alliance: 'unknown' as 'strong' | 'moderate' | 'weak' | 'unknown',
    techniques_detected: [] as string[],
    detected_modality: undefined as { code: string; name: string; confidence: number; evidence: string[] } | undefined,
    emotional_state: 'unknown' as 'calm' | 'anxious' | 'distressed' | 'dissociated' | 'engaged' | 'unknown',
    arousal_level: 'unknown' as 'low' | 'moderate' | 'high' | 'elevated' | 'unknown',
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
  
  // Chart data state - collects data from comprehensive analysis regardless of UI blocking
  const [chartDataHistory, setChartDataHistory] = useState<ChartDataPoint[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'guidance' | 'evidence' | 'pathway' | 'alternatives'>('guidance');
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [selectedCitation, setSelectedCitation] = useState<any>(null);
  const [isContraindication, setIsContraindication] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [newTranscriptCount, setNewTranscriptCount] = useState(0);
  const [selectedAlertIndex, setSelectedAlertIndex] = useState<number | null>(null);
  
  // Session context for AI analysis — derived from patient data, updated reactively from AI detection
  const [sessionContext, setSessionContext] = useState<SessionContext>(() => {
    if (patientId) {
      const patient = mockPatients.find(p => p.id === patientId);
      if (patient?.focusTopics) {
        // Parse focusTopics to extract primary concern and approach
        const topics = patient.focusTopics.split(',').map(t => t.trim());
        const primaryConcern = topics[0] || 'General';

        // Infer session type / approach from focus topics
        const topicsLower = patient.focusTopics.toLowerCase();
        let sessionType = 'CBT';
        let currentApproach = 'Cognitive Behavioral Therapy';
        if (topicsLower.includes('emdr')) {
          sessionType = 'EMDR';
          currentApproach = 'EMDR Therapy';
        } else if (topicsLower.includes('exposure therapy')) {
          sessionType = 'Exposure';
          currentApproach = 'Exposure and Response Prevention';
        } else if (topicsLower.includes('behavioral activation')) {
          sessionType = 'BA';
          currentApproach = 'Behavioral Activation';
        } else if (topicsLower.includes('act')) {
          sessionType = 'ACT';
          currentApproach = 'Acceptance and Commitment Therapy';
        } else if (topicsLower.includes('dbt')) {
          sessionType = 'DBT';
          currentApproach = 'Dialectical Behavior Therapy';
        } else if (topicsLower.includes('ipt') || topicsLower.includes('interpersonal')) {
          sessionType = 'IPT';
          currentApproach = 'Interpersonal Psychotherapy';
        }

        return {
          session_type: sessionType,
          primary_concern: primaryConcern,
          current_approach: currentApproach,
        };
      }
    }
    // Default when no patient selected (e.g. quick session launch)
    return {
      session_type: 'CBT',
      primary_concern: 'General',
      current_approach: 'Cognitive Behavioral Therapy',
    };
  });
  
  // Analysis tracking
  const [wordsSinceLastAnalysis, setWordsSinceLastAnalysis] = useState(0);
  const [hasReceivedComprehensiveAnalysis, setHasReceivedComprehensiveAnalysis] = useState(false);
  
  // Analysis job ID tracking - counter to relate realtime and comprehensive results
  const analysisJobCounterRef = useRef(0);
  
  // Track currently displayed job IDs to ensure realtime and comprehensive results match
  const [displayedRealtimeJobId, setDisplayedRealtimeJobId] = useState<number | null>(null);
  const [displayedComprehensiveJobId, setDisplayedComprehensiveJobId] = useState<number | null>(null);
  const [waitingForComprehensiveJobId, setWaitingForComprehensiveJobId] = useState<number | null>(null);
  
  // Use refs to avoid closure issues in useTherapyAnalysis callback
  const waitingForComprehensiveJobIdRef = useRef<number | null>(null);
  const displayedRealtimeJobIdRef = useRef<number | null>(null);
  const displayedComprehensiveJobIdRef = useRef<number | null>(null);
  
  // Session summary state
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [sessionSummaryClosed, setSessionSummaryClosed] = useState(false);
  const [saveSessionLoading, setSaveSessionLoading] = useState(false);
  const [saveSessionSuccess, setSaveSessionSuccess] = useState(false);
  
  // Modal state
  const [showRationaleModal, setShowRationaleModal] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(true);
  const [citationModalOpen, setCitationModalOpen] = useState(false);
  const [selectedCitationModal, setSelectedCitationModal] = useState<Citation | null>(null);
  
  // Test mode state
  const [isTestMode, setIsTestMode] = useState(false);
  const testIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeTranscriptDataRef = useRef<TestTranscriptEntry[]>(testTranscriptData);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingTestScript, setPendingTestScript] = useState<TestTranscriptEntry[] | null>(null);
  const [pendingAudioFile, setPendingAudioFile] = useState<{ name: string; url: string } | null>(null);

  // Safety alert acknowledgement tracking
  const [acknowledgedSafetyAlerts, setAcknowledgedSafetyAlerts] = useState<Set<string>>(new Set());

  // Error and loading state
  const [error, setError] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Activity log state for LLM diagnostics
  const [activityLogEntries, setActivityLogEntries] = useState<ActivityLogEntry[]>([]);
  const activityLogIdCounter = useRef(0);
  const wasEverConnectedRef = useRef(false);

  const addLogEntry = useCallback((
    model: string,
    analysisType: string,
    phase: 'started' | 'complete' | 'error',
    summary: string,
    details?: ActivityLogEntry['details']
  ) => {
    activityLogIdCounter.current += 1;
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const entry: ActivityLogEntry = {
      id: `log-${activityLogIdCounter.current}`,
      timestamp: ts,
      model,
      analysisType,
      phase,
      summary,
      details,
    };
    setActivityLogEntries(prev => [...prev.slice(-200), entry]); // Keep last 200
  }, []);

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
    audioLevel,
    sessionId
  } = useAudioStreamingWebSocketTher({
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
        const finalizedText = newTranscript.transcript || '';
        const speakerLabel = newTranscript.speaker || 'conversation';
        setTranscript(prev => {
          const filtered = prev.filter(entry => !entry.is_interim);
          return [...filtered, {
            text: finalizedText,
            timestamp: newTranscript.timestamp || new Date().toISOString(),
            is_interim: false,
            speaker: speakerLabel,
          }];
        });

        // Track cumulative word count for minimum modality suggestion threshold
        totalWordCountRef.current += finalizedText.split(/\s+/).filter(Boolean).length;

        if (!transcriptOpen) {
          setNewTranscriptCount(prev => prev + 1);
        }
      }
    },
    onAnalysis: (analysis: any) => {
      // Analysis from Gemini Live API (via WebSocket) — handles both alerts and metrics
      console.log('[Session] WebSocket analysis received:', analysis);

      // Handle alerts from Gemini Live
      if (analysis.alert) {
        const newAlert = {
          ...analysis.alert,
          sessionTime: sessionDuration,
          timestamp: new Date().toISOString(),
        };

        setAlerts(prev => {
          const result = processNewAlert(newAlert, prev);
          if (result.shouldAdd) {
            const updatedAlerts = [newAlert, ...prev].slice(0, 8);
            console.log(`[Session] WebSocket alert: ${newAlert.category} (${newAlert.timing}) - "${newAlert.title}"`);
            return updatedAlerts;
          }
          return prev;
        });
      }

      // Handle session metrics from Gemini Live
      if (analysis.session_metrics) {
        setSessionMetrics(prev => ({
          ...prev,
          ...analysis.session_metrics,
        }));

        // Detect modality suggestion
        const detectedModality = analysis.session_metrics.detected_modality;
        if (detectedModality && detectedModality.confidence >= 0.7) {
          if (sessionContext.session_type !== detectedModality.code) {
            console.log(`[Session] AI suggests modality: ${detectedModality.name} (${Math.round(detectedModality.confidence * 100)}%)`);
          }
        }
      }

      // Handle session phase
      if (analysis.session_phase) {
        console.log(`[Session] Phase: ${analysis.session_phase}`);
      }
    },
    onError: (error: string) => {
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

  // Track if WebSocket was ever connected (to distinguish "Connecting..." from "Disconnected")
  useEffect(() => {
    if (isConnected) {
      wasEverConnectedRef.current = true;
    }
  }, [isConnected]);

  // Reset wasEverConnected when recording stops
  useEffect(() => {
    if (!isRecording) {
      wasEverConnectedRef.current = false;
    }
  }, [isRecording]);

  // Track logged analyses to prevent duplicate logs in Strict Mode
  const lastLoggedAnalysisRef = useRef<Set<string>>(new Set());

  const { analyzeSegment, generateSessionSummary } = useTherapyAnalysis({
    authToken,
    onAnalysis: (analysis) => {
      const analysisType = (analysis as any).analysis_type;
      const isRealtime = analysisType === 'realtime';
      const jobId = (analysis as any).job_id;
      
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

        // Log diagnostics from backend _diagnostics field
        const diag = (analysis as any)._diagnostics;
        if (diag) {
          // Build result summary based on analysis type
          let resultSummary = '';
          if (isRealtime && analysis.alert) {
            resultSummary = `Alert: ${analysis.alert.category} (${analysis.alert.timing}) - "${analysis.alert.title || ''}"`;
          } else if (!isRealtime && analysis.session_metrics) {
            const m = analysis.session_metrics;
            resultSummary = `engagement=${Math.round((m.engagement_level || 0) * 100)}%, alliance=${m.therapeutic_alliance || '?'}, emotional=${m.emotional_state || '?'}`;
          }

          addLogEntry(
            diag.model || (isRealtime ? 'flash' : 'pro'),
            diag.analysis_type || analysisType,
            diag.json_parse_success === false ? 'error' : 'complete',
            `${analysisType} analysis complete (Job ${jobId})`,
            {
              prompt: diag.prompt_used,
              temperature: diag.temperature,
              maxTokens: diag.max_output_tokens,
              thinkingBudget: diag.thinking_budget,
              ragTools: diag.rag_tools,
              latencyMs: diag.latency_ms,
              ttftMs: diag.ttft_ms,
              tokenUsage: diag.token_usage,
              finishReason: diag.finish_reason,
              groundingChunks: diag.grounding?.chunks_retrieved,
              groundingSources: diag.grounding?.sources,
              responseLength: diag.response_length_chars,
              jsonParseSuccess: diag.json_parse_success,
              usedFallback: diag.used_fallback,
              triggerPhrase: diag.trigger_phrase_detected,
              resultSummary,
            }
          );
        }
      }

      if (isRealtime) {
        // Real-time analysis: Only update alerts and set up for comprehensive results
        if (analysis.alert) {
          const newAlert = {
            ...analysis.alert,
            sessionTime: sessionDuration,
            timestamp: new Date().toISOString(),
            jobId: jobId // Store jobId with alert
          };

          setAlerts(prev => {
            const result = processNewAlert(newAlert, prev);

            if (result.shouldAdd) {
              const updatedAlerts = [newAlert, ...prev].slice(0, 8);
              
              // Update displayed realtime job ID and prepare for comprehensive results
              setDisplayedRealtimeJobId(jobId);
              setWaitingForComprehensiveJobId(jobId);
              
              // Clear previous comprehensive results since we have new realtime results
              setDisplayedComprehensiveJobId(null);
              setPathwayGuidance({});
              setCitations([]);
              
              // Create unique log identifier for this specific alert
              const alertLogId = `new-alert-${newAlert.timestamp}-${newAlert.title}`;
              if (!lastLoggedAnalysisRef.current.has(alertLogId)) {
                lastLoggedAnalysisRef.current.add(alertLogId);
                console.log(`[Session] ⚠️ New ${newAlert.category} alert: "${newAlert.title}" (${newAlert.timing}) - Job ID: ${jobId}`);
              }
              
              return updatedAlerts;
            } else {
              const reason = result.blockReason || 'deduplication rules';
              
              // Create unique log identifier for this specific filter event
              const filterLogId = `filter-alert-${Date.now()}-${analysis.alert?.title || 'unknown'}`;
              if (!lastLoggedAnalysisRef.current.has(filterLogId)) {
                lastLoggedAnalysisRef.current.add(filterLogId);
                console.log(`[Session] 🚫 Realtime alert filtered: ${reason} - Job ID: ${jobId}`, analysis.alert);
              }
              
              return prev;
            }
          });
        }
      } else {
        // Comprehensive RAG analysis: Always collect chart data, but conditionally update UI
        
        // ALWAYS collect chart data and update session metrics from comprehensive analysis
        if (analysis.session_metrics) {
          // Always update session metrics from comprehensive analysis
          setSessionMetrics(prev => ({
            ...prev,
            ...analysis.session_metrics
          }));

          // DISABLED: Mid-session modality auto-switching (per clinical team feedback)
          // Instead of changing session_type, we store detected_modality in metrics for display only.
          // The therapist explicitly selects the modality at session start — AI suggestions are informational.
          const detectedModality = analysis.session_metrics.detected_modality;
          if (detectedModality && detectedModality.confidence >= 0.7) {
            if (sessionContext.session_type !== detectedModality.code) {
              console.log(`[Session] 💡 AI suggests modality: ${detectedModality.name} (${Math.round(detectedModality.confidence * 100)}%) — displayed as suggestion only, not auto-switching`);
            }
            // detected_modality is already stored in sessionMetrics via the spread above
            // It will be displayed as an informational chip in the UI
          }

          if (analysis.pathway_indicators) {
            const newChartDataPoint = createChartDataPoint(
              analysis.session_metrics,
              analysis.pathway_indicators,
              sessionDurationRef.current,
              jobId
            );

            setChartDataHistory(prev => {
              const updatedHistory = [...prev, newChartDataPoint];
              // Prune to keep reasonable size
              return pruneChartData(updatedHistory, 100);
            });

            console.log(`[Session] 📊 Chart data collected - Job ID: ${jobId}, Engagement: ${Math.round(analysis.session_metrics.engagement_level * 100)}%, Alliance: ${analysis.session_metrics.therapeutic_alliance}`);
          }
        }

        // Apply speaker diarization from Gemini's contextual inference
        const diarized = (analysis as any).diarized_transcript;
        if (diarized && Array.isArray(diarized) && diarized.length > 0) {
          setTranscript(prev => {
            const updated = [...prev];
            // Match diarized entries to transcript by text content
            for (const entry of diarized) {
              if (!entry.speaker || !entry.text) continue;
              // Find the transcript entry whose text best matches (substring match)
              const matchIdx = updated.findIndex(
                t => !t.is_interim && (!t.speaker || t.speaker === 'conversation') &&
                     t.text && entry.text && (
                       t.text.includes(entry.text.substring(0, 40)) ||
                       entry.text.includes(t.text.substring(0, 40))
                     )
              );
              if (matchIdx >= 0) {
                updated[matchIdx] = { ...updated[matchIdx], speaker: entry.speaker };
              }
            }
            return updated;
          });
          console.log(`[Session] 🏷️ Speaker diarization applied: ${diarized.length} entries labeled`);
        }

        // Conditionally update pathway guidance based on job ID matching
        const currentWaitingJobId = waitingForComprehensiveJobIdRef.current;
        if (jobId && jobId === currentWaitingJobId) {
          setHasReceivedComprehensiveAnalysis(true);
          setDisplayedComprehensiveJobId(jobId);
          setWaitingForComprehensiveJobId(null);

          console.log(`[Session] 📋 Comprehensive results matched for pathway guidance - Job ID: ${jobId}`);
          
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
        } else {
          console.log(`[Session] 🚫 Comprehensive results ignored for UI - Job ID: ${jobId} (waiting for: ${currentWaitingJobId})`);
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
  
  // Update job tracking refs when state changes
  useEffect(() => {
    waitingForComprehensiveJobIdRef.current = waitingForComprehensiveJobId;
  }, [waitingForComprehensiveJobId]);
  
  useEffect(() => {
    displayedRealtimeJobIdRef.current = displayedRealtimeJobId;
  }, [displayedRealtimeJobId]);
  
  useEffect(() => {
    displayedComprehensiveJobIdRef.current = displayedComprehensiveJobId;
  }, [displayedComprehensiveJobId]);

  // Helper function to trigger both realtime and comprehensive analysis with shared ID
  const triggerPairedAnalysis = useCallback((transcriptSegment: any[], triggerSource: string) => {
    if (transcriptSegment.length === 0) return;
    
    // Increment job counter and get shared ID for both analyses
    analysisJobCounterRef.current += 1;
    const sharedJobId = analysisJobCounterRef.current;
    
    console.log(`[Session] 🔄 ${triggerSource} triggered - Job ID: ${sharedJobId}`);

    // Log "started" entries for both analyses
    addLogEntry('flash', 'realtime', 'started', `Realtime analysis started (Job ${sharedJobId})`, {
      ragTools: ['ebt-corpus', 'cbt-corpus'],
    });
    addLogEntry('pro', 'comprehensive', 'started', `Comprehensive analysis started (Job ${sharedJobId})`, {
      ragTools: ['ebt-corpus', 'cbt-corpus', 'transcript-patterns'],
    });

    // Get the most recent alert for backend deduplication (realtime only)
    const recentAlert = alertsRef.current.length > 0 ? alertsRef.current[0] : null;

    // Trigger both analyses with the same job ID
    analyzeSegmentRef.current(
      transcriptSegment,
      { ...sessionContextRef.current, is_realtime: true },
      Math.floor(sessionDurationRef.current / 60),
      recentAlert,
      sharedJobId
    );
    
    analyzeSegmentRef.current(
      transcriptSegment,
      { ...sessionContextRef.current, is_realtime: false },
      Math.floor(sessionDurationRef.current / 60),
      undefined, // no previous alert for comprehensive
      sharedJobId
    );
  }, [addLogEntry]);

  // Word-based real-time analysis trigger
  // Transcription comes from Gemini Live API via WebSocket; this triggers both
  // realtime (Flash) and comprehensive (Pro + RAG) analysis on the accumulated text.
  useEffect(() => {
    if (!isRecording || transcript.length === 0) return;

    const lastEntry = transcript[transcript.length - 1];
    if (!lastEntry || lastEntry.is_interim) return;

    // Count words in the new entry
    const newWords = lastEntry.text.split(' ').filter(word => word.trim()).length;

    setWordsSinceLastAnalysis(prev => {
      const updatedWordCount = prev + newWords;

      // Trigger analysis every 30 words (~1-2 sentences) for meaningful context
      const WORDS_PER_ANALYSIS = 30;
      const TRANSCRIPT_WINDOW_MINUTES = 5;

      if (updatedWordCount >= WORDS_PER_ANALYSIS) {
        // Get last 5 minutes of transcript
        const fiveMinutesAgo = new Date(Date.now() - TRANSCRIPT_WINDOW_MINUTES * 60 * 1000);
        const recentTranscript = transcript
          .filter(t => !t.is_interim && new Date(t.timestamp) > fiveMinutesAgo)
          .map(t => ({
            speaker: t.speaker || 'conversation',
            text: t.text,
            timestamp: t.timestamp
          }));

        if (recentTranscript.length > 0) {
          triggerPairedAnalysis(recentTranscript, `Auto-analysis (${updatedWordCount} words)`);
        }

        // Reset word count
        return 0;
      }

      return updatedWordCount;
    });
  }, [transcript, isRecording, triggerPairedAnalysis]);

  // Generate current date in the format "Month Day, Year"
  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get patient name from patientId
  const getPatientName = () => {
    if (patientId) {
      const patient = mockPatients.find(p => p.id === patientId);
      return patient?.name || 'New Session';
    }
    return 'New Session';
  };

  // Determine therapy phase
  const determineTherapyPhase = (duration: number) => {
    if (duration <= 10 * 60) {
      return "Beginning (1-10 minutes)";
    } else if (duration <= 40 * 60) {
      return "Middle (10-40 minutes)";
    } else {
      return "End (40+ minutes)";
    }
  };

  // Get current alert for tab display
  const getCurrentAlert = () => {
    if (alerts.length > 0 && displayedRealtimeJobId !== null) {
      const recentAlert = alerts[0];
      return {
        title: recentAlert.title || "Current Alert",
        category: recentAlert.category || "general",
        timing: recentAlert.timing || "info"
      };
    }
    return null;
  };

  // Get current guidance for Guidance tab (realtime analysis only)
  const getCurrentGuidance = () => {
    // Show real-time alerts for Guidance tab
    if (alerts.length > 0) {
      const recentAlert = alerts[0];

      // Build immediate actions from backend immediateActions first, then fall back to recommendation
      const backendActions = recentAlert.immediateActions || [];
      const recommendationItems = Array.isArray(recentAlert.recommendation)
        ? recentAlert.recommendation
        : recentAlert.recommendation ? [recentAlert.recommendation] : [];
      const actionSources = backendActions.length > 0 ? backendActions : recommendationItems;

      const immediateActions = actionSources.map((action) => ({
        title: action,
        description: action,
        icon: 'safety' as const
      }));

      // Build contraindications from backend contraindications field
      const backendContraindications = recentAlert.contraindications || [];
      const contraindications = backendContraindications.map((contra) => ({
        title: contra,
        description: contra,
        icon: 'cognitive' as const
      }));

      return {
        title: recentAlert.title || "Current Clinical Guidance",
        time: formatDuration(sessionDuration),
        content: recentAlert.message || "Real-time guidance available.",
        immediateActions,
        contraindications
      };
    }
    
    // Default guidance when no realtime alerts available
    return {
      title: isRecording ? "Listening for guidance..." : "No guidance available",
      time: formatDuration(sessionDuration),
      content: isRecording 
        ? "Listening..."
        : "Start a session to receive real-time therapeutic guidance.",
      immediateActions: [],
      contraindications: []
    };
  };

  // Get pathway guidance for Pathway tab (comprehensive analysis only)
  const getPathwayGuidance = () => {
    // Show comprehensive results if available and job IDs match
    if (pathwayGuidance.rationale && displayedComprehensiveJobId === displayedRealtimeJobId) {
      return {
        title: "Current Clinical Guidance",
        time: formatDuration(sessionDuration),
        content: pathwayGuidance.rationale,
        immediateActions: pathwayGuidance.immediate_actions?.map(action => ({
          title: action,
          description: action,
          icon: 'safety' as const
        })) || [],
        contraindications: pathwayGuidance.contraindications?.map(contra => ({
          title: contra,
          description: contra,
          icon: 'cognitive' as const
        })) || [],
        isLive: true,
        jobId: displayedComprehensiveJobId
      };
    }
    
    // Show loading state when waiting for comprehensive results
    if (waitingForComprehensiveJobId !== null) {
      return {
        title: "Creating comprehensive therapeutic guidance...",
        time: formatDuration(sessionDuration),
        content: "Creating comprehensive therapeutic guidance...",
        immediateActions: [],
        contraindications: [],
        isLive: false,
        isLoading: true,
        jobId: waitingForComprehensiveJobId
      };
    }
    
    // Default when no analysis available yet
    return {
      title: hasReceivedComprehensiveAnalysis ? "No pathway guidance available" : "Waiting for analysis...",
      time: formatDuration(sessionDuration),
      content: hasReceivedComprehensiveAnalysis 
        ? "Start a session to receive comprehensive therapeutic guidance."
        : "Start a session to receive comprehensive therapeutic guidance.",
      immediateActions: [],
      contraindications: [],
      isLive: false,
      jobId: null
    };
  };

  // Session control functions

  // Step 1: Show the modality selection dialog (gates recording behind therapist choice)
  const handleStartSession = () => {
    // Pre-select based on patient's focus topics (already parsed in sessionContext init)
    setSetupSelectedModality(sessionContext.session_type || 'CBT');
    setShowSessionSetup(true);
  };

  // Step 2: Therapist confirms modality → actually start recording
  const handleConfirmSessionStart = async () => {
    // Apply therapist's modality selection to session context
    const selectedOption = MODALITY_OPTIONS.find(m => m.code === setupSelectedModality);
    if (selectedOption) {
      setSessionContext({
        ...sessionContext,
        session_type: selectedOption.code,
        current_approach: selectedOption.name,
        therapist_selected_modality: true,
      });
    }

    // Close dialog
    setShowSessionSetup(false);

    // Reset word count tracker
    totalWordCountRef.current = 0;

    // Standard session initialization
    setSessionStartTime(new Date());
    setIsRecording(true);
    setSessionType('microphone');
    setSessionSummaryClosed(false);
    setSessionSummary(null);
    setSummaryError(null);
    setPausedTime(0);
    setIsPaused(false);
    setHasReceivedComprehensiveAnalysis(false);
    setTranscript([]);
    setAlerts([]);

    // Reset job tracking state
    setDisplayedRealtimeJobId(null);
    setDisplayedComprehensiveJobId(null);
    setWaitingForComprehensiveJobId(null);
    setPathwayGuidance({});
    setCitations([]);

    // Clear chart data for new session
    setChartDataHistory([]);

    // Priority: audio file > test script > microphone
    if (pendingAudioFile) {
      setSessionType('audio');
      await startAudioFileStreaming(pendingAudioFile.url);
      // Don't revoke URL yet — audio element needs it during playback
      setPendingAudioFile(null);
    } else if (pendingTestScript) {
      startTranscriptPlayback(pendingTestScript);
      setPendingTestScript(null);
    } else {
      await startMicrophoneRecording();
    }
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
      // Use refs to avoid stale closure — requestSummary may be called from
      // setInterval callbacks or after React batched state updates
      const currentTranscript = transcriptRef.current;
      const currentMetrics = sessionMetricsRef.current;

      const fullTranscript = currentTranscript
        .filter(t => !t.is_interim)
        .map(t => ({
          speaker: t.speaker || 'conversation',
          text: t.text,
          timestamp: t.timestamp,
        }));

      console.log(`[Summary] Preparing request with ${fullTranscript.length} transcript entries (from ${currentTranscript.length} total)`);

      if (fullTranscript.length === 0) {
        throw new Error('No transcript data available for summary generation.');
      }

      const result = await generateSessionSummary(fullTranscript, currentMetrics);

      if (result && result.summary) {
        setSessionSummary(result.summary);
        setShowSessionSummary(true);
        setSaveSessionSuccess(false);
      } else {
        throw new Error('Invalid summary response — the AI model returned an incomplete result. Please retry.');
      }
    } catch (err: any) {
      console.error('Error generating summary:', err);
      // Use the classified error message if available, otherwise fall back to generic
      const errorMessage = err instanceof Error && err.message
        ? err.message
        : 'Failed to generate session summary. Please try again.';
      setSummaryError(errorMessage);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSaveSession = async (patientName: string) => {
    setSaveSessionLoading(true);
    setSaveSessionSuccess(false);
    try {
      const ANALYSIS_API = import.meta.env.VITE_ANALYSIS_API || '';
      if (!ANALYSIS_API) throw new Error('Analysis API not configured');

      const durationMin = Math.floor(sessionDurationRef.current / 60);
      const summaryText = sessionSummary?.overall_assessment || sessionSummary?.session_overview || 'Session completed';

      const res = await axios.post(`${ANALYSIS_API}/therapy_analysis`, {
        action: 'save_session',
        patient_id: patientName.trim(),
        date: new Date().toISOString().split('T')[0],
        duration_minutes: durationMin,
        summary_text: summaryText,
        session_type: sessionContextRef.current?.current_approach || 'General',
        full_summary: sessionSummary,
        session_metrics: sessionMetricsRef.current,
      }, {
        headers: currentUser ? { Authorization: `Bearer ${currentUser}` } : {},
      });

      setSaveSessionSuccess(true);
      if (onSessionSaved && res.data?.session_id) {
        onSessionSaved({
          id: res.data.session_id,
          date: new Date().toISOString().split('T')[0],
          duration: `${durationMin} min`,
          summary: summaryText,
          fullSummary: sessionSummary as SessionSummary,
        });
      }
    } catch (err: any) {
      console.error('[Session Save] Failed:', err?.message || err);
      throw err;
    } finally {
      setSaveSessionLoading(false);
    }
  };

  // Shared function to start interval-based transcript playback
  const startTranscriptPlayback = (data: TestTranscriptEntry[]) => {
    setIsTestMode(true);
    setIsRecording(true);
    setSessionType('test');
    setSessionStartTime(new Date());
    setTranscript([]);
    setPausedTime(0);
    setIsPaused(false);
    setHasReceivedComprehensiveAnalysis(false);
    totalWordCountRef.current = 0; // Reset word count for modality threshold tracking

    // Reset job tracking state
    setDisplayedRealtimeJobId(null);
    setDisplayedComprehensiveJobId(null);
    setWaitingForComprehensiveJobId(null);
    setPathwayGuidance({});
    setCitations([]);

    // Clear chart data - will be populated by real analysis responses
    setChartDataHistory([]);

    // Reset session metrics - will be populated by analysis
    setSessionMetrics({
      engagement_level: 0.0,
      therapeutic_alliance: 'unknown',
      techniques_detected: [],
      detected_modality: undefined,
      emotional_state: 'unknown',
      arousal_level: 'unknown',
      phase_appropriate: false,
    });

    activeTranscriptDataRef.current = data;

    let currentIndex = 0;
    testIntervalRef.current = setInterval(() => {
        if (currentIndex >= data.length) {
          if (testIntervalRef.current) {
            clearInterval(testIntervalRef.current);
            testIntervalRef.current = null;
          }
          setIsTestMode(false);
          setIsRecording(false);
          setSessionType(null);
          // Auto-trigger summary when script finishes
          requestSummary();
          return;
        }

        const entry = data[currentIndex];
        const formattedEntry = {
          text: entry.speaker ? `${entry.speaker}: ${entry.text}` : entry.text,
          timestamp: new Date().toISOString(),
          is_interim: false,
        };

        setTranscript(prev => [...prev, formattedEntry]);

        // Track cumulative word count for minimum modality suggestion threshold
        totalWordCountRef.current += entry.text.split(/\s+/).filter(Boolean).length;

        if (!transcriptOpen) {
          setNewTranscriptCount(prev => prev + 1);
        }

        currentIndex++;
    }, 2000);
  };

  // Test mode functions
  const loadTestTranscript = () => {
    startTranscriptPlayback(testTranscriptData);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be re-selected
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        if (!Array.isArray(parsed)) {
          setError('Invalid file: expected a JSON array of transcript entries.');
          return;
        }
        if (parsed.length === 0) {
          setError('Transcript file is empty.');
          return;
        }

        // Validate structure
        const isValid = parsed.every((entry: any) =>
          typeof entry === 'object' && entry !== null &&
          typeof entry.speaker === 'string' && typeof entry.text === 'string'
        );
        if (!isValid) {
          setError('Invalid format: each entry must have "speaker" and "text" string fields.');
          return;
        }

        // Map to TestTranscriptEntry format
        const transcriptData: TestTranscriptEntry[] = parsed.map((entry: any) => ({
          text: entry.text,
          timestamp: new Date().toISOString(),
          is_interim: false as const,
          speaker: entry.speaker as 'THERAPIST' | 'PATIENT',
        }));

        setError(null);
        // Store script for playback — don't auto-start. User clicks "Start Session" to select modality first.
        setPendingTestScript(transcriptData);
      } catch {
        setError('Failed to parse JSON file. Please check the file format.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  const handleAudioFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|webm|ogg)$/i)) {
      setError('Unsupported audio format. Please use MP3, WAV, M4A, WebM, or OGG.');
      return;
    }

    // Revoke previous blob URL if one exists
    if (pendingAudioFile?.url) {
      URL.revokeObjectURL(pendingAudioFile.url);
    }

    const blobUrl = URL.createObjectURL(file);
    setPendingAudioFile({ name: file.name, url: blobUrl });
    setPendingTestScript(null); // Clear test script if audio is loaded
    setError(null);
    console.log('[NewTherSession] Audio file loaded:', file.name, file.type);
  };

  const pauseTestMode = () => {
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
  };

  const resumeTestMode = () => {
    if (isTestMode && !testIntervalRef.current) {
      const data = activeTranscriptDataRef.current;
      // Resume from where we left off
      const currentTranscriptLength = transcript.filter(t => !t.is_interim).length;
      let currentIndex = currentTranscriptLength;

      testIntervalRef.current = setInterval(() => {
        if (currentIndex >= data.length) {
          if (testIntervalRef.current) {
            clearInterval(testIntervalRef.current);
            testIntervalRef.current = null;
          }
          setIsTestMode(false);
          setIsRecording(false);
          setSessionType(null);
          requestSummary();
          return;
        }

        const entry = data[currentIndex];
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

  const stopTestMode = () => {
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
    setIsTestMode(false);
    setIsRecording(false);
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
    
    // Reset job tracking state
    setDisplayedRealtimeJobId(null);
    setDisplayedComprehensiveJobId(null);
    setWaitingForComprehensiveJobId(null);
    setPathwayGuidance({});
    setCitations([]);

    // Clear chart data - will be populated by real analysis responses
    setChartDataHistory([]);

    // Reset session metrics - will be populated by analysis
    setSessionMetrics({
      engagement_level: 0.0,
      therapeutic_alliance: 'unknown',
      techniques_detected: [],
      detected_modality: undefined,
      emotional_state: 'unknown',
      arousal_level: 'unknown',
      phase_appropriate: false,
    });

    // Start streaming the example audio file
    await startAudioFileStreaming('/audio/suny-good-audio.mp3');
  };

  const handleActionClick = (action: any, isContra: boolean) => {
    setSelectedAction(action);
    setSelectedCitation(null); // Clear citation if action is selected
    setIsContraindication(isContra);
  };

  const handleCitationClick = (citation: any) => {
    setSelectedCitation(citation);
    setSelectedAction(null); // Clear action if citation is selected
  };

  const handleClosePanel = () => {
    setSelectedAction(null);
    setSelectedCitation(null);
  };

  const handleCitationModalClick = (citation: Citation) => {
    setSelectedCitationModal(citation);
    setCitationModalOpen(true);
  };

  // Safety alert acknowledgement — generates a stable key per alert and tracks which have been acknowledged
  const getAlertKey = (alert: IAlert) => `${alert.category}-${alert.title}-${alert.timestamp || ''}`;
  const handleAcknowledgeSafetyAlert = (alert: IAlert) => {
    const key = getAlertKey(alert);
    setAcknowledgedSafetyAlerts(prev => new Set([...prev, key]));
  };

  // Find the most urgent unacknowledged safety alert for the persistent banner
  const activeSafetyAlert = alerts.find(
    a => a.category === 'safety' && a.timing === 'now' && !acknowledgedSafetyAlerts.has(getAlertKey(a))
  );

  const getEmotionalStateColor = (state: string) => {
    switch (state) {
      case 'calm': return '#128937';
      case 'anxious': return '#f59e0b';
      case 'distressed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getArousalColor = (level: string) => {
    switch (level) {
      case 'low': return '#3b82f6';      // Blue - low arousal
      case 'moderate': return '#10b981'; // Green - optimal
      case 'high': return '#f59e0b';     // Amber - elevated
      case 'elevated': return '#ef4444'; // Red - very high
      default: return '#6b7280';         // Gray - unknown
    }
  };

  // Get alert category icon
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'safety':
        return <Shield sx={{ fontSize: 20, color: '#dc2626' }} />;
      case 'technique':
        return <Psychology sx={{ fontSize: 20, color: '#c05a01' }} />;
      case 'pathway_change':
        return <SwapHoriz sx={{ fontSize: 20, color: '#f59e0b' }} />;
      case 'engagement':
        return <Lightbulb sx={{ fontSize: 20, color: '#10b981' }} />;
      case 'process':
        return <Assessment sx={{ fontSize: 20, color: '#6366f1' }} />;
      default:
        return <Build sx={{ fontSize: 20, color: '#6b7280' }} />;
    }
  };

  // Helper function to ensure recommendations are formatted as bullet points
  const normalizeRecommendationFormat = (recommendation: string): string => {
    if (!recommendation) return recommendation;
    
    // If it already contains markdown bullet points, return as-is
    if (recommendation.includes('- ') || recommendation.includes('* ')) {
      return recommendation;
    }
    
    // Split by periods or newlines to create separate bullet points
    const lines = recommendation
      .split(/[.\n]/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // If we only have one line, return as-is (might be a single sentence)
    if (lines.length <= 1) {
      return recommendation;
    }
    
    // Convert to markdown bullet points
    return lines.map(line => `- ${line}`).join('\n');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
      if (testIntervalRef.current) {
        clearInterval(testIntervalRef.current);
      }
      // Revoke any pending audio blob URL to prevent memory leaks
      if (pendingAudioFile?.url) {
        URL.revokeObjectURL(pendingAudioFile.url);
      }
    };
  }, [stopStreaming]);

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      maxHeight: '100vh',
      background: '#f0f4f9',
      p: 1.5,
      overflow: 'hidden',
    }}>
      {/* Main Container */}
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        {/* Safety Alert Banner — full-width persistent banner for critical safety alerts */}
        {activeSafetyAlert && (
          <Box
            sx={{
              bgcolor: '#dc2626',
              color: 'white',
              px: 2.5,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexShrink: 0,
              animation: 'safetyBannerPulse 2s infinite',
              '@keyframes safetyBannerPulse': {
                '0%': { bgcolor: '#dc2626' },
                '50%': { bgcolor: '#b91c1c' },
                '100%': { bgcolor: '#dc2626' },
              },
            }}
          >
            <Shield sx={{ fontSize: 28, flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.3 }}>
                ⚠ {activeSafetyAlert.title}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.95, fontSize: '0.8rem', mt: 0.25, maxHeight: 120, overflowY: 'auto' }}>
                {activeSafetyAlert.message}
              </Typography>
              {activeSafetyAlert.citation && (
                <Typography variant="caption" sx={{ opacity: 0.75, fontSize: '0.7rem', mt: 0.5, fontStyle: 'italic', display: 'block' }}>
                  Source: {activeSafetyAlert.citation}
                </Typography>
              )}
              {activeSafetyAlert.crisis_resources && activeSafetyAlert.crisis_resources.length > 0 && (
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                  {activeSafetyAlert.crisis_resources.map((resource, idx) => (
                    <Chip
                      key={idx}
                      icon={<Phone sx={{ fontSize: 14, color: 'white !important' }} />}
                      label={resource}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        '& .MuiChip-icon': { color: 'white' },
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Warning />}
              onClick={() => handleAcknowledgeSafetyAlert(activeSafetyAlert)}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.6)',
                fontWeight: 700,
                textTransform: 'none',
                flexShrink: 0,
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.15)',
                },
              }}
            >
              Acknowledge
            </Button>
          </Box>
        )}

        {/* Main Content Area */}
        <Box sx={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <ActionDetailsPanel
            action={selectedAction}
            citation={selectedCitation}
            onClose={handleClosePanel}
            isContraindication={isContraindication}
          />
          {/* Sidebar */}
          <Box sx={{
            width: 351,
            display: 'flex',
            transform: (selectedAction || selectedCitation) ? 'translateX(-100%)' : 'translateX(0)',
            transition: 'transform 0.3s ease-in-out',
            flexDirection: 'column',
            gap: 2,
            p: 2,
            minHeight: 0,
            overflow: 'hidden',
          }}>
            {/* Title Section */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                {onNavigateBack && (
                  <Button
                    startIcon={<ArrowBack />}
                    onClick={onNavigateBack}
                    sx={{
                      color: '#0b57d0',
                      textTransform: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      minWidth: 'auto',
                      px: 1,
                      py: 0.5,
                      '&:hover': {
                        backgroundColor: 'rgba(11, 87, 208, 0.04)',
                      },
                    }}
                  >
                  </Button>
                )}
                <Typography variant="h6" sx={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#1f1f1f',
                }}>
                  {getPatientName()}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{
                fontSize: '13px',
                color: '#444746',
                mb: 0.5,
              }}>
                {getCurrentDate()}
              </Typography>
              <BackendStatusIndicator />
            </Box>

            {/* Navigation Menu */}
            <Box>
            {[
              { key: 'guidance', label: 'Guidance', icon: <Explore sx={{ fontSize: 24, color: '#444746' }} /> },
              { key: 'pathway', label: 'Pathway', icon: <Route sx={{ fontSize: 24, color: '#444746' }} /> },
            ].map((item, idx, arr) => (
                <Box
                  key={item.key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 44,
                    px: 1.5,
                    py: 0.5,
                    cursor: 'pointer',
                    backgroundColor: activeTab === item.key ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                    borderBottom: idx < arr.length - 1 ? '1px solid rgba(196, 199, 197, 0.3)' : 'none',
                  }}
                  onClick={() => setActiveTab(item.key as any)}
                >
                  <Box sx={{ mr: 1.5, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {activeTab === item.key ? item.icon : null}
                  </Box>
                  <Typography variant="body1" sx={{ fontSize: '18px', color: '#1f1f1f' }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* LLM Activity Log */}
            <ActivityLog
              entries={activityLogEntries}
              onClear={() => setActivityLogEntries([])}
            />
          </Box>

          {/* Main Content */}
          <Box sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            gap: 1.5,
            overflow: 'auto',
            minHeight: 0,
          }}>
            {activeTab === 'guidance' && (
              <GuidanceTab
                currentGuidance={getCurrentGuidance()}
                alerts={alerts}
                transcript={transcript}
                pathwayGuidance={pathwayGuidance}
                onActionClick={handleActionClick}
                sessionMetrics={sessionMetrics}
              />
            )}
            {activeTab === 'evidence' && (
              <EvidenceTab
                currentAlert={alerts.length > 0 ? alerts[0] : null}
                sessionDuration={sessionDuration}
              />
            )}
            {activeTab === 'pathway' && (
              <PathwayTab
                onCitationClick={handleCitationClick}
                onActionClick={handleActionClick}
                currentGuidance={getPathwayGuidance()}
                citations={citations}
                techniques={sessionMetrics.techniques_detected}
                currentAlert={getCurrentAlert()}
                pathwayIndicators={pathwayIndicators}
              />
            )}
          </Box>
        </Box>

        {/* Timeline Section */}
        <Box sx={{
          backgroundColor: 'white',
          px: 2,
          borderTop: '1px solid #f0f4f9',
          flexShrink: 0,
        }}>
          {/* Collapse toggle */}
          <Box
            onClick={() => setChartExpanded(!chartExpanded)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              py: 0.5,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Timeline
            </Typography>
            {chartExpanded ? <ExpandLess sx={{ fontSize: 16, color: '#5f6368' }} /> : <ExpandMore sx={{ fontSize: 16, color: '#5f6368' }} />}
          </Box>

          <Collapse in={chartExpanded}>
          {/* Chart Grid */}
          <Box sx={{ position: 'relative', mb: 1 }}>
            <Box sx={{
              backgroundColor: 'white',
              border: '1px solid #e9ebf1',
              borderRadius: 1,
              position: 'relative',
              py: 1,
              px: 0.5,
            }}>
              <SessionLineChart
                duration={sessionDuration}
                chartData={chartDataHistory}
              />
            </Box>

            {/* Dynamic event markers from actual session alerts */}
            {alerts.length > 0 && sessionDuration > 0 && (
              <Box sx={{
                display: 'flex',
                position: 'relative',
                height: 28,
                mt: 0.5,
                mx: 5.5, // Align with chart area (offset for Y-axis label width)
              }}>
                {alerts
                  .filter(a => a.sessionTime !== undefined)
                  .slice(0, 8)
                  .map((alert, idx) => {
                    const position = Math.max(2, Math.min(98, ((alert.sessionTime || 0) / sessionDuration) * 100));
                    return (
                      <Tooltip key={idx} title={`${alert.title} (${alert.category})`}>
                        <IconButton
                          onClick={() => setSelectedAlertIndex(idx)}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: `${position}%`,
                            transform: 'translateX(-50%)',
                            p: 0.25,
                          }}
                        >
                          {getCategoryIcon(alert.category)}
                        </IconButton>
                      </Tooltip>
                    );
                  })
                }
              </Box>
            )}
          </Box>
          </Collapse>

        </Box>

        {/* Session Header with KPIs - Now at Bottom */}
        <Box sx={{
          backgroundColor: 'white',
          borderTop: '1px solid #f0f4f9',
          borderRadius: '0 0 8px 8px',
          flexShrink: 0,
        }}>
          {/* Pathway Header */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 0.5,
            borderBottom: '1px solid #f0f4f9',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Timeline sx={{ fontSize: 20, color: '#444746' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f1f1f', fontSize: '15px' }}>
                {sessionContext.current_approach || 'Cognitive Behavioral Therapy'}
              </Typography>
              {/* Therapist-selected badge */}
              {sessionContext.therapist_selected_modality && (
                <Chip
                  icon={<Check sx={{ fontSize: 14 }} />}
                  label="Therapist Selected"
                  size="small"
                  sx={{
                    backgroundColor: '#e3f2fd',
                    border: '1px solid #90caf9',
                    borderRadius: '8px',
                    height: '22px',
                    '& .MuiChip-label': { fontSize: '10px', fontWeight: 500, color: '#1565c0', px: 1 },
                    '& .MuiChip-icon': { color: '#1565c0' },
                  }}
                />
              )}
              {/* AI modality suggestion — informational only, requires minimum word threshold */}
              {sessionMetrics.detected_modality && sessionMetrics.detected_modality.confidence >= 0.7
                && sessionContext.session_type !== sessionMetrics.detected_modality.code
                && totalWordCountRef.current >= MIN_WORDS_FOR_MODALITY_SUGGESTION && (
                <Tooltip title={`Based on ${totalWordCountRef.current} words analyzed. Consider ${sessionMetrics.detected_modality.name} for next session.`}>
                  <Chip
                    icon={<Lightbulb sx={{ fontSize: 14 }} />}
                    label={`AI suggests: ${sessionMetrics.detected_modality.code} (${Math.round(sessionMetrics.detected_modality.confidence * 100)}%)`}
                    size="small"
                    sx={{
                      backgroundColor: '#fff8e1',
                      border: '1px solid #ffe082',
                      borderRadius: '8px',
                      height: '22px',
                      '& .MuiChip-label': { fontSize: '10px', fontWeight: 500, color: '#f57f17', px: 1 },
                      '& .MuiChip-icon': { color: '#f57f17' },
                    }}
                  />
                </Tooltip>
              )}
              {/* Gathering data placeholder — shown when recording but not enough words yet */}
              {isRecording && totalWordCountRef.current < MIN_WORDS_FOR_MODALITY_SUGGESTION && totalWordCountRef.current > 0 && (
                <Chip
                  label="Gathering data..."
                  size="small"
                  sx={{
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    height: '22px',
                    '& .MuiChip-label': { fontSize: '10px', fontWeight: 400, color: '#9e9e9e', px: 1 },
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* Dynamic effectiveness chip from pathway analysis */}
              {(() => {
                const eff = pathwayIndicators.current_approach_effectiveness;
                const effConfig = {
                  effective: { bg: '#ddf8d8', border: '#beefbb', color: '#128937', label: 'Effective', tooltip: 'Current therapeutic approach is producing positive patient responses and treatment engagement.' },
                  struggling: { bg: '#fef3cd', border: '#fde68a', color: '#92400e', label: 'Struggling', tooltip: 'Patient shows limited response to current approach; consider adjusting techniques or exploring alternative pathways.' },
                  ineffective: { bg: '#fee2e2', border: '#fca5a5', color: '#b91c1c', label: 'Ineffective', tooltip: 'Current approach is not producing therapeutic benefit; a shift in modality or technique is recommended.' },
                  unknown: { bg: '#f3f4f6', border: '#e0e0e0', color: '#9e9e9e', label: 'Assessing...', tooltip: 'Evaluating therapeutic approach effectiveness based on patient responses and session dynamics.' },
                }[eff] || { bg: '#f3f4f6', border: '#e0e0e0', color: '#9e9e9e', label: 'Assessing...', tooltip: 'Evaluating therapeutic approach effectiveness.' };
                return (
                  <Tooltip title={effConfig.tooltip} arrow placement="top">
                  <Chip
                    icon={eff !== 'unknown' ? <Check sx={{ fontSize: 18, color: effConfig.color }} /> : undefined}
                    label={effConfig.label}
                    size="small"
                    sx={{
                      backgroundColor: effConfig.bg,
                      border: `1px solid ${effConfig.border}`,
                      borderRadius: '8px',
                      '& .MuiChip-icon': { color: effConfig.color },
                      '& .MuiChip-label': {
                        fontSize: '12px',
                        fontWeight: 500,
                        color: effConfig.color,
                      },
                    }}
                  />
                  </Tooltip>
                );
              })()}
            </Box>
          </Box>

          {/* Session Metrics Row */}
          <Box sx={{ 
            display: 'flex',
            '& > *:not(:first-of-type)': { flex: 1 },
          }}>
            {/* Session ID / Transcript Button / Test Buttons */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 1,
              py: 1,
              borderRight: '1px solid #f0f4f9',
              minWidth: isRecording ? 100 : 'auto',
              flexShrink: 0,
            }}>
              {isRecording ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Chat sx={{ fontSize: 16 }} />}
                  onClick={() => {
                    setTranscriptOpen(!transcriptOpen);
                    if (!transcriptOpen) {
                      setNewTranscriptCount(0);
                    }
                  }}
                  sx={{
                    borderColor: '#0b57d0',
                    color: '#0b57d0',
                    fontSize: '14px',
                    fontWeight: 500,
                    borderRadius: '4px',
                    px: 1,
                    py: 0.25,
                    minWidth: 'auto',
                    position: 'relative',
                    '& .MuiButton-startIcon': {
                      marginRight: 0.5,
                      marginLeft: 0,
                    },
                    '&:hover': {
                      borderColor: '#00639b',
                      backgroundColor: 'rgba(11, 87, 208, 0.04)',
                    },
                  }}
                >
                  Transcript
                  {newTranscriptCount > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        backgroundColor: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        minWidth: 14,
                        height: 14,
                        fontSize: '9px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.5,
                      }}
                    >
                      {newTranscriptCount > 99 ? '99+' : newTranscriptCount}
                    </Box>
                  )}
                </Button>
              ) : !isTestMode ? (
                <Box sx={{
                  display: 'flex',
                  gap: 0.5,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
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
                      borderRadius: '12px',
                      px: 1.5,
                      py: 0.25,
                      fontSize: '11px',
                      minWidth: 'auto',
                    }}
                  >
                    Example Audio
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
                      borderRadius: '12px',
                      px: 1.5,
                      py: 0.25,
                      fontSize: '11px',
                      minWidth: 'auto',
                    }}
                  >
                    Test Transcript
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadFile />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      borderColor: '#0d9488',
                      color: '#0d9488',
                      '&:hover': {
                        borderColor: '#0f766e',
                        backgroundColor: 'rgba(13, 148, 136, 0.04)',
                      },
                      fontWeight: 600,
                      borderRadius: '12px',
                      px: 1.5,
                      py: 0.25,
                      fontSize: '11px',
                      minWidth: 'auto',
                    }}
                  >
                    Upload Script
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Headphones />}
                    onClick={() => audioFileInputRef.current?.click()}
                    sx={{
                      borderColor: '#7c3aed',
                      color: '#7c3aed',
                      '&:hover': {
                        borderColor: '#6d28d9',
                        backgroundColor: 'rgba(124, 58, 237, 0.04)',
                      },
                      fontWeight: 600,
                      borderRadius: '12px',
                      px: 1.5,
                      py: 0.25,
                      fontSize: '11px',
                      minWidth: 'auto',
                    }}
                  >
                    Upload Audio
                  </Button>
                  <input
                    type="file"
                    accept=".mp3,.wav,.m4a,.webm,.ogg"
                    ref={audioFileInputRef}
                    onChange={handleAudioFileUpload}
                    style={{ display: 'none' }}
                  />
                  {pendingTestScript && (
                    <Chip
                      label={`Script loaded (${pendingTestScript.length} entries)`}
                      size="small"
                      color="success"
                      onDelete={() => setPendingTestScript(null)}
                      sx={{ fontWeight: 600, fontSize: '10px' }}
                    />
                  )}
                  {pendingAudioFile && (
                    <Chip
                      label={`Audio: ${pendingAudioFile.name}`}
                      size="small"
                      color="secondary"
                      onDelete={() => {
                        URL.revokeObjectURL(pendingAudioFile.url);
                        setPendingAudioFile(null);
                      }}
                      sx={{ fontWeight: 600, fontSize: '10px', maxWidth: '200px' }}
                    />
                  )}
                </Box>
              ) : (
                <Typography variant="h6" sx={{ fontWeight: 500, fontSize: '24px', color: '#1e1e1e' }}>
                  {sessionId}
                </Typography>
              )}
            </Box>

            {/* Phase Indicator */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderRight: '1px solid #f0f4f9',
              minWidth: 110,
              overflow: 'hidden',
            }}>
              <Check sx={{ fontSize: 16, color: sessionMetrics.phase_appropriate ? '#128937' : '#f59e0b' }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{
                  fontSize: '9px',
                  color: '#5f6368',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  lineHeight: 1.2,
                }}>
                  {determineTherapyPhase(sessionDuration)}
                </Typography>
                <Typography sx={{ fontWeight: 600, fontSize: '12px', color: sessionMetrics.phase_appropriate ? '#128937' : '#f59e0b', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                  {sessionMetrics.phase_appropriate ? 'Phase-appropriate' : 'Assessing...'}
                </Typography>
              </Box>
            </Box>

            {/* Timer and Controls */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1.5,
              px: 2,
              py: 0.75,
            }}>
              {/* Mic / Connection Status + Voice Activity */}
              {isRecording && (() => {
                // Derive current speaker from most recent transcript entry
                const recentEntries = transcript.filter(t => t.speaker && t.speaker !== 'conversation');
                const currentSpeaker = recentEntries.length > 0 ? recentEntries[recentEntries.length - 1].speaker : null;
                const hasInterim = transcript.some(t => t.is_interim);
                const speakerColor = currentSpeaker === 'Therapist' ? '#0d9488' : currentSpeaker === 'Patient' ? '#6366f1' : '#059669';

                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {!isPaused ? (
                      <>
                        {/* Connection dot */}
                        <Box sx={{
                          width: 10, height: 10, borderRadius: '50%',
                          backgroundColor: isConnected
                            ? (hasInterim ? speakerColor : '#10b981')
                            : (!wasEverConnectedRef.current && sessionDuration < 5 ? '#f59e0b' : '#ef4444'),
                          animation: isConnected
                            ? (hasInterim ? 'pulse-voice 0.8s ease-in-out infinite' : 'pulse-mic 1.5s ease-in-out infinite')
                            : (!wasEverConnectedRef.current && sessionDuration < 5 ? 'pulse-mic 1.5s ease-in-out infinite' : 'none'),
                          boxShadow: isConnected
                            ? (hasInterim ? `0 0 8px ${speakerColor}80` : '0 0 6px rgba(16, 185, 129, 0.5)')
                            : (!wasEverConnectedRef.current && sessionDuration < 5
                              ? '0 0 6px rgba(245, 158, 11, 0.5)'
                              : '0 0 6px rgba(239, 68, 68, 0.5)'),
                          '@keyframes pulse-mic': {
                            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                            '50%': { opacity: 0.5, transform: 'scale(0.85)' },
                          },
                          '@keyframes pulse-voice': {
                            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                            '50%': { opacity: 0.6, transform: 'scale(1.3)' },
                          },
                        }} />
                        {/* Status text */}
                        <Typography sx={{
                          fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
                          color: isConnected
                            ? speakerColor
                            : (!wasEverConnectedRef.current && sessionDuration < 5 ? '#d97706' : '#dc2626'),
                        }}>
                          {!isConnected
                            ? (!wasEverConnectedRef.current && sessionDuration < 5 ? 'Connecting...' : 'Disconnected')
                            : hasInterim && currentSpeaker
                              ? `${currentSpeaker} speaking`
                              : sessionType === 'audio' ? 'Playing' : 'Listening'
                          }
                        </Typography>

                        {/* Audio level bars — driven by real PCM audio level from worklet */}
                        {isConnected && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', ml: 0.25 }}>
                            {[0.6, 1.0, 0.8, 0.5, 0.9, 0.7, 0.4].map((sensitivity, i) => {
                              const barHeight = Math.max(3, Math.min(14, 3 + audioLevel * sensitivity * 14));
                              return (
                                <Box
                                  key={i}
                                  sx={{
                                    width: 2.5,
                                    height: `${barHeight}px`,
                                    borderRadius: 1,
                                    backgroundColor: hasInterim ? speakerColor : '#10b981',
                                    opacity: audioLevel > 0.02 ? 0.9 : 0.35,
                                    transition: 'height 80ms ease-out, opacity 200ms ease',
                                  }}
                                />
                              );
                            })}
                          </Box>
                        )}
                      </>
                    ) : (
                      <>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                        <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#d97706', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                          Paused
                        </Typography>
                      </>
                    )}
                    <Box sx={{ width: 1, height: 16, backgroundColor: '#e8eaed', mx: 0.5 }} />
                    {/* Speaker role indicator */}
                    <Typography sx={{ fontSize: '9px', color: '#5f6368' }}>
                      {sessionType === 'audio'
                        ? 'Audio File'
                        : currentSpeaker
                          ? <><Box component="span" sx={{ color: '#0d9488', fontWeight: 600 }}>T</Box>=Therapist <Box component="span" sx={{ color: '#6366f1', fontWeight: 600 }}>P</Box>=Patient</>
                          : 'Diarization: auto-detect speakers'
                      }
                    </Typography>
                  </Box>
                );
              })()}
              <Typography variant="h6" sx={{ fontWeight: 400, fontSize: '22px', color: '#444746' }}>
                {formatDuration(sessionDuration)}
              </Typography>
              {!isRecording ? (
                <Button
                  variant="contained"
                  startIcon={<Mic />}
                  onClick={handleStartSession}
                  sx={{ 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    },
                  }}
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
                  <IconButton
                    onClick={handleStopSession}
                    sx={{
                      backgroundColor: '#f9dedc',
                      color: '#8c1d18',
                      width: 40,
                      height: 40,
                      '&:hover': {
                        backgroundColor: '#f5c6c6',
                      },
                    }}
                  >
                    <Stop />
                  </IconButton>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Audio Playback Progress Bar */}
      {isPlayingAudio && (
        <Box sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.95) 0%, rgba(109, 40, 217, 0.95) 100%)',
          backdropFilter: 'blur(8px)',
          px: 3,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}>
          <Headphones sx={{ color: 'white', fontSize: 20 }} />
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, minWidth: 'fit-content', fontSize: '0.75rem' }}>
            Playing Audio
          </Typography>
          <Box sx={{ flex: 1, position: 'relative', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' }}>
            <Box sx={{
              position: 'absolute',
              top: 0, left: 0, bottom: 0,
              width: `${audioProgress}%`,
              borderRadius: 3,
              background: 'linear-gradient(90deg, #a78bfa 0%, #c4b5fd 100%)',
              transition: 'width 0.3s ease',
            }} />
          </Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500, minWidth: 40, textAlign: 'right' }}>
            {Math.round(audioProgress)}%
          </Typography>
        </Box>
      )}

      {/* Floating Action Buttons */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1201, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
        {/* Reopen Session Summary Button */}
        {sessionSummaryClosed && !showSessionSummary && (
          <Fab
            color="secondary"
            variant="extended"
            aria-label="reopen session summary"
            onClick={() => setShowSessionSummary(true)}
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
            <Article sx={{ mr: 1 }} />
            Summary
          </Fab>
        )}
      </Box>


      {/* Left Sidebar - Transcript */}
      <Drawer
        anchor="left"
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
            boxShadow: '8px 0 32px -4px rgba(0, 0, 0, 0.12)',
            borderRight: '1px solid rgba(255, 255, 255, 0.5)',
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
        
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <TranscriptDisplay transcript={transcript} />
        </Box>
      </Drawer>

      {/* Error Display */}
      {error && (
        <Box sx={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1300 }}>
          <MuiAlert severity="error" onClose={() => setError(null)}>
            {error}
          </MuiAlert>
        </Box>
      )}

      {/* Session Summary Modal */}
      <SessionSummaryModal
        open={showSessionSummary}
        onClose={() => { setShowSessionSummary(false); if (!summaryLoading) setSummaryError(null); }}
        summary={sessionSummary}
        loading={summaryLoading}
        error={summaryError}
        onRetry={requestSummary}
        sessionId={sessionId}
        alternativePathways={pathwayGuidance.alternative_pathways}
        onSaveSession={handleSaveSession}
        saveSessionLoading={saveSessionLoading}
        saveSessionSuccess={saveSessionSuccess}
      />

      <RationaleModal
        open={showRationaleModal}
        onClose={() => setShowRationaleModal(false)}
        rationale={pathwayGuidance.rationale}
        immediateActions={pathwayGuidance.immediate_actions}
        contraindications={pathwayGuidance.contraindications}
        citations={citations}
        onCitationClick={handleCitationModalClick}
      />

      <CitationModal
        open={citationModalOpen}
        onClose={() => {
          setCitationModalOpen(false);
          setSelectedCitationModal(null);
        }}
        citation={selectedCitationModal}
      />

      {/* Session Setup Dialog — Therapist selects modality before recording starts */}
      <Dialog
        open={showSessionSetup}
        onClose={() => setShowSessionSetup(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafe 100%)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Psychology sx={{ color: '#1565c0', fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f1f1f', fontSize: '18px' }}>
                Session Setup
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368', fontSize: '13px' }}>
                Select the therapy modality for this session
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600, fontSize: '14px', color: '#444746' }}>
              Therapy Modality
            </FormLabel>
            <RadioGroup
              value={setupSelectedModality}
              onChange={(e) => setSetupSelectedModality(e.target.value)}
            >
              {MODALITY_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option.code}
                  value={option.code}
                  control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#1565c0' } }} />}
                  label={
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f1f1f', fontSize: '14px' }}>
                        {option.name}
                        <Chip
                          label={option.code}
                          size="small"
                          sx={{ ml: 1, height: '18px', fontSize: '10px', fontWeight: 600, bgcolor: '#e3f2fd', color: '#1565c0' }}
                        />
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#5f6368', fontSize: '12px', lineHeight: 1.3, display: 'block', mt: 0.25 }}>
                        {option.description}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    mx: 0,
                    mb: 0.5,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: setupSelectedModality === option.code ? '#90caf9' : '#e0e0e0',
                    bgcolor: setupSelectedModality === option.code ? '#e3f2fd' : 'transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': { bgcolor: setupSelectedModality === option.code ? '#e3f2fd' : '#f5f5f5' },
                  }}
                />
              ))}
            </RadioGroup>
          </FormControl>
          {/* Example Audio — quick-pick for demo */}
          <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #e8eaed' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '14px', color: '#444746', mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <AudioFile sx={{ fontSize: 18, color: '#7c3aed' }} />
              Example Audio (optional)
            </Typography>
            <Typography variant="caption" sx={{ color: '#5f6368', fontSize: '11px', mb: 1.5, display: 'block' }}>
              Select a pre-loaded session recording for demo — or use microphone / upload your own audio above
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {EXAMPLE_AUDIO_OPTIONS.map((audio) => {
                const isSelected = pendingAudioFile?.name === audio.file;
                return (
                  <Button
                    key={audio.id}
                    variant={isSelected ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={<MusicNote sx={{ fontSize: 16 }} />}
                    onClick={() => {
                      if (isSelected) {
                        // Deselect
                        setPendingAudioFile(null);
                      } else {
                        // Select this example audio (uses public/ path — no blob URL needed)
                        if (pendingAudioFile?.url?.startsWith('blob:')) {
                          URL.revokeObjectURL(pendingAudioFile.url);
                        }
                        setPendingAudioFile({ name: audio.file, url: audio.file });
                        setPendingTestScript(null);
                      }
                    }}
                    sx={{
                      flex: 1,
                      textTransform: 'none',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '12px',
                      py: 1,
                      borderColor: isSelected ? '#7c3aed' : '#d1d5db',
                      color: isSelected ? '#fff' : '#374151',
                      background: isSelected ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'transparent',
                      '&:hover': {
                        borderColor: '#7c3aed',
                        backgroundColor: isSelected ? undefined : 'rgba(124, 58, 237, 0.04)',
                      },
                    }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Box>{audio.name}</Box>
                      <Box sx={{ fontSize: '10px', fontWeight: 400, opacity: 0.8, mt: 0.25 }}>{audio.description}</Box>
                    </Box>
                  </Button>
                );
              })}
            </Box>
            {pendingAudioFile && (
              <Chip
                label={`Audio ready: ${pendingAudioFile.name.replace('/audio/', '')}`}
                size="small"
                color="secondary"
                onDelete={() => {
                  if (pendingAudioFile.url.startsWith('blob:')) {
                    URL.revokeObjectURL(pendingAudioFile.url);
                  }
                  setPendingAudioFile(null);
                }}
                sx={{ mt: 1, fontWeight: 600, fontSize: '10px' }}
              />
            )}
          </Box>

          <MuiAlert severity="info" sx={{ mt: 2, borderRadius: '10px', fontSize: '12px' }}>
            The AI assistant will provide evidence-based guidance using the selected modality's research corpus.
            If the AI detects a different approach may be beneficial, it will display a suggestion chip — but will not auto-switch.
          </MuiAlert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setShowSessionSetup(false)}
            sx={{ color: '#5f6368', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={pendingAudioFile ? <Headphones /> : pendingTestScript ? <Article /> : <Mic />}
            onClick={handleConfirmSessionStart}
            disabled={!setupSelectedModality}
            sx={{
              background: pendingAudioFile
                ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '10px',
              '&:hover': {
                background: pendingAudioFile
                  ? 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)'
                  : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              },
            }}
          >
            {pendingAudioFile ? 'Start with Audio' : pendingTestScript ? 'Start with Script' : 'Start Session'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clinician Notes Panel - sticky at bottom */}
      <TherapistNotesPanel sessionInstanceId={sessionInstanceId} />

    </Box>
  );
};

export default NewTherSession;
