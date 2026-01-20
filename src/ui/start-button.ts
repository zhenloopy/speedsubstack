export interface StartButtonCallbacks {
  onStart: () => void;
  onGoToCurrentWord: () => void;
}

export class StartButton {
  private container: HTMLDivElement | null = null;
  private button: HTMLButtonElement | null = null;
  private currentWordButton: HTMLButtonElement | null = null;
  private callbacks: StartButtonCallbacks;
  private hasProgress = false;

  constructor(callbacks: StartButtonCallbacks) {
    this.callbacks = callbacks;
  }

  create(): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'speedsubstack-button-container';

    this.button = document.createElement('button');
    this.button.id = 'speedsubstack-start-button';
    this.button.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
      Start Speed Reading
    `;
    this.button.setAttribute('aria-label', 'Start speed reading');
    this.button.addEventListener('click', () => {
      this.callbacks.onStart();
    });

    this.currentWordButton = document.createElement('button');
    this.currentWordButton.id = 'speedsubstack-current-word-button';
    this.currentWordButton.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/>
      </svg>
      Current Word
    `;
    this.currentWordButton.setAttribute('aria-label', 'Go to current word');
    this.currentWordButton.addEventListener('click', () => {
      this.callbacks.onGoToCurrentWord();
    });
    // Hidden by default, shown when there's progress
    this.currentWordButton.classList.add('hidden');

    this.container.appendChild(this.button);
    this.container.appendChild(this.currentWordButton);
    document.body.appendChild(this.container);
  }

  setHasProgress(hasProgress: boolean): void {
    this.hasProgress = hasProgress;
    if (this.currentWordButton) {
      if (hasProgress) {
        this.currentWordButton.classList.remove('hidden');
      } else {
        this.currentWordButton.classList.add('hidden');
      }
    }
  }

  show(): void {
    if (!this.container) this.create();
    this.container!.classList.remove('hidden');
  }

  hide(): void {
    this.container?.classList.add('hidden');
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.button = null;
    this.currentWordButton = null;
  }
}
