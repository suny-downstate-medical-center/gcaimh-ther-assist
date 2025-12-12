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

interface UseAudioStreamingProps {
  onTranscript: (transcript: any) => void;
  onError?: (error: string) => void;
  authToken?: string | null;
}

interface AudioStreamingResult {
  isRecording: boolean;
  isConnected: boolean;
  isPlayingAudio: boolean;
  audioProgress: number;
  startMicrophoneRecording: () => Promise<void>;
  startAudioFileStreaming: (audioUrl: string) => Promise<void>;
  pauseAudioStreaming: () => void;
  resumeAudioStreaming: () => Promise<void>;
  stopStreaming: () => void;
  sessionId: string;
}

export const useAudioStreamingWebSocket = ({ 
  onTranscript, 
  onError, 
  authToken 
}: UseAudioStreamingProps): AudioStreamingResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStreamingFileRef = useRef<boolean>(false);
  const currentAudioUrlRef = useRef<string>('');

  // Get WebSocket URL from environment
  const getWebSocketUrl = () => {
    const baseUrl = import.meta.env.VITE_STREAMING_API;
    // Handle both HTTP (localhost) and HTTPS (production)
    return baseUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://') + '/ws/transcribe';
  };

  // Connect to WebSocket
  const connectWebSocket = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = getWebSocketUrl();
        console.log('Connecting to WebSocket:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          
          // Send session initialization
          sessionIdRef.current = `session-${Date.now()}`;
          ws.send(JSON.stringify({
            session_id: sessionIdRef.current,
            token: authToken,
            config: {
              sample_rate: 48000,
              encoding: 'WEBM_OPUS'
            }
          }));
          
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'ready') {
              console.log('Session ready:', data.session_id);
            } else if (data.type === 'transcript') {
              onTranscript({
                transcript: data.transcript,
                confidence: data.confidence || 1.0,
                is_final: data.is_final !== false,
                is_interim: !data.is_final,
                speaker: data.speaker || 'conversation',
                timestamp: data.timestamp || new Date().toISOString(),
                words: data.words,
                result_end_offset: data.result_end_offset
              });
            } else if (data.type === 'speech_event') {
              console.log('Speech event:', data.event);
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
          reject(error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          wsRef.current = null;
        };

      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        onError?.('Failed to connect to transcription service');
        reject(error);
      }
    });
  }, [authToken, onTranscript, onError]);

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

  // Start microphone recording
  const startMicrophoneRecording = useCallback(async () => {
    try {
      // Connect WebSocket if not connected
      if (!isConnected) {
        await connectWebSocket();
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
      
      streamRef.current = stream;

      // Create MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Send audio chunks to WebSocket
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        console.log('Recording stopped');
      };

      // Start recording with 100ms chunks for low latency
      mediaRecorder.start(100);
      setIsRecording(true);
      isStreamingFileRef.current = false;
      console.log('Microphone recording started');

    } catch (error) {
      console.error('Error starting recording:', error);
      onError?.('Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  }, [isConnected, connectWebSocket, onError]);

  // Start audio file streaming
  const startAudioFileStreaming = useCallback(async (audioUrl: string) => {
    try {
      // Connect WebSocket if not connected
      if (!isConnected) {
        await connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Store audio URL for resume functionality
      currentAudioUrlRef.current = audioUrl;

      // Create audio context for processing
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create audio element for playback
      audioElementRef.current = new Audio(audioUrl);
      audioElementRef.current.volume = 1.0;
      audioElementRef.current.crossOrigin = 'anonymous';
      
      // Track progress
      audioElementRef.current.addEventListener('timeupdate', () => {
        if (audioElementRef.current) {
          const progress = (audioElementRef.current.currentTime / audioElementRef.current.duration) * 100;
          setAudioProgress(progress);
        }
      });

      // Create audio source from element for capturing
      audioSourceRef.current = audioContextRef.current.createMediaElementSource(audioElementRef.current);
      
      // Create a destination that captures the audio
      const dest = audioContextRef.current.createMediaStreamDestination();
      audioSourceRef.current.connect(dest);
      audioSourceRef.current.connect(audioContextRef.current.destination); // Also play through speakers

      // Create MediaRecorder from the stream
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      };

      const mediaRecorder = new MediaRecorder(dest.stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Send audio chunks to WebSocket
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Audio file streaming stopped');
      };

      // Handle audio end
      audioElementRef.current.addEventListener('ended', () => {
        setIsPlayingAudio(false);
        setAudioProgress(100);
        stopStreaming();
      });

      // Start recording and playback
      mediaRecorder.start(100); // 100ms chunks
      await audioElementRef.current.play();
      
      setIsRecording(true);
      setIsPlayingAudio(true);
      isStreamingFileRef.current = true;
      console.log('Audio file streaming started');

    } catch (error) {
      console.error('Error streaming audio file:', error);
      onError?.('Failed to stream audio file');
      setIsRecording(false);
      setIsPlayingAudio(false);
    }
  }, [isConnected, connectWebSocket, onError]);

  // Pause audio streaming
  const pauseAudioStreaming = useCallback(() => {
    try {
      if (audioElementRef.current && isPlayingAudio) {
        // Pause audio playback
        audioElementRef.current.pause();
        setIsPlayingAudio(false);
        
        // Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current = null;
        }
        
        // Disconnect WebSocket cleanly
        disconnectWebSocket();
        
        setIsRecording(false);
        console.log('Audio streaming paused successfully - WebSocket disconnected');
      }
    } catch (error) {
      console.error('Error during pause (non-critical):', error);
      // Don't call onError for pause operations as they're not critical failures
    }
  }, [isPlayingAudio, disconnectWebSocket]);

  // Resume audio streaming
  const resumeAudioStreaming = useCallback(async () => {
    try {
      if (audioElementRef.current && !isPlayingAudio && isStreamingFileRef.current) {
        // Reconnect WebSocket first
        console.log('Reconnecting WebSocket for resume...');
        await connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 500));

        // Restart MediaRecorder with fresh connection
        if (audioContextRef.current && audioSourceRef.current) {
          // Disconnect any existing connections to avoid conflicts
          try {
            audioSourceRef.current.disconnect();
          } catch (e) {
            // Ignore disconnect errors
          }

          // Create new destination and reconnect
          const dest = audioContextRef.current.createMediaStreamDestination();
          audioSourceRef.current.connect(dest);
          audioSourceRef.current.connect(audioContextRef.current.destination); // Also play through speakers
          
          const options: MediaRecorderOptions = {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
          };

          const mediaRecorder = new MediaRecorder(dest.stream, options);
          mediaRecorderRef.current = mediaRecorder;

          // Send audio chunks to WebSocket
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            console.log('Audio file streaming stopped');
          };

          mediaRecorder.start(100);
          setIsRecording(true);
        }
        
        // Resume audio playback from current position
        await audioElementRef.current.play();
        setIsPlayingAudio(true);
        
        console.log('Audio streaming resumed successfully from position:', audioElementRef.current.currentTime, '- WebSocket reconnected');
      }
    } catch (error) {
      console.error('Error resuming audio streaming:', error);
      onError?.('Failed to resume audio streaming');
    }
  }, [isPlayingAudio, onError, connectWebSocket]);

  // Stop any streaming
  const stopStreaming = useCallback(() => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop audio playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    // Close audio context - but only if we're truly stopping, not pausing
    if (audioContextRef.current && !isStreamingFileRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setIsPlayingAudio(false);
    setAudioProgress(0);
    isStreamingFileRef.current = false;

    // Disconnect WebSocket after a delay to receive final transcripts
    setTimeout(() => {
      disconnectWebSocket();
    }, 1000);
  }, [isRecording, disconnectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
      disconnectWebSocket();
    };
  }, []);

  return {
    isRecording,
    isConnected,
    isPlayingAudio,
    audioProgress,
    startMicrophoneRecording,
    startAudioFileStreaming,
    pauseAudioStreaming,
    resumeAudioStreaming,
    stopStreaming,
    sessionId: sessionIdRef.current
  };
};
