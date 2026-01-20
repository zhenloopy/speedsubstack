import { getWordDurationModifier } from '../ui/word-display';
import type { ExtractedWord } from '../parser/article-extractor';

export interface TimingCallbacks {
  onWordChange: (word: ExtractedWord, index: number) => void;
  onComplete: () => void;
  onProgress: (current: number, total: number) => void;
}

const RAMP_START_WPM = 100;

export class TimingController {
  private words: ExtractedWord[] = [];
  private currentIndex = 0;
  private targetWpm: number;
  private isPlaying = false;
  private timerId: number | null = null;
  private callbacks: TimingCallbacks;
  private lastTickTime = 0;
  private accumulatedTime = 0;
  private rampTimeMs = 10000; // default 10 seconds
  private playStartTime = 0;
  private paragraphStartIndices: number[] = [];
  private paragraphPauseEnabled = false;
  private paragraphPauseDurationMs = 500;
  private paragraphRampUp = false;

  constructor(wpm: number, callbacks: TimingCallbacks) {
    this.targetWpm = wpm;
    this.callbacks = callbacks;
  }

  setWords(words: ExtractedWord[], paragraphStartIndices: number[] = []): void {
    this.words = words;
    this.paragraphStartIndices = paragraphStartIndices;
    this.currentIndex = 0;
    this.callbacks.onProgress(0, words.length);
    console.log('[SpeedSubstack] setWords: paragraphStartIndices =', paragraphStartIndices);
  }

  private getCurrentWpm(): number {
    if (this.rampTimeMs <= 0) return this.targetWpm;
    
    const elapsed = performance.now() - this.playStartTime;
    if (elapsed >= this.rampTimeMs) return this.targetWpm;
    
    // Smooth ease-out interpolation
    const progress = elapsed / this.rampTimeMs;
    const eased = 1 - Math.pow(1 - progress, 2);
    return RAMP_START_WPM + (this.targetWpm - RAMP_START_WPM) * eased;
  }

  private getBaseInterval(): number {
    return 60000 / this.getCurrentWpm();
  }

  private getCurrentInterval(): number {
    const word = this.words[this.currentIndex];
    if (!word) return this.getBaseInterval();

    const modifier = getWordDurationModifier(word.word);
    let interval = this.getBaseInterval() * modifier;

    // Add paragraph pause if enabled and this is the last word of a paragraph
    if (this.paragraphPauseEnabled && this.isEndOfParagraph(this.currentIndex)) {
      console.log('[SpeedSubstack] Adding paragraph pause:', this.paragraphPauseDurationMs, 'ms to interval at word', this.currentIndex);
      interval += this.paragraphPauseDurationMs;
    }

    return interval;
  }

  private isEndOfParagraph(index: number): boolean {
    // Check if the next word is a paragraph start
    const nextIndex = index + 1;
    if (nextIndex >= this.words.length) return true; // End of article
    const isEnd = this.paragraphStartIndices.includes(nextIndex);
    if (isEnd) {
      console.log('[SpeedSubstack] End of paragraph at index', index, 'next starts at', nextIndex, 'pauseEnabled:', this.paragraphPauseEnabled, 'duration:', this.paragraphPauseDurationMs);
    }
    return isEnd;
  }

  play(): void {
    if (this.isPlaying || this.words.length === 0) return;

    this.isPlaying = true;
    this.lastTickTime = performance.now();
    this.accumulatedTime = 0;
    this.playStartTime = performance.now();

    this.showCurrentWord();
    this.tick();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private tick = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = now - this.lastTickTime;
    this.lastTickTime = now;
    this.accumulatedTime += delta;

    const interval = this.getCurrentInterval();

    if (this.accumulatedTime >= interval) {
      this.accumulatedTime -= interval;
      this.advance();
    }

    this.timerId = requestAnimationFrame(this.tick);
  };

  private advance(): void {
    this.currentIndex++;

    if (this.currentIndex >= this.words.length) {
      this.pause();
      this.callbacks.onComplete();
      return;
    }

    // Reset ramp if entering a new paragraph and paragraph ramp up is enabled
    if (this.paragraphRampUp && this.paragraphStartIndices.includes(this.currentIndex)) {
      this.playStartTime = performance.now();
    }

    this.showCurrentWord();
  }

  private showCurrentWord(): void {
    const word = this.words[this.currentIndex];
    if (word) {
      this.callbacks.onWordChange(word, this.currentIndex);
      this.callbacks.onProgress(this.currentIndex + 1, this.words.length);
    }
  }

  setIndex(index: number): void {
    this.currentIndex = Math.max(0, Math.min(index, this.words.length - 1));
    this.accumulatedTime = 0;
    this.showCurrentWord();
  }

  getIndex(): number {
    return this.currentIndex;
  }

  setWpm(wpm: number): void {
    this.targetWpm = Math.max(100, Math.min(800, wpm));
  }

  getWpm(): number {
    return this.targetWpm;
  }

  setRampTime(seconds: number): void {
    this.rampTimeMs = Math.max(0, Math.min(120, seconds)) * 1000;
  }

  getRampTime(): number {
    return this.rampTimeMs / 1000;
  }

  setParagraphPause(enabled: boolean, durationSeconds: number): void {
    this.paragraphPauseEnabled = enabled;
    this.paragraphPauseDurationMs = Math.max(0, Math.min(2, durationSeconds)) * 1000;
    console.log('[SpeedSubstack] setParagraphPause:', enabled, durationSeconds, '-> ms:', this.paragraphPauseDurationMs);
  }

  setParagraphRampUp(enabled: boolean): void {
    this.paragraphRampUp = enabled;
  }

  skipForward(words: number): void {
    this.setIndex(this.currentIndex + words);
  }

  skipBackward(words: number): void {
    this.setIndex(this.currentIndex - words);
  }

  seekToProgress(progress: number): void {
    const index = Math.floor(progress * this.words.length);
    this.setIndex(index);
  }

  destroy(): void {
    this.pause();
    this.words = [];
    this.currentIndex = 0;
  }
}
