export interface StartButtonCallbacks {
  onStart: () => void;
}

export class StartButton {
  private button: HTMLButtonElement | null = null;
  private callbacks: StartButtonCallbacks;

  constructor(callbacks: StartButtonCallbacks) {
    this.callbacks = callbacks;
  }

  create(): void {
    if (this.button) return;

    this.button = document.createElement('button');
    this.button.id = 'speedsubstack-start-button';
    this.button.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
      Start Speed Reading
    `;
    this.button.setAttribute('aria-label', 'Start speed reading');

    document.body.appendChild(this.button);

    this.button.addEventListener('click', () => {
      this.callbacks.onStart();
    });
  }

  show(): void {
    if (!this.button) this.create();
    this.button!.classList.remove('hidden');
  }

  hide(): void {
    this.button?.classList.add('hidden');
  }

  destroy(): void {
    this.button?.remove();
    this.button = null;
  }
}
