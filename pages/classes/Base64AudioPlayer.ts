type Alignment = {
  chars: string[]; // Array of characters in the audio chunk
  charStartTimesMs: number[]; // Start times of each character in the audio chunk
  charDurationsMs: number[]; // Durations of each character in the audio chunk
};

export type AudioChunk = {
  audio: string;
  alignment?: Alignment;
};

export class Base64AudioPlayer {
  private audioQueue: AudioChunk[] = [];
  private isPlaying: boolean = false;
  private audioContext: AudioContext;
  private sourceNode: AudioBufferSourceNode | null = null;
  private runAlignement: Alignment | null = null;
  private startTime: number | null = null;
  private checkWordingInterval: NodeJS.Timeout | null = null;

  // Callback to be called when a new audio chunk starts playing, with the index of the first and last character in the chunk
  private callback: (startIndex: number, endIndex: number) => void;

  constructor(callback: (startIndex: number, endIndex: number) => void) {
    this.callback = callback;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  public resumeIfSuspended(): void {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public async addChunk(chunk: AudioChunk): Promise<void> {
    this.audioQueue.push(chunk);

    // now we add to runAlignement if alignment is present
    if (chunk.alignment) {
      if (!this.runAlignement) {
        this.runAlignement = chunk.alignment;
        // set a timeout for each character added
      } else {
        // Calculate the offset: last start time + last duration
        const lastStartTime =
          this.runAlignement.charStartTimesMs.length > 0
            ? this.runAlignement.charStartTimesMs[this.runAlignement.charStartTimesMs.length - 1]
            : 0;
        const lastDuration =
          this.runAlignement.charDurationsMs.length > 0
            ? this.runAlignement.charDurationsMs[this.runAlignement.charDurationsMs.length - 1]
            : 0;
        const offset = lastStartTime + lastDuration;

        // Adjust the new chunk's start times by adding the offset
        const adjustedStartTimes = chunk.alignment.charStartTimesMs.map(
          (startTime) => startTime + offset
        );

        // Now concatenate the adjusted values
        this.runAlignement.chars = this.runAlignement.chars.concat([' ', ...chunk.alignment.chars]);
        this.runAlignement.charStartTimesMs = this.runAlignement.charStartTimesMs.concat([
          adjustedStartTimes[0] - 1,
          ...adjustedStartTimes,
        ]);
        this.runAlignement.charDurationsMs = this.runAlignement.charDurationsMs.concat([
          1,
          ...chunk.alignment.charDurationsMs,
        ]);
      }

    }

    if (!this.isPlaying) {
      this.isPlaying = true;
      if (this.startTime === null) {
        this.startTime = Date.now();
        this.checkWordingInterval = setInterval(() => {
          if (this.runAlignement) {
            const currentTime = Date.now() - this.startTime;
            let charIndex = 0;

            charIndex = this.runAlignement.charStartTimesMs.findIndex(
              (startTime, idx) =>
                currentTime >= startTime &&
                currentTime < startTime + this.runAlignement.charDurationsMs[idx]
            );

            // if it's a space, we want to go back to the last word
            if (charIndex > 0 && this.runAlignement.chars[charIndex] === ' ') {
              charIndex--;
            }

            if (charIndex === -1) {
              // If we overshot and no character matches, ensure we don't go out of bounds.
              charIndex = this.runAlignement.charStartTimesMs.length - 1;
            }

            if (charIndex > 0) {
              // now that we have the char index, get the first space or period before and after
              let startIndex = charIndex - 1;
              let endIndex = charIndex - 1;
              while (startIndex >= 0 && this.runAlignement.chars[startIndex] !== ' ') {
                startIndex--;
              }
              while (
                endIndex < this.runAlignement.chars.length &&
                this.runAlignement.chars[endIndex] !== ' '
              ) {
                endIndex++;
              }

              this.callback(Math.max(0, startIndex), endIndex);
            }
          }
        }, 100);
      }
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
    this.stopAndFlush();
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
    this.runAlignement = null;
    this.startTime = null;
    clearInterval(this.checkWordingInterval);
    this.callback(-1, -1);
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
