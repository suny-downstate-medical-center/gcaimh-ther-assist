/**
 * PCM Audio Processor Worklet
 *
 * Runs in the browser's real-time audio thread. Receives Float32 samples
 * from the AudioContext (already at 16kHz when AudioContext is created
 * with sampleRate: 16000), converts them to Int16 PCM, and posts the
 * raw bytes to the main thread for WebSocket transmission.
 *
 * Buffers audio to send ~100ms chunks (1600 samples = 3200 bytes at 16kHz)
 * instead of the raw 128-sample frames to avoid overwhelming the WebSocket.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._active = true;
    this._buffer = new Float32Array(1600); // 100ms at 16kHz
    this._bufferOffset = 0;

    // Listen for stop signal from main thread
    this.port.onmessage = (event) => {
      if (event.data === 'stop') {
        this._active = false;
      }
    };
  }

  /**
   * Called by the audio system with 128 frames of Float32 audio data.
   * We accumulate into a buffer, then convert and send when full.
   */
  process(inputs) {
    if (!this._active) {
      return false;
    }

    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    const channelData = input[0];
    if (!channelData || channelData.length === 0) {
      return true;
    }

    // Copy samples into our buffer
    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._bufferOffset++] = channelData[i];

      // When buffer is full, convert and send
      if (this._bufferOffset >= this._buffer.length) {
        this._sendBuffer();
      }
    }

    return true;
  }

  _sendBuffer() {
    // Calculate RMS audio level for visualization
    let sumSquares = 0;
    for (let i = 0; i < this._bufferOffset; i++) {
      sumSquares += this._buffer[i] * this._buffer[i];
    }
    const rms = Math.sqrt(sumSquares / this._bufferOffset);
    // Normalize to 0-1 range (typical speech RMS is 0.01-0.3)
    const level = Math.min(1, rms * 5);

    // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
    const pcm16 = new Int16Array(this._bufferOffset);
    for (let i = 0; i < this._bufferOffset; i++) {
      const s = Math.max(-1, Math.min(1, this._buffer[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Post both PCM data and audio level to the main thread
    this.port.postMessage({ audio: pcm16.buffer, level: level }, [pcm16.buffer]);

    // Reset buffer
    this._bufferOffset = 0;
    this._buffer = new Float32Array(1600);
  }
}

registerProcessor('pcm-processor', PCMProcessor);
