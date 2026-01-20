/**
 * Article word highlighter
 */

export class Highlighter {
  private currentWordId: string | null = null;
  private highlightClass = 'speedsubstack-word-current';

  /**
   * Highlight a word by its span ID
   */
  highlight(spanId: string): void {
    // Remove previous highlight
    this.clearHighlight();

    // Add highlight to new word
    const element = document.getElementById(spanId);
    if (element) {
      element.classList.add(this.highlightClass);
      this.currentWordId = spanId;
    }
  }

  /**
   * Clear the current highlight
   */
  clearHighlight(): void {
    if (this.currentWordId) {
      const element = document.getElementById(this.currentWordId);
      if (element) {
        element.classList.remove(this.highlightClass);
      }
      this.currentWordId = null;
    }
  }

  /**
   * Scroll the highlighted word into view
   */
  scrollToHighlight(): void {
    if (!this.currentWordId) return;

    const element = document.getElementById(this.currentWordId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }

  /**
   * Get the currently highlighted word element
   */
  getCurrentElement(): HTMLElement | null {
    if (!this.currentWordId) return null;
    return document.getElementById(this.currentWordId);
  }

  /**
   * Check if a word is currently highlighted
   */
  isHighlighted(spanId: string): boolean {
    return this.currentWordId === spanId;
  }

  /**
   * Destroy highlighter and clean up
   */
  destroy(): void {
    this.clearHighlight();
  }
}
