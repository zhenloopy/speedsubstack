export class Overlay {
  private overlay: HTMLDivElement | null = null;
  private wordContainer: HTMLDivElement | null = null;
  private wordElement: HTMLDivElement | null = null;
  private fontSize: number = 64;

  create(): void {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.id = 'speedsubstack-overlay';

    this.wordContainer = document.createElement('div');
    this.wordContainer.id = 'speedsubstack-word-container';

    this.wordElement = document.createElement('div');
    this.wordElement.id = 'speedsubstack-word';
    this.wordElement.style.fontSize = `${this.fontSize}px`;
    this.wordContainer.appendChild(this.wordElement);

    const closeButton = document.createElement('button');
    closeButton.id = 'speedsubstack-close';
    closeButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    closeButton.setAttribute('aria-label', 'Close speed reader');

    const shortcuts = document.createElement('div');
    shortcuts.id = 'speedsubstack-shortcuts';
    shortcuts.innerHTML = `
      <kbd>Space</kbd> Play/Pause<br>
      <kbd>←</kbd><kbd>→</kbd> Skip<br>
      <kbd>↑</kbd><kbd>↓</kbd> WPM<br>
      <kbd>Esc</kbd> Close
    `;

    this.overlay.appendChild(closeButton);
    this.overlay.appendChild(this.wordContainer);
    this.overlay.appendChild(shortcuts);

    document.body.appendChild(this.overlay);
  }

  show(): void {
    if (!this.overlay) this.create();
    this.overlay!.classList.add('visible');
  }

  hide(): void {
    this.overlay?.classList.remove('visible');
  }

  displayWord(word: string): void {
    if (!this.wordElement) return;
    this.wordElement.textContent = word;
  }

  setFontSize(fontSize: number): void {
    this.fontSize = fontSize;
    if (this.wordElement) {
      this.wordElement.style.fontSize = `${fontSize}px`;
    }
  }

  getElement(): HTMLDivElement | null {
    return this.overlay;
  }

  getCloseButton(): HTMLButtonElement | null {
    return this.overlay?.querySelector('#speedsubstack-close') ?? null;
  }

  destroy(): void {
    this.overlay?.remove();
    this.overlay = null;
    this.wordContainer = null;
    this.wordElement = null;
  }
}
