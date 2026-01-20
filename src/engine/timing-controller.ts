/**
 * Timing controller for word advancement
 */

import { getWordDurationModifier } from '../ui/word-display';
import type { ExtractedWord } from '../parser/article-extractor';

export interface TimingCallbacks {
  onWordChange: (word: ExtractedWord, index: number) => void;
  onComplete: () => void;
  onProgress: (current: number, total: number) => void;
}

export class TimingController {
  private words: ExtractedWord[] = [];
  private currentIndex = 0;
  private wpm: number;
  private isPlaying = false;
  private timerId: number | null = null;
  private callbacks: TimingCallbacks;
  private lastTickTime = 0;
  private accumulatedTime = 0;

  constructor(wpm: number, callbacks: TimingCallbacks) {
    this.wpm = wpm;
    this.callbacks = callbacks;
  }

  /**
   * Set the words to read
   */
  setWords(words: ExtractedWord[]): void {
    this.words = words;
    this.currentIndex = 0;
    this.callbacks.onProgress(0, words.length);
  }

  /**
   * Get base interval in milliseconds for current WPM
   */
  private getBaseInterval(): number {
    return 60000 / this.wpm;
  }

  /**
   * Get interval for current word (adjusted for punctuation, etc.)
   */
  private getCurrentInterval(): number {
    const word = this.words[this.currentIndex];
    if (!word) return this.getBaseInterval();

    const modifier = getWordDurationModifier(word.word);
    return this.getBaseInterval() * modifier;
  }

  /**
   * Start playing
   */
  play(): void {
    if (this.isPlaying || this.words.length === 0) return;

    this.isPlaying = true;
    this.lastTickTime = performance.now();
    this.accumulatedTime = 0;

    // Show current word immediately
    this.showCurrentWord();

    this.tick();
  }

  /**
   * Pause playing
   */
  pause(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Toggle play/pause
   */
  togglePlayPause(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Main animation loop
   */
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

  /**
   * Advance to next word
   */
  private advance(): void {
    this.currentIndex++;

    if (this.currentIndex >= this.words.length) {
      this.pause();
      this.callbacks.onComplete();
      return;
    }

    this.showCurrentWord();
  }

  /**
   * Show the current word
   */
  private showCurrentWord(): void {
    const word = this.words[this.currentIndex];
    if (word) {
      this.callbacks.onWordChange(word, this.currentIndex);
      this.callbacks.onProgress(this.currentIndex + 1, this.words.length);
    }
  }

  /**
   * Set current word index
   */
  setIndex(index: number): void {
    this.currentIndex = Math.max(0, Math.min(index, this.words.length - 1));
    this.accumulatedTime = 0;
    this.showCurrentWord();
  }

  /**
   * Get current index
   */
  getIndex(): number {
    return this.currentIndex;
  }

  /**
   * Set WPM
   */
  setWpm(wpm: number): void {
    this.wpm = Math.max(100, Math.min(800, wpm));
  }

  /**
   * Get WPM
   */
  getWpm(): number {
    return this.wpm;
  }

  /**
   * Skip forward by a number of words
   */
  skipForward(words: number): void {
    this.setIndex(this.currentIndex + words);
  }

  /**
   * Skip backward by a number of words
   */
  skipBackward(words: number): void {
    this.setIndex(this.currentIndex - words);
  }

  /**
   * Seek to a progress percentage (0-1)
   */
  seekToProgress(progress: number): void {
    const index = Math.floor(progress * this.words.length);
    this.setIndex(index);
  }

  /**
   * Get total word count
   */
  getTotalWords(): number {
    return this.words.length;
  }

  /**
   * Reset to beginning
   */
  reset(): void {
    this.pause();
    this.currentIndex = 0;
    this.accumulatedTime = 0;
    if (this.words.length > 0) {
      this.showCurrentWord();
    }
  }

  /**
   * Destroy and clean up
   */
  destroy(): void {
    this.pause();
    this.words = [];
    this.currentIndex = 0;
  }
}
