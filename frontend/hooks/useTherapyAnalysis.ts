import { useCallback } from 'react';
import axios from 'axios';
import { AnalysisResponse, SessionContext } from '../types/types';
import {
  generateSmartRealtimeAnalysis,
  generateSmartComprehensiveAnalysis
} from '../utils/smartMockAnalysis';

// Check if we should use mock mode - only when NO backend API is configured
// This allows the app to work without a backend while still providing intelligent mock responses
const USE_MOCK_MODE = !import.meta.env.VITE_ANALYSIS_API ||
  import.meta.env.VITE_ANALYSIS_API === '' ||
  import.meta.env.VITE_ANALYSIS_API === 'undefined';

const generateMockSessionSummary = () => ({
  summary: {
    overall_assessment: 'Session analysis based on transcript content.',
    key_themes: ['therapeutic engagement', 'emotional processing', 'coping strategies'],
    progress_indicators: ['Patient showed engagement with therapeutic process', 'Willingness to explore difficult topics'],
    areas_for_improvement: ['Continue building coping skills', 'Work on emotional regulation'],
    homework_suggestions: ['Practice techniques discussed in session', 'Monitor mood and triggers'],
    risk_assessment: 'Based on session content analysis',
    next_session_focus: 'Review progress and continue therapeutic work',
  },
});

interface UseTherapyAnalysisProps {
  onAnalysis: (analysis: AnalysisResponse) => void;
  onPathwayGuidance?: (guidance: any) => void;
  onSessionSummary?: (summary: any) => void;
  authToken?: string | null;
}

