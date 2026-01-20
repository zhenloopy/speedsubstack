export interface NavButtonsCallbacks {
  onRewind: () => void;
  onForward: () => void;
}

export class NavButtons {
  private rewindButton: HTMLButtonElement | null = null;
  private forwardButton: HTMLButtonElement | null = null;
  private callbacks: NavButtonsCallbacks;

  constructor(callbacks: NavButtonsCallbacks) {
    this.callbacks = callbacks;
  }

  create(parent: HTMLElement): void {
    this.rewindButton = document.createElement('button');
    this.rewindButton.id = 'speedsubstack-rewind';
    this.rewindButton.className = 'speedsubstack-nav-btn';
    this.rewindButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
      </svg>
      <span>-10s</span>
    `;
    this.rewindButton.setAttribute('aria-label', 'Rewind 10 seconds');

    this.forwardButton = document.createElement('button');
    this.forwardButton.id = 'speedsubstack-forward';
    this.forwardButton.className = 'speedsubstack-nav-btn';
    this.forwardButton.innerHTML = `
      <span>+10s</span>
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
      </svg>
    `;
    this.forwardButton.setAttribute('aria-label', 'Forward 10 seconds');

    parent.appendChild(this.rewindButton);
    parent.appendChild(this.forwardButton);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.rewindButton?.addEventListener('click', () => {
      this.callbacks.onRewind();
    });

    this.forwardButton?.addEventListener('click', () => {
      this.callbacks.onForward();
    });
  }

  destroy(): void {
    this.rewindButton?.remove();
    this.forwardButton?.remove();
    this.rewindButton = null;
    this.forwardButton = null;
  }
}
