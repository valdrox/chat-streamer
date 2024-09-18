export type Alignment = {
  chars: string[]; // Array of characters in the audio chunk
  charStartTimesMs: number[]; // Start times of each character in the audio chunk
  charDurationsMs: number[]; // Durations of each character in the audio chunk
};

export class ReadingIndex {
  private runAlignment: Alignment | null = null;
  private startTime: number | null = null;
  private checkWordingInterval: NodeJS.Timeout | null = null;
  private callback: (startIndex: number, endIndex: number) => void;

  constructor(callback: (startIndex: number, endIndex: number) => void) {
    this.callback = callback;
  }

  public startChecking(): void {
    if (this.startTime === null) {
      this.startTime = Date.now();
      this.checkWordingInterval = setInterval(() => {
        this.checkAlignment();
      }, 100);
    }
  }

  public stopChecking(): void {
    if (this.checkWordingInterval) {
      clearInterval(this.checkWordingInterval);
      this.checkWordingInterval = null;
    }
    this.runAlignment = null;
    this.startTime = null;
    this.callback(-1, -1);
  }

  public addAlignment(chunkAlignment: Alignment): void {
    if (!this.runAlignment) {
      this.runAlignment = chunkAlignment;
    } else {
      // Calculate the offset: last start time + last duration
      const lastStartTime =
        this.runAlignment.charStartTimesMs.length > 0
          ? this.runAlignment.charStartTimesMs[this.runAlignment.charStartTimesMs.length - 1]
          : 0;
      const lastDuration =
        this.runAlignment.charDurationsMs.length > 0
          ? this.runAlignment.charDurationsMs[this.runAlignment.charDurationsMs.length - 1]
          : 0;
      const offset = lastStartTime + lastDuration;

      // Adjust the new chunk's start times by adding the offset
      const adjustedStartTimes = chunkAlignment.charStartTimesMs.map(
        (startTime) => startTime + offset
      );

      // Concatenate the adjusted values, ensuring there's space where needed
      const atLeastOneSpaceOrNewLine =
        ['\n', ' '].includes(this.runAlignment.chars[this.runAlignment.chars.length - 1]) ||
        ['\n', ' '].includes(chunkAlignment.chars[0]);

      if (!atLeastOneSpaceOrNewLine) {
        this.runAlignment.chars.push(' ', ...chunkAlignment.chars);
        this.runAlignment.charStartTimesMs.push(adjustedStartTimes[0] - 1, ...adjustedStartTimes);
        this.runAlignment.charDurationsMs.push(1, ...chunkAlignment.charDurationsMs);
      } else {
        this.runAlignment.chars.push(...chunkAlignment.chars);
        this.runAlignment.charStartTimesMs.push(...adjustedStartTimes);
        this.runAlignment.charDurationsMs.push(...chunkAlignment.charDurationsMs);
      }
    }
  }

  private checkAlignment(): void {
    if (!this.runAlignment || !this.startTime) return;

    const currentTime = Date.now() - this.startTime;
    let charIndex = this.runAlignment.charStartTimesMs.findIndex(
      (startTime, idx) =>
        currentTime >= startTime && currentTime < startTime + this.runAlignment.charDurationsMs[idx]
    );

    // if it's a space, we want to go back to the last word
    if (charIndex > 0 && this.runAlignment.chars[charIndex] === ' ') {
      charIndex--;
    }

    if (charIndex === -1) {
      // If we overshot and no character matches, ensure we don't go out of bounds.
      charIndex = this.runAlignment.charStartTimesMs.length - 1;
    }

    if (charIndex > 0) {
      // Get the first space or period before and after the current character
      let startIndex = charIndex - 1;
      let endIndex = charIndex - 1;
      while (startIndex >= 0 && this.runAlignment.chars[startIndex] !== ' ') {
        startIndex--;
      }
      while (
        endIndex < this.runAlignment.chars.length &&
        this.runAlignment.chars[endIndex] !== ' '
      ) {
        endIndex++;
      }

      this.callback(Math.max(0, startIndex), endIndex);
    }
  }
}
