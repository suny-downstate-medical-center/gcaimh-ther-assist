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
  isReconnecting: boolean;
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
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const useWorkletRef = useRef<boolean>(true); // false = Safari fallback mode
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isStreamingFileRef = useRef<boolean>(false);
  const currentAudioUrlRef = useRef<string>('');
  const isRecordingRef = useRef<boolean>(false);          // stable ref for reconnect logic
  const intentionalDisconnectRef = useRef<boolean>(false); // true when user deliberately stops/pauses
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const HEARTBEAT_INTERVAL_MS = 25000; // 25s — under Cloud Run's typical idle timeout

  // Store callbacks in refs to avoid stale closures
  const onTranscriptRef = useRef(onTranscript);
  const onAnalysisRef = useRef(onAnalysis);
  const onErrorRef = useRef(onError);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onAnalysisRef.current = onAnalysis; }, [onAnalysis]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Keep isRecordingRef in sync with state (needed for reconnect logic in onclose)
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // Get WebSocket URL from environment
  const getWebSocketUrl = () => {
    const baseUrl = import.meta.env.VITE_STREAMING_API;
    if (!baseUrl) {
      throw new Error('VITE_STREAMING_API is not configured');
    }
    // Sidecar mode: derive WSS URL from current page host (nginx proxies /ws/)
    if (baseUrl === '__USE_CURRENT_HOST__') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws/transcribe`;
    }
    return baseUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://') + '/ws/transcribe';
  };

  // ─── Heartbeat helpers ────────────────────────────────────────────

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

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
          setIsReconnecting(false);
          reconnectAttemptsRef.current = 0;

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

          // Start heartbeat to keep Cloud Run alive
          startHeartbeat();

          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'ready') {
              console.log('Session ready:', data.session_id);
            } else if (data.type === 'pong') {
              // Heartbeat response — connection alive
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
            } else if (data.type === 'auth_error') {
              // Auth/credential error — stop everything, show clear message
              console.error('[WS] AUTH ERROR from backend:', data.error);
              intentionalDisconnectRef.current = true; // prevent auto-reconnect
              onErrorRef.current?.(`CONNECTION ERROR: ${data.error}`);
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
          // Don't call onError for reconnectable situations
          if (!isRecordingRef.current) {
            onErrorRef.current?.('WebSocket connection error');
          }
          reject(error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          wsRef.current = null;
          stopHeartbeat();

          // Auto-reconnect if recording is active and this wasn't an intentional disconnect
          if (isRecordingRef.current && !intentionalDisconnectRef.current) {
            if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttemptsRef.current += 1;
              const delay = Math.min(1000 * reconnectAttemptsRef.current, 5000);
              console.log(`[WS] Auto-reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
              setIsReconnecting(true);
              reconnectTimeoutRef.current = setTimeout(() => {
                if (isRecordingRef.current && !intentionalDisconnectRef.current) {
                  connectWebSocket().catch(err => {
                    console.error('[WS] Reconnect failed:', err);
                    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                      setIsReconnecting(false);
                      onErrorRef.current?.('Lost connection to transcription service. Please restart the session.');
                    }
                  });
                }
              }, delay);
            } else {
              console.error('[WS] Max reconnect attempts reached');
              setIsReconnecting(false);
              onErrorRef.current?.('Lost connection to transcription service. Please restart the session.');
            }
          }
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        onErrorRef.current?.('Failed to connect to transcription service');
        reject(error);
      }
    });
  }, [authToken, startHeartbeat, stopHeartbeat]);

  const disconnectWebSocket = useCallback(() => {
    intentionalDisconnectRef.current = true;
    stopHeartbeat();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'stop' }));
      }
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      setIsReconnecting(false);
    }
  }, [stopHeartbeat]);

  // ─── AudioWorklet setup ────────────────────────────────────────────

  /**
   * Create an AudioContext and register the PCM worklet.
   * Falls back to ScriptProcessorNode on Safari or when AudioWorklet fails.
   */
  const ensureAudioContext = useCallback(async (): Promise<AudioContext> => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      return audioContextRef.current;
    }

    // Safari may not support non-standard sample rates well — use default and resample
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const ctx = new AudioContext(isSafari ? undefined : { sampleRate: TARGET_SAMPLE_RATE });
    audioContextRef.current = ctx;

    // Try AudioWorklet first, fall back to ScriptProcessorNode
    try {
      if (ctx.audioWorklet) {
        await ctx.audioWorklet.addModule('/audio/pcm-processor.worklet.js');
        useWorkletRef.current = true;
        console.log('Using AudioWorklet for PCM capture');
      } else {
        throw new Error('AudioWorklet not available');
      }
    } catch (e) {
      console.warn('AudioWorklet unavailable, falling back to ScriptProcessorNode:', e);
      useWorkletRef.current = false;
    }

    return ctx;
  }, []);

  /**
   * Create a processing node (AudioWorklet or ScriptProcessor fallback)
   * that converts Float32 to Int16 PCM and sends it over the WebSocket.
   * Returns the node to connect to — either AudioWorkletNode or ScriptProcessorNode.
   */
  const createProcessingNode = useCallback((ctx: AudioContext): AudioNode => {
    if (useWorkletRef.current) {
      // AudioWorklet path (Chrome, Firefox, newer Safari)
      const node = new AudioWorkletNode(ctx, 'pcm-processor', {
        channelCount: 1,
        channelCountMode: 'explicit',
      });

      node.port.onmessage = (event) => {
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
    }

    // ScriptProcessorNode fallback (Safari, older browsers)
    const bufferSize = 4096;
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    const nativeSampleRate = ctx.sampleRate;
    const ratio = nativeSampleRate / TARGET_SAMPLE_RATE;

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);

      // Downsample if native rate differs from target
      const outputLength = Math.floor(input.length / ratio);
      const pcm16 = new Int16Array(outputLength);
      let sumSquares = 0;

      for (let i = 0; i < outputLength; i++) {
        const srcIdx = Math.floor(i * ratio);
        const sample = input[srcIdx];
        sumSquares += sample * sample;
        pcm16[i] = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      }

      // Send PCM over WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(pcm16.buffer);
      }

      // Calculate RMS level
      const rms = Math.sqrt(sumSquares / outputLength);
      setAudioLevel(Math.min(1, rms * 5));
    };

    scriptProcessorRef.current = processor;
    return processor;
  }, []);

  // ─── Microphone recording ─────────────────────────────────────────

  const startMicrophoneRecording = useCallback(async () => {
    try {
      // Mark as intentional connection (not a reconnect)
      intentionalDisconnectRef.current = false;
      reconnectAttemptsRef.current = 0;

      // Connect WebSocket if not connected
      if (!isConnected) {
        await connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const ctx = await ensureAudioContext();
      const processingNode = createProcessingNode(ctx);

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

      // Connect: mic → processing node → (PCM bytes sent over WebSocket)
      const source = ctx.createMediaStreamSource(stream);
      source.connect(processingNode);
      // ScriptProcessorNode requires connection to destination to keep processing
      if (!useWorkletRef.current) {
        processingNode.connect(ctx.destination);
      }

      setIsRecording(true);
      isStreamingFileRef.current = false;
      console.log('Microphone recording started (PCM 16kHz)');
    } catch (error) {
      console.error('Error starting recording:', error);
      onErrorRef.current?.('Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  }, [isConnected, connectWebSocket, ensureAudioContext, createProcessingNode]);

  // ─── Audio file streaming ─────────────────────────────────────────

  const startAudioFileStreaming = useCallback(async (audioUrl: string) => {
    try {
      intentionalDisconnectRef.current = false;
      reconnectAttemptsRef.current = 0;

      if (!isConnected) {
        await connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      currentAudioUrlRef.current = audioUrl;

      const ctx = await ensureAudioContext();
      const processingNode = createProcessingNode(ctx);

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

      // Connect: audio element → processing node (captures PCM) + destination (plays through speakers)
      source.connect(processingNode);
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
  }, [isConnected, connectWebSocket, ensureAudioContext, createProcessingNode]);

  // ─── Pause / Resume ───────────────────────────────────────────────

  const pauseAudioStreaming = useCallback(() => {
    try {
      if (audioElementRef.current && isPlayingAudio) {
        // Mark as intentional pause — prevents auto-reconnect
        intentionalDisconnectRef.current = true;

        audioElementRef.current.pause();
        setIsPlayingAudio(false);

        // Stop the processing node
        if (workletNodeRef.current) {
          workletNodeRef.current.port.postMessage('stop');
          workletNodeRef.current.disconnect();
          workletNodeRef.current = null;
        }
        if (scriptProcessorRef.current) {
          scriptProcessorRef.current.disconnect();
          scriptProcessorRef.current = null;
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
        // Mark as intentional resume — allow auto-reconnect again
        intentionalDisconnectRef.current = false;
        reconnectAttemptsRef.current = 0;

        // Reconnect WebSocket
        console.log('Reconnecting WebSocket for resume...');
        await connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 500));

        if (audioContextRef.current && audioSourceNodeRef.current) {
          // Disconnect existing connections
          try { audioSourceNodeRef.current.disconnect(); } catch (e) { /* ignore */ }

          // Create new processing node and reconnect
          const resumeNode = createProcessingNode(audioContextRef.current);
          audioSourceNodeRef.current.connect(resumeNode);
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
  }, [isPlayingAudio, connectWebSocket, createProcessingNode]);

  // ─── Stop ─────────────────────────────────────────────────────────

  const stopStreaming = useCallback(() => {
    // Mark as intentional stop — prevents auto-reconnect
    intentionalDisconnectRef.current = true;
    reconnectAttemptsRef.current = 0;

    // Cancel any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Stop the processing nodes
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage('stop');
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
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
    setIsReconnecting(false);
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
    isReconnecting,
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
