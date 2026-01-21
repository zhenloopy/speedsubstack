export interface ControlsCallbacks {
  onPlayPause: () => void;
  onSeek: (progress: number) => void;
  onRewind?: () => void;
  onForward?: () => void;
}

export class Controls {
  private container: HTMLDivElement | null = null;
  private playPauseButton: HTMLButtonElement | null = null;
  private rewindButton: HTMLButtonElement | null = null;
  private forwardButton: HTMLButtonElement | null = null;
  private progressContainer: HTMLDivElement | null = null;
  private progressBar: HTMLDivElement | null = null;
  private wordCount: HTMLDivElement | null = null;
  private isPlaying = false;
  private callbacks: ControlsCallbacks;
  private lastProgressPercent = -1;
  private cachedTotalFormatted = '';
  private cachedTotal = -1;

  constructor(callbacks: ControlsCallbacks) {
    this.callbacks = callbacks;
  }

  create(parent: HTMLElement): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'speedsubstack-controls';

    this.progressContainer = document.createElement('div');
    this.progressContainer.id = 'speedsubstack-progress-container';

    this.progressBar = document.createElement('div');
    this.progressBar.id = 'speedsubstack-progress-bar';
    this.progressContainer.appendChild(this.progressBar);

    this.wordCount = document.createElement('div');
    this.wordCount.id = 'speedsubstack-word-count';
    this.wordCount.textContent = '0 / 0';

    this.playPauseButton = document.createElement('button');
    this.playPauseButton.id = 'speedsubstack-play-pause';
    this.playPauseButton.setAttribute('aria-label', 'Play');
    this.updatePlayPauseIcon();

    // Create nav buttons
    this.rewindButton = document.createElement('button');
    this.rewindButton.id = 'speedsubstack-rewind';
    this.rewindButton.className = 'speedsubstack-nav-btn';
    this.rewindButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
      </svg>
    `;
    this.rewindButton.setAttribute('aria-label', 'Previous paragraph');

    this.forwardButton = document.createElement('button');
    this.forwardButton.id = 'speedsubstack-forward';
    this.forwardButton.className = 'speedsubstack-nav-btn';
    this.forwardButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
      </svg>
    `;
    this.forwardButton.setAttribute('aria-label', 'Next paragraph');

    // Create button row container
    const buttonRow = document.createElement('div');
    buttonRow.id = 'speedsubstack-button-row';
    buttonRow.appendChild(this.rewindButton);
    buttonRow.appendChild(this.playPauseButton);
    buttonRow.appendChild(this.forwardButton);

    this.container.appendChild(this.progressContainer);
    this.container.appendChild(this.wordCount);
    this.container.appendChild(buttonRow);

    parent.appendChild(this.container);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.playPauseButton?.addEventListener('click', () => {
      this.callbacks.onPlayPause();
    });

    this.rewindButton?.addEventListener('click', () => {
      this.callbacks.onRewind?.();
    });

    this.forwardButton?.addEventListener('click', () => {
      this.callbacks.onForward?.();
    });

    this.progressContainer?.addEventListener('click', (e) => {
      if (!this.progressContainer) return;
      const rect = this.progressContainer.getBoundingClientRect();
      const progress = (e.clientX - rect.left) / rect.width;
      this.callbacks.onSeek(Math.max(0, Math.min(1, progress)));
    });
  }

  private updatePlayPauseIcon(): void {
    if (!this.playPauseButton) return;

    if (this.isPlaying) {
      this.playPauseButton.innerHTML = `
        <svg viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      `;
      this.playPauseButton.setAttribute('aria-label', 'Pause');
    } else {
      this.playPauseButton.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
      this.playPauseButton.setAttribute('aria-label', 'Play');
    }
  }

  setPlaying(playing: boolean): void {
    this.isPlaying = playing;
    this.updatePlayPauseIcon();
  }

  setProgress(current: number, total: number): void {
    if (this.progressBar) {
      // Only update width if changed by at least 0.1%
      const percent = total > 0 ? (current / total) * 100 : 0;
      if (Math.abs(percent - this.lastProgressPercent) >= 0.1) {
        this.progressBar.style.width = `${percent}%`;
        this.lastProgressPercent = percent;
      }
    }

    if (this.wordCount) {
      // Cache total formatting since it rarely changes
      if (total !== this.cachedTotal) {
        this.cachedTotal = total;
        this.cachedTotalFormatted = total.toLocaleString();
      }
      this.wordCount.textContent = `${current.toLocaleString()} / ${this.cachedTotalFormatted}`;
    }
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.playPauseButton = null;
    this.rewindButton = null;
    this.forwardButton = null;
    this.progressContainer = null;
    this.progressBar = null;
    this.wordCount = null;
  }
}
