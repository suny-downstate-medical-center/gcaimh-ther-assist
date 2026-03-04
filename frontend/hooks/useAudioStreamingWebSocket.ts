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
 * Audio Streaming WebSocket Hook — Gemini Live API
 *
 * Captures audio from the microphone (or an audio file) as raw PCM 16-bit
 * mono at 16 kHz, and streams it over a WebSocket to the backend, which
 * relays it to the Gemini Live API. The backend returns both transcripts
 * and analysis through the same WebSocket connection.
 *
 * Uses an AudioWorklet (pcm-processor.worklet.js) for real-time
 * Float32 → Int16 conversion in the browser's audio thread.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioStreamingProps {
  onTranscript: (transcript: any) => void;
  onAnalysis?: (analysis: any) => void;
  onError?: (error: string) => void;
  authToken?: string | null;
}

interface AudioStreamingResult {
  isRecording: boolean;
  isConnected: boolean;
  isPlayingAudio: boolean;
  audioProgress: number;
  audioLevel: number;
  startMicrophoneRecording: () => Promise<void>;
  startAudioFileStreaming: (audioUrl: string) => Promise<void>;
  pauseAudioStreaming: () => void;
  resumeAudioStreaming: () => Promise<void>;
  stopStreaming: () => void;
  sessionId: string;
}

const TARGET_SAMPLE_RATE = 16000;

