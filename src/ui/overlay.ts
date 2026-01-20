/**
 * Speed reader overlay management
 */

export class Overlay {
  private overlay: HTMLDivElement | null = null;
  private wordContainer: HTMLDivElement | null = null;
  private wordElement: HTMLDivElement | null = null;
  private isVisible = false;

  /**
   * Create the overlay DOM structure
   */
  create(): void {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.id = 'speedsubstack-overlay';

    // Word container
    this.wordContainer = document.createElement('div');
    this.wordContainer.id = 'speedsubstack-word-container';

    this.wordElement = document.createElement('div');
    this.wordElement.id = 'speedsubstack-word';
    this.wordContainer.appendChild(this.wordElement);

    // Close button
    const closeButton = document.createElement('button');
    closeButton.id = 'speedsubstack-close';
    closeButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    closeButton.setAttribute('aria-label', 'Close speed reader');

    // Keyboard shortcuts hint
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

  /**
   * Show the overlay
   */
  show(): void {
    if (!this.overlay) this.create();
    this.overlay!.classList.add('visible');
    this.isVisible = true;
  }

  /**
   * Hide the overlay
   */
  hide(): void {
    this.overlay?.classList.remove('visible');
    this.isVisible = false;
  }

  /**
   * Toggle overlay visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if overlay is visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Display a word
   */
  displayWord(word: string): void {
    if (!this.wordElement) return;
    this.wordElement.textContent = word;
  }

  /**
   * Clear the word display
   */
  clearWord(): void {
    if (this.wordElement) {
      this.wordElement.textContent = '';
    }
  }

  /**
   * Get the overlay element
   */
  getElement(): HTMLDivElement | null {
    return this.overlay;
  }

  /**
   * Get the close button element
   */
  getCloseButton(): HTMLButtonElement | null {
    return this.overlay?.querySelector('#speedsubstack-close') ?? null;
  }

  /**
   * Destroy the overlay
   */
  destroy(): void {
    this.overlay?.remove();
    this.overlay = null;
    this.wordContainer = null;
    this.wordElement = null;
    this.isVisible = false;
  }
}
