export type ReaderState = 'idle' | 'reading' | 'paused' | 'article-view';

export interface StateChangeEvent {
  from: ReaderState;
  to: ReaderState;
}

export type StateChangeCallback = (event: StateChangeEvent) => void;

export class StateMachine {
  private state: ReaderState = 'idle';
  private listeners: StateChangeCallback[] = [];

  getState(): ReaderState {
    return this.state;
  }

  transition(to: ReaderState): void {
    if (to === this.state) return;

    const from = this.state;
    this.state = to;
    this.notifyListeners({ from, to });
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(event: StateChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  startReading(): void {
    if (this.state === 'idle' || this.state === 'paused' || this.state === 'article-view') {
      this.transition('reading');
    }
  }

  pauseReading(): void {
    if (this.state === 'reading') {
      this.transition('paused');
    }
  }

  showArticle(): void {
    if (this.state === 'reading') {
      this.transition('article-view');
    }
  }

  hideArticle(): void {
    if (this.state === 'article-view') {
      this.transition('reading');
    }
  }

  stop(): void {
    this.transition('idle');
  }
}