export const useAudioStreamingWebSocket = ({
  onTranscript,
  onAnalysis,
  onError,
  authToken,
}: UseAudioStreamingProps): AudioStreamingResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isStreamingFileRef = useRef<boolean>(false);
  const currentAudioUrlRef = useRef<string>('');

  // Store callbacks in refs to avoid stale closures
  const onTranscriptRef = useRef(onTranscript);
  const onAnalysisRef = useRef(onAnalysis);
  const onErrorRef = useRef(onError);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onAnalysisRef.current = onAnalysis; }, [onAnalysis]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Get WebSocket URL from environment
  const getWebSocketUrl = () => {
    const baseUrl = import.meta.env.VITE_STREAMING_API;
    if (!baseUrl) {
      throw new Error('VITE_STREAMING_API is not configured');
    }
    return baseUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://') + '/ws/transcribe';
  };

  // ─── WebSocket connection ──────────────────────────────────────────

  const connectWebSocket = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = getWebSocketUrl();
        console.log('Connecting to WebSocket:', wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);

          // Send session initialization
          sessionIdRef.current = `session-${Date.now()}`;
          ws.send(JSON.stringify({
            session_id: sessionIdRef.current,
            token: authToken,
            config: {
              sample_rate: TARGET_SAMPLE_RATE,
              encoding: 'PCM_16BIT',
            },
          }));

          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'ready') {
              console.log('Session ready:', data.session_id);
            } else if (data.type === 'transcript') {
              onTranscriptRef.current({
                transcript: data.transcript,
                confidence: data.confidence || 1.0,
                is_final: data.is_final !== false,
                is_interim: !data.is_final,
                speaker: data.speaker || 'conversation',
                timestamp: data.timestamp || new Date().toISOString(),
                words: data.words,
                result_end_offset: data.result_end_offset,
              });
            } else if (data.type === 'analysis') {
              // Analysis from Gemini Live (both metrics and alerts)
              onAnalysisRef.current?.(data);
            } else if (data.type === 'speech_event') {
              console.log('Speech event:', data.event);
            } else if (data.type === 'error') {
              console.error('Transcription error:', data.error);
              onErrorRef.current?.(data.error);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          onErrorRef.current?.('WebSocket connection error');
          reject(error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          wsRef.current = null;
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        onErrorRef.current?.('Failed to connect to transcription service');
        reject(error);
      }
    });
  }, [authToken]);

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

  // ─── AudioWorklet setup ────────────────────────────────────────────

  /**
   * Create an AudioContext at 16 kHz and register the PCM worklet.
   * Returns the AudioContext ready for connecting sources.
   */
  const ensureAudioContext = useCallback(async (): Promise<AudioContext> => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      // Resume if suspended (e.g. after pause)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      return audioContextRef.current;
    }

    const ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    audioContextRef.current = ctx;

    // Register the PCM processor worklet
    await ctx.audioWorklet.addModule('/audio/pcm-processor.worklet.js');

    return ctx;
  }, []);

  /**
   * Create an AudioWorkletNode that converts Float32 to Int16 PCM
   * and sends it over the WebSocket.
   */
  const createWorkletNode = useCallback((ctx: AudioContext): AudioWorkletNode => {
    const node = new AudioWorkletNode(ctx, 'pcm-processor', {
      channelCount: 1,
      channelCountMode: 'explicit',
    });

    node.port.onmessage = (event) => {
      // event.data is { audio: ArrayBuffer, level: number }
      const { audio, level } = event.data;
      if (audio && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(audio);
      }
      if (typeof level === 'number') {
        setAudioLevel(level);
      }
    };

    workletNodeRef.current = node;
    return node;
  }, []);

  // ─── Microphone recording ─────────────────────────────────────────

  const startMicrophoneRecording = useCallback(async () => {
    try {
      // Connect WebSocket if not connected
      if (!isConnected) {
        await connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const ctx = await ensureAudioContext();
      const workletNode = createWorkletNode(ctx);

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: TARGET_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      // Connect: mic → worklet → (PCM bytes posted to main thread → WebSocket)
      const source = ctx.createMediaStreamSource(stream);
      source.connect(workletNode);
      // Do NOT connect workletNode to ctx.destination — we don't want to play mic back

      setIsRecording(true);
      isStreamingFileRef.current = false;
      console.log('Microphone recording started (PCM 16kHz)');
    } catch (error) {
      console.error('Error starting recording:', error);
      onErrorRef.current?.('Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  }, [isConnected, connectWebSocket, ensureAudioContext, createWorkletNode]);

  // ─── Audio file streaming ─────────────────────────────────────────

  const startAudioFileStreaming = useCallback(async (audioUrl: string) => {
    try {
      if (!isConnected) {
        await connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      currentAudioUrlRef.current = audioUrl;

      const ctx = await ensureAudioContext();
      const workletNode = createWorkletNode(ctx);

      // Create audio element for playback
      const audioEl = new Audio(audioUrl);
      audioEl.volume = 1.0;
      audioEl.crossOrigin = 'anonymous';
      audioElementRef.current = audioEl;

      // Track progress
      audioEl.addEventListener('timeupdate', () => {
        if (audioElementRef.current) {
          const progress = (audioElementRef.current.currentTime / audioElementRef.current.duration) * 100;
          setAudioProgress(isNaN(progress) ? 0 : progress);
        }
      });

      // Create source from audio element
      const source = ctx.createMediaElementSource(audioEl);
      audioSourceNodeRef.current = source;

      // Connect: audio element → worklet (captures PCM) + destination (plays through speakers)
      source.connect(workletNode);
      source.connect(ctx.destination);

      // Handle audio end
      audioEl.addEventListener('ended', () => {
        setIsPlayingAudio(false);
        setAudioProgress(100);
        stopStreaming();
      });

      // Start playback
      await audioEl.play();

      setIsRecording(true);
      setIsPlayingAudio(true);
      isStreamingFileRef.current = true;
      console.log('Audio file streaming started (PCM 16kHz)');
    } catch (error) {
      console.error('Error streaming audio file:', error);
      onErrorRef.current?.('Failed to stream audio file');
      setIsRecording(false);
      setIsPlayingAudio(false);
    }
  }, [isConnected, connectWebSocket, ensureAudioContext, createWorkletNode]);

  // ─── Pause / Resume ───────────────────────────────────────────────

  const pauseAudioStreaming = useCallback(() => {
    try {
      if (audioElementRef.current && isPlayingAudio) {
        audioElementRef.current.pause();
        setIsPlayingAudio(false);

        // Stop the worklet
        if (workletNodeRef.current) {
          workletNodeRef.current.port.postMessage('stop');
          workletNodeRef.current.disconnect();
          workletNodeRef.current = null;
        }

        // Disconnect WebSocket cleanly
        disconnectWebSocket();

        setIsRecording(false);
        console.log('Audio streaming paused — WebSocket disconnected');
      }
    } catch (error) {
      console.error('Error during pause (non-critical):', error);
    }
  }, [isPlayingAudio, disconnectWebSocket]);

  const resumeAudioStreaming = useCallback(async () => {
    try {
      if (audioElementRef.current && !isPlayingAudio && isStreamingFileRef.current) {
        // Reconnect WebSocket
        console.log('Reconnecting WebSocket for resume...');
        await connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 500));

        if (audioContextRef.current && audioSourceNodeRef.current) {
          // Disconnect existing connections
          try { audioSourceNodeRef.current.disconnect(); } catch (e) { /* ignore */ }

          // Create new worklet and reconnect
          const workletNode = createWorkletNode(audioContextRef.current);
          audioSourceNodeRef.current.connect(workletNode);
          audioSourceNodeRef.current.connect(audioContextRef.current.destination);

          setIsRecording(true);
        }

        // Resume playback
        await audioElementRef.current.play();
        setIsPlayingAudio(true);

        console.log('Audio streaming resumed from:', audioElementRef.current.currentTime);
      }
    } catch (error) {
      console.error('Error resuming audio streaming:', error);
      onErrorRef.current?.('Failed to resume audio streaming');
    }
  }, [isPlayingAudio, connectWebSocket, createWorkletNode]);

  // ─── Stop ─────────────────────────────────────────────────────────

  const stopStreaming = useCallback(() => {
    // Stop the worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage('stop');
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Stop microphone stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    // Stop audio playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioSourceNodeRef.current = null;

    setIsRecording(false);
    setIsPlayingAudio(false);
    setAudioProgress(0);
    isStreamingFileRef.current = false;

    // Disconnect WebSocket after a short delay to receive final outputs
    setTimeout(() => {
      disconnectWebSocket();
    }, 1000);
  }, [disconnectWebSocket]);

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
    audioLevel,
    startMicrophoneRecording,
    startAudioFileStreaming,
    pauseAudioStreaming,
    resumeAudioStreaming,
    stopStreaming,
    sessionId: sessionIdRef.current,
  };
};
