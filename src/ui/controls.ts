/**
 * Playback controls UI component
 */

export interface ControlsCallbacks {
  onPlayPause: () => void;
  onSeek: (progress: number) => void;
}

export class Controls {
  private container: HTMLDivElement | null = null;
  private playPauseButton: HTMLButtonElement | null = null;
  private progressContainer: HTMLDivElement | null = null;
  private progressBar: HTMLDivElement | null = null;
  private wordCount: HTMLDivElement | null = null;
  private isPlaying = false;
  private callbacks: ControlsCallbacks;

  constructor(callbacks: ControlsCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Create controls DOM structure
   */
  create(parent: HTMLElement): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'speedsubstack-controls';

    // Progress container
    this.progressContainer = document.createElement('div');
    this.progressContainer.id = 'speedsubstack-progress-container';

    this.progressBar = document.createElement('div');
    this.progressBar.id = 'speedsubstack-progress-bar';
    this.progressContainer.appendChild(this.progressBar);

    // Word count
    this.wordCount = document.createElement('div');
    this.wordCount.id = 'speedsubstack-word-count';
    this.wordCount.textContent = '0 / 0';

    // Play/Pause button
    this.playPauseButton = document.createElement('button');
    this.playPauseButton.id = 'speedsubstack-play-pause';
    this.playPauseButton.setAttribute('aria-label', 'Play');
    this.updatePlayPauseIcon();

    this.container.appendChild(this.progressContainer);
    this.container.appendChild(this.wordCount);
    this.container.appendChild(this.playPauseButton);

    parent.appendChild(this.container);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Play/Pause click
    this.playPauseButton?.addEventListener('click', () => {
      this.callbacks.onPlayPause();
    });

    // Progress bar click to seek
    this.progressContainer?.addEventListener('click', (e) => {
      if (!this.progressContainer) return;
      const rect = this.progressContainer.getBoundingClientRect();
      const progress = (e.clientX - rect.left) / rect.width;
      this.callbacks.onSeek(Math.max(0, Math.min(1, progress)));
    });
  }

  /**
   * Update the play/pause button icon
   */
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

  /**
   * Set playing state
   */
  setPlaying(playing: boolean): void {
    this.isPlaying = playing;
    this.updatePlayPauseIcon();
  }

  /**
   * Update progress display
   */
  setProgress(current: number, total: number): void {
    if (this.progressBar) {
      const percent = total > 0 ? (current / total) * 100 : 0;
      this.progressBar.style.width = `${percent}%`;
    }

    if (this.wordCount) {
      const currentFormatted = current.toLocaleString();
      const totalFormatted = total.toLocaleString();
      this.wordCount.textContent = `${currentFormatted} / ${totalFormatted}`;
    }
  }

  /**
   * Get the container element
   */
  getElement(): HTMLDivElement | null {
    return this.container;
  }

  /**
   * Destroy controls
   */
  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.playPauseButton = null;
    this.progressContainer = null;
    this.progressBar = null;
    this.wordCount = null;
  }
}