export const useTherapyAnalysis = ({
  onAnalysis,
  onPathwayGuidance,
  onSessionSummary,
  authToken
}: UseTherapyAnalysisProps) => {
  // Use env var or fallback to prevent undefined in URL
  const ANALYSIS_API = import.meta.env.VITE_ANALYSIS_API || '';

  // Log mock mode status once
  if (USE_MOCK_MODE) {
    console.log('[Analysis] 🎭 Mock mode enabled - API calls will return mock data');
  }

  const analyzeSegment = useCallback(async (
    transcriptSegment: Array<{ speaker: string; text: string; timestamp: string }>,
    sessionContext: SessionContext | { is_realtime?: boolean } & SessionContext,
    sessionDurationMinutes: number,
    previousAlert?: any,
    jobId?: number
  ) => {
    // Extract is_realtime flag if present
    const { is_realtime, ...cleanContext } = sessionContext as any;
    const analysisType = is_realtime ? 'realtime' : 'comprehensive';

    // In mock mode, use smart mock analyzer that responds to actual transcript content
    if (USE_MOCK_MODE) {
      console.log(`[Analysis] 🎭 ${analysisType.toUpperCase()} SMART MOCK - analyzing transcript content (jobId: ${jobId})`);
      // Simulate realistic network delay (200-400ms for realtime, 500-800ms for comprehensive)
      const delay = is_realtime ? 200 + Math.random() * 200 : 500 + Math.random() * 300;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Generate content-aware mock response
      const mockResponse = is_realtime
        ? generateSmartRealtimeAnalysis(transcriptSegment, sessionDurationMinutes, jobId || 1)
        : generateSmartComprehensiveAnalysis(transcriptSegment, sessionDurationMinutes, jobId || 1);

      console.log(`[Analysis] 🎭 ${analysisType.toUpperCase()} SMART MOCK RESPONSE:`, mockResponse);
      onAnalysis(mockResponse);
      return;
    }

    // Check if API URL is configured
    if (!ANALYSIS_API) {
      console.warn('[Analysis] ⚠️ VITE_ANALYSIS_API not configured - skipping API call');
      return;
    }

    const requestPayload = {
      action: 'analyze_segment',
      transcript_segment: transcriptSegment,
      session_context: cleanContext,
      session_duration_minutes: sessionDurationMinutes,
      is_realtime: is_realtime || false,
      previous_alert: previousAlert || null,
      job_id: jobId || null,
    };

    console.log(`[Analysis] 📤 ${analysisType.toUpperCase()} REQUEST:`, requestPayload);

    const startTime = performance.now();

    try {
      const response = await axios.post(`${ANALYSIS_API}/therapy_analysis`, requestPayload, {
        responseType: 'text',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const responseTime = performance.now() - startTime;
      const text = response.data;

      if (text) {
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const analysis = JSON.parse(line);

            console.log(`[Analysis] 📥 ${analysisType.toUpperCase()} RESPONSE (${responseTime.toFixed(0)}ms):`, analysis);

            // Always call onAnalysis if we have valid data
            if (analysis.alert || analysis.session_metrics || analysis.pathway_indicators) {
              onAnalysis(analysis as AnalysisResponse);
            }
          } catch (e) {
            console.error('[Analysis] ❌ Parse error:', e, 'Line:', line.substring(0, 100));
          }
        }
      } else {
        console.warn('[Analysis] ⚠️ Empty response from backend');
      }
    } catch (error: any) {
      const backendError = error.response?.data?.error;
      console.error('[Analysis] ❌ Request failed:', {
        message: error.message,
        status: error.response?.status,
        backendError,
        data: error.response?.data
      });
      // Log classified root cause for developer debugging
      if (backendError?.includes('credentials') || backendError?.includes('default credentials were not found')) {
        console.error('[Analysis] ❌ ROOT CAUSE: GCP credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS in backend .env');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        console.error('[Analysis] ❌ ROOT CAUSE: Cannot reach backend. Is the server running on the configured port?');
      }
    }
  }, [onAnalysis, ANALYSIS_API, authToken]);

  const getPathwayGuidance = useCallback(async (
    currentApproach: string,
    sessionHistory: any[],
    presentingIssues: string[]
  ) => {
    // In mock mode, return mock data
    if (USE_MOCK_MODE) {
      console.log('[Pathway] 🎭 MOCK - returning mock pathway guidance');
      const mockGuidance = {
        rationale: 'Mock: CBT approach is appropriate for presenting anxiety symptoms.',
        immediate_actions: ['Continue with cognitive restructuring', 'Introduce behavioral experiments'],
        contraindications: ['Avoid trauma processing until stabilization complete'],
        alternative_pathways: [
          { approach: 'ACT', reason: 'Good for values clarification', techniques: ['defusion', 'acceptance'] },
        ],
      };
      if (onPathwayGuidance) onPathwayGuidance(mockGuidance);
      return mockGuidance;
    }

    if (!ANALYSIS_API) {
      console.warn('[Pathway] ⚠️ VITE_ANALYSIS_API not configured - skipping');
      return null;
    }

    const startTime = performance.now();

    console.log(`[Pathway] 📤 REQUEST:`, {
      approach: currentApproach,
      historyItems: sessionHistory.length,
      issues: presentingIssues
    });

    try {
      const response = await axios.post(`${ANALYSIS_API}/therapy_analysis`, {
        action: 'pathway_guidance',
        current_approach: currentApproach,
        session_history: sessionHistory,
        presenting_issues: presentingIssues,
      }, {
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const responseTime = performance.now() - startTime;
      console.log(`[Pathway] 📥 RESPONSE (${responseTime.toFixed(0)}ms):`, {
        hasGuidance: !!response.data,
        keys: response.data ? Object.keys(response.data) : []
      });

      if (onPathwayGuidance && response.data) {
        onPathwayGuidance(response.data);
      }

      return response.data;
    } catch (error: any) {
      console.error('[Pathway] ❌ Request failed:', {
        message: error.message,
        status: error.response?.status,
        responseTime: `${(performance.now() - startTime).toFixed(0)}ms`
      });
      return null;
    }
  }, [ANALYSIS_API, onPathwayGuidance, authToken]);

  const generateSessionSummary = useCallback(async (
    fullTranscript: Array<{ speaker: string; text: string; timestamp: string }>,
    sessionMetrics: any
  ) => {
    // In mock mode, return mock summary
    if (USE_MOCK_MODE) {
      console.log('[Summary] 🎭 MOCK - returning mock session summary');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
      const mockData = generateMockSessionSummary();
      if (onSessionSummary) onSessionSummary(mockData);
      return mockData;
    }

    if (!ANALYSIS_API) {
      console.warn('[Summary] ⚠️ VITE_ANALYSIS_API not configured - skipping');
      return null;
    }

    const startTime = performance.now();

    try {
      const summaryReqBody = {
        action: 'session_summary',
        full_transcript: fullTranscript,
        session_metrics: sessionMetrics,
      };
      console.log(`[Summary] 📤 REQUEST:`, summaryReqBody);
      const response = await axios.post(`${ANALYSIS_API}/therapy_analysis`, summaryReqBody, {
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        timeout: 300000, // 5 min — Gemini Pro with thinking + RAG grounding can take time
      });

      const responseTime = performance.now() - startTime;
      console.log(`[Summary] 📥 RESPONSE (${responseTime.toFixed(0)}ms):`, response.data);

      if (onSessionSummary && response.data) {
        onSessionSummary(response.data);
      }

      return response.data;
    } catch (error: any) {
      const backendError = error.response?.data?.error;
      const statusCode = error.response?.status;
      const responseTime = `${(performance.now() - startTime).toFixed(0)}ms`;

      console.error('[Summary] ❌ Request failed:', {
        message: error.message,
        status: statusCode,
        backendError,
        responseTime,
      });

      // Build a descriptive error message that includes backend details
      let errorMessage = 'Session summary request failed.';
      if (statusCode === 500 && backendError) {
        if (backendError.includes('credentials') || backendError.includes('default credentials were not found')) {
          errorMessage = 'GCP authentication error — credentials not configured or expired. Check backend .env or run "gcloud auth application-default login".';
        } else if (backendError.includes('PERMISSION_DENIED')) {
          errorMessage = 'GCP permission denied. Check IAM roles for the service account.';
        } else {
          errorMessage = `Backend error: ${backendError}`;
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to analysis backend. Is the server running?';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out — backend may be overloaded.';
      }

      // Throw so the caller gets the classified error message
      throw new Error(errorMessage);
    }
  }, [ANALYSIS_API, onSessionSummary, authToken]);

  const fetchPatientSessions = useCallback(async (patientId: string) => {
    // In mock mode, return empty array (sessions come from mockPatients)
    if (USE_MOCK_MODE) {
      console.log('[Sessions] 🎭 MOCK - returning empty sessions (use mockPatients data)');
      return [];
    }

    if (!ANALYSIS_API) {
      console.warn('[Sessions] ⚠️ VITE_ANALYSIS_API not configured - skipping');
      return [];
    }

    const startTime = performance.now();

    try {
      console.log(`[Sessions] 📤 Fetching sessions for patient: ${patientId}`);
      const response = await axios.post(`${ANALYSIS_API}/therapy_analysis`, {
        action: 'get_sessions',
        patient_id: patientId,
      }, {
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const responseTime = performance.now() - startTime;
      const sessions = response.data?.sessions || [];
      console.log(`[Sessions] 📥 Retrieved ${sessions.length} sessions (${responseTime.toFixed(0)}ms)`);

      // Transform Firestore sessions to match SessionHistory interface
      return sessions.map((s: any) => ({
        id: s.id,
        date: s.date,
        duration: s.duration_minutes || 0,
        summary: s.summary_text || 'Session completed',
      }));
    } catch (error: any) {
      console.error('[Sessions] ❌ Failed to fetch sessions:', error?.message || error);
      return [];
    }
  }, [ANALYSIS_API, authToken]);

  return {
    analyzeSegment,
    getPathwayGuidance,
    generateSessionSummary,
    fetchPatientSessions,
  };
};
