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

import { useCallback } from 'react';
import axios from 'axios';
import { AnalysisResponse, SessionContext } from '../types/types';

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
  const ANALYSIS_API = import.meta.env.VITE_ANALYSIS_API;

  const analyzeSegment = useCallback(async (
    transcriptSegment: Array<{ speaker: string; text: string; timestamp: string }>,
    sessionContext: SessionContext | { is_realtime?: boolean } & SessionContext,
    sessionDurationMinutes: number,
    previousAlert?: any
  ) => {
    // Extract is_realtime flag if present
    const { is_realtime, ...cleanContext } = sessionContext as any;
    const analysisType = is_realtime ? 'realtime' : 'comprehensive';
    
    const requestPayload = {
      action: 'analyze_segment',
      transcript_segment: transcriptSegment,
      session_context: cleanContext,
      session_duration_minutes: sessionDurationMinutes,
      is_realtime: is_realtime || false,
      previous_alert: previousAlert || null,
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
      console.error('[Analysis] ❌ Request failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }, [onAnalysis, ANALYSIS_API, authToken]);

  const getPathwayGuidance = useCallback(async (
    currentApproach: string,
    sessionHistory: any[],
    presentingIssues: string[]
  ) => {
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
      throw error;
    }
  }, [ANALYSIS_API, onPathwayGuidance, authToken]);

  const generateSessionSummary = useCallback(async (
    fullTranscript: Array<{ speaker: string; text: string; timestamp: string }>,
    sessionMetrics: any
  ) => {
    const startTime = performance.now();
    
    try {
      const summaryReqBody = {
          action: 'session_summary',
          full_transcript: fullTranscript,
          session_metrics: sessionMetrics,
        }
      console.log(`[Summary] 📤 REQUEST:`, summaryReqBody);
      const response = await axios.post(`${ANALYSIS_API}/therapy_analysis`, summaryReqBody, {
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const responseTime = performance.now() - startTime;
      console.log(`[Summary] 📥 RESPONSE (${responseTime.toFixed(0)}ms):`, response.data);
      
      if (onSessionSummary && response.data) {
        onSessionSummary(response.data);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('[Summary] ❌ Request failed:', {
        message: error.message,
        status: error.response?.status,
        responseTime: `${(performance.now() - startTime).toFixed(0)}ms`
      });
      throw error;
    }
  }, [ANALYSIS_API, onSessionSummary, authToken]);

  return {
    analyzeSegment,
    getPathwayGuidance,
    generateSessionSummary,
  };
};
