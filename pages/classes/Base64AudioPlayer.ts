export type AudioChunk = { audio: string; alignment?: object };

export class Base64AudioPlayer {
  private queue: AudioChunk[] = [];
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private onChunkChange?: (chunk: AudioChunk | null) => void;
  private nextBuffer: AudioBuffer | null = null; // Buffer for preloading

  constructor(onChunkChange?: (chunk: AudioChunk | null) => void) {
    this.onChunkChange = onChunkChange;
  }

  // Initialize the AudioContext
  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Decode base64 audio into AudioBuffer
  private async decodeAudio(chunk: AudioChunk): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    const { audio } = chunk;
    const binaryString = atob(audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    try {
      return await this.audioContext.decodeAudioData(bytes.buffer);
    } catch (error) {
      console.error("Error decoding audio data", error);
      return null;
    }
  }

  // Play the current chunk and preload the next one
  private async playChunk(chunk: AudioChunk) {
    if (!this.audioContext) return;

    // Use preloaded buffer if available, otherwise decode
    let audioBuffer: AudioBuffer | null = this.nextBuffer || (await this.decodeAudio(chunk));
    this.nextBuffer = null; // Reset preloaded buffer

    if (!audioBuffer) return;

    // Create a buffer source and connect it to the audio context
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Start playback
    source.start();
    this.currentSource = source;

    // Preload the next chunk in the queue if it exists
    if (this.queue.length > 1) {
      this.preloadNextChunk(this.queue[1]);
    }

    // Handle when the audio ends
    source.onended = () => {
      this.queue.shift(); // Remove the played chunk from the queue
      this.isPlaying = false;
      this.currentSource = null;

      // Trigger the callback that the chunk has finished
      if (this.onChunkChange) {
        this.onChunkChange(null);
      }

      // Play the next chunk if available
      if (this.queue.length > 0) {
        this.isPlaying = true;
        this.playChunk(this.queue[0]);
      }
    };

    // Trigger the callback when the chunk starts playing
    if (this.onChunkChange) {
      this.onChunkChange(chunk);
    }
  }

  // Preload the next chunk
  private async preloadNextChunk(chunk: AudioChunk) {
    if (!this.audioContext) return;

    // Decode the next chunk in the background
    const nextBuffer = await this.decodeAudio(chunk);
    if (nextBuffer) {
      this.nextBuffer = nextBuffer; // Store the preloaded buffer
    }
  }

  // Add a new chunk to the queue
  public addChunk(chunk: AudioChunk) {
    this.initAudioContext();

    if (!chunk.alignment) {
      // Merge the previous chunk if there's no alignment
      if (this.queue.length > 0) {
        const previousChunk = this.queue[this.queue.length - 1];
        const mergedAudio = Buffer.concat([
          Buffer.from(previousChunk.audio, "base64"),
          Buffer.from(chunk.audio, "base64")
        ]).toString("base64");

        // Update the last chunk with merged audio
        this.queue[this.queue.length - 1] = { ...previousChunk, audio: mergedAudio };
      } else {
        this.queue.push(chunk);
      }
    } else {
      this.queue.push(chunk);
    }

    // Start playing if not already playing
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.playChunk(this.queue[0]);
    }
  }

  // Stop and flush the queue
  public stopAndFlush() {
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.queue = [];
    this.isPlaying = false;
    this.nextBuffer = null;

    // Stop any currently playing audio
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }

    // Notify that no chunk is playing
    if (this.onChunkChange) {
      this.onChunkChange(null);
    }
  }
}

