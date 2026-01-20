import type { ExtractedWord } from '../parser/article-extractor';

export class Highlighter {
  private highlightElement: HTMLElement | null = null;
  private currentWord: ExtractedWord | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    this.injectStyles();
  }

  private injectStyles(): void {
    if (this.styleElement) return;
    
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = `
      .speedsubstack-highlight-marker {
        background-color: #ffeb3b;
        border-radius: 2px;
        padding: 0 2px;
        margin: 0 -2px;
        color: #000000 !important;
        position: absolute;
        pointer-events: none;
        z-index: 999997;
      }
    `;
    document.head.appendChild(this.styleElement);
  }

  highlight(word: ExtractedWord): void {
    this.clearHighlight();

    try {
      // Validate text node is still in document
      if (!word.textNode.parentNode || !document.contains(word.textNode)) {
        return;
      }

      // Validate offsets are within bounds
      const textLength = word.textNode.textContent?.length || 0;
      if (word.startOffset >= textLength || word.endOffset > textLength) {
        return;
      }

      const range = document.createRange();
      range.setStart(word.textNode, word.startOffset);
      range.setEnd(word.textNode, word.endOffset);

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return;
      }

      // Create highlight overlay positioned absolutely
      this.highlightElement = document.createElement('div');
      this.highlightElement.className = 'speedsubstack-highlight-marker';
      this.highlightElement.style.left = `${rect.left + window.scrollX}px`;
      this.highlightElement.style.top = `${rect.top + window.scrollY}px`;
      this.highlightElement.style.width = `${rect.width}px`;
      this.highlightElement.style.height = `${rect.height}px`;
      
      document.body.appendChild(this.highlightElement);
      this.currentWord = word;
    } catch (e) {
      // Range operations can fail if DOM changed
      console.warn('[SpeedSubstack] Highlight failed:', e);
    }
  }

  private clearHighlight(): void {
    if (this.highlightElement) {
      this.highlightElement.remove();
      this.highlightElement = null;
    }
    this.currentWord = null;
  }

  scrollToHighlight(): void {
    if (!this.currentWord) return;

    try {
      const range = document.createRange();
      range.setStart(this.currentWord.textNode, this.currentWord.startOffset);
      range.setEnd(this.currentWord.textNode, this.currentWord.endOffset);

      const rect = range.getBoundingClientRect();
      const scrollY = window.scrollY + rect.top - window.innerHeight / 2;
      
      window.scrollTo({
        top: scrollY,
        behavior: 'smooth',
      });
    } catch (e) {
      // Fallback: scroll to text node's parent
      const parent = this.currentWord.textNode.parentElement;
      if (parent) {
        parent.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }

  destroy(): void {
    this.clearHighlight();
    this.styleElement?.remove();
    this.styleElement = null;
  }
}
