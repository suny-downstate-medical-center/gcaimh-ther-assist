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

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderProps {
  onTranscript: (transcript: any) => void;
  onError?: (error: string) => void;
  authToken?: string | null;
}

export const useAudioRecorderWebSocket = ({ onTranscript, onError, authToken }: UseAudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionIdRef = useRef<string>('');

  // Get WebSocket URL from environment
  const getWebSocketUrl = () => {
    const baseUrl = import.meta.env.VITE_STREAMING_API;
    // Handle both HTTP (localhost) and HTTPS (production)
    const wsUrl = baseUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://') + '/ws/transcribe';
    return wsUrl;
  };

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Send session initialization with auth token
        sessionIdRef.current = `session-${Date.now()}`;
        ws.send(JSON.stringify({
          session_id: sessionIdRef.current,
          auth_token: authToken,
          config: {
            sample_rate: 48000,
            encoding: 'WEBM_OPUS'
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);
          
          if (data.type === 'ready') {
            console.log('Session ready:', data.session_id);
            console.log('Features:', data.config?.features);
          } else if (data.type === 'transcript') {
            // Pass transcript to parent component
            onTranscript({
              transcript: data.transcript,
              confidence: data.confidence || 1.0,
              is_final: data.is_final !== false,
              is_interim: !data.is_final,  // Mark interim results
              speaker: data.speaker || 'conversation',
              timestamp: data.timestamp || new Date().toISOString(),
              words: data.words,  // Include word-level timing if available
              result_end_offset: data.result_end_offset
            });
          } else if (data.type === 'speech_event') {
            // Handle speech activity events
            console.log('Speech event:', data.event);
            if (data.event === 'speech_start') {
              console.log('User started speaking');
            } else if (data.event === 'speech_end') {
              console.log('User stopped speaking');
            }
          } else if (data.type === 'error') {
            console.error('Transcription error:', data.error);
            onError?.(data.error);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      onError?.('Failed to connect to transcription service');
    }
  }, [onTranscript, onError]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'stop' }));
      }
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // First connect WebSocket if not connected
      if (!isConnected) {
        connectWebSocket();
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Create MediaRecorder with optimal settings for speech
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Send audio chunks to WebSocket as binary frames
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Send audio blob directly as binary WebSocket frame
          // This is the most efficient way for low latency
          wsRef.current.send(event.data);
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        console.log('Recording stopped');
      };

      // Start recording with 100ms chunks for low latency
      mediaRecorder.start(100);
      setIsRecording(true);
      console.log('Recording started');

    } catch (error) {
      console.error('Error starting recording:', error);
      onError?.('Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  }, [isConnected, connectWebSocket, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Disconnect WebSocket after a delay to receive final transcripts
      setTimeout(() => {
        disconnectWebSocket();
      }, 1000);
    }
  }, [isRecording, disconnectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      disconnectWebSocket();
    };
  }, []);

  return {
    isRecording,
    isConnected,
    startRecording,
    stopRecording,
    sessionId: sessionIdRef.current
  };
};
