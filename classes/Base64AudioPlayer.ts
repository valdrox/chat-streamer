import { Alignment, ReadingIndex } from './ReadingIndex';

export type AudioChunk = {
  audio: string;
  alignment?: Alignment;
};

export class Base64AudioPlayer {
  private audioQueue: AudioChunk[] = [];
  private isPlaying: boolean = false;
  private audioContext: AudioContext;
  private sourceNode: AudioBufferSourceNode | null = null;
  private readingIndex: ReadingIndex;

  constructor(callback: (startIndex: number, endIndex: number) => void) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.readingIndex = new ReadingIndex(callback);
  }

  public resumeIfSuspended(): void {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public async addChunk(chunk: AudioChunk): Promise<void> {
    this.audioQueue.push(chunk);

    if (chunk.alignment) {
      this.readingIndex.addAlignment(chunk.alignment);
    }

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.readingIndex.startChecking();
      await this.playQueue();
    }
  }

  private async playQueue(): Promise<void> {
    while (this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift();
      if (chunk) {
        await this.playChunk(chunk);
      }
    }
    this.isPlaying = false;
    this.readingIndex.stopChecking();
  }

  private async playChunk(chunk: AudioChunk): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioData = this.base64ToArrayBuffer(chunk.audio);

      this.audioContext.decodeAudioData(
        audioData,
        (buffer) => {
          this.sourceNode = this.audioContext.createBufferSource();
          this.sourceNode.buffer = buffer;
          this.sourceNode.connect(this.audioContext.destination);
          this.sourceNode.start(0);
          this.sourceNode.onended = () => {
            resolve();
          };
        },
        (error) => {
          console.error('Error decoding audio data', error);
          reject(error);
        }
      );
    });
  }

  public stopAndFlush(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.isPlaying = false;
    this.audioQueue = [];
    this.readingIndex.stopChecking();
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
