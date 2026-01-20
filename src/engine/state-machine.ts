/**
 * State machine for managing reader states
 */

export type ReaderState = 'idle' | 'reading' | 'paused' | 'article-view';

export interface StateChangeEvent {
  from: ReaderState;
  to: ReaderState;
}

export type StateChangeCallback = (event: StateChangeEvent) => void;

export class StateMachine {
  private state: ReaderState = 'idle';
  private listeners: StateChangeCallback[] = [];

  /**
   * Get current state
   */
  getState(): ReaderState {
    return this.state;
  }

  /**
   * Check if in a specific state
   */
  isState(state: ReaderState): boolean {
    return this.state === state;
  }

  /**
   * Transition to a new state
   */
  transition(to: ReaderState): void {
    if (to === this.state) return;

    const from = this.state;
    this.state = to;

    this.notifyListeners({ from, to });
  }

  /**
   * Add state change listener
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(event: StateChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Start reading
   */
  startReading(): void {
    if (this.state === 'idle' || this.state === 'paused' || this.state === 'article-view') {
      this.transition('reading');
    }
  }

  /**
   * Pause reading
   */
  pauseReading(): void {
    if (this.state === 'reading') {
      this.transition('paused');
    }
  }

  /**
   * Toggle between reading and paused
   */
  togglePlayPause(): void {
    if (this.state === 'reading') {
      this.pauseReading();
    } else if (this.state === 'paused' || this.state === 'article-view') {
      this.startReading();
    }
  }

  /**
   * Switch to article view
   */
  showArticle(): void {
    if (this.state === 'reading') {
      this.transition('article-view');
    }
  }

  /**
   * Return from article view
   */
  hideArticle(): void {
    if (this.state === 'article-view') {
      this.transition('reading');
    }
  }

  /**
   * Stop and go idle
   */
  stop(): void {
    this.transition('idle');
  }

  /**
   * Reset to idle
   */
  reset(): void {
    this.state = 'idle';
  }
}
