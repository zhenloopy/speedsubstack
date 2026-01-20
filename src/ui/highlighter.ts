import type { ExtractedWord } from '../parser/article-extractor';

export class Highlighter {
  private highlightElement: HTMLElement | null = null;
  private currentWord: ExtractedWord | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private scrollContainer: HTMLElement | null = null;
  private boundScrollHandler: (() => void) | null = null;
  private boundResizeHandler: (() => void) | null = null;
  private rafId: number | null = null;
  private resizeRafId: number | null = null;
  
  // Cached nav elements to avoid repeated DOM queries
  private topNav: HTMLElement | null = null;
  private bottomNav: HTMLElement | null = null;
  private navsCached = false;

  constructor() {
    this.injectStyles();
  }

  private injectStyles(): void {
    if (this.styleElement) return;
    
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = `
      .speedsubstack-highlight-marker {
        background-color: rgba(255, 235, 59, 0.4);
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

      this.currentWord = word;
      
      // Create highlight element
      this.highlightElement = document.createElement('div');
      this.highlightElement.className = 'speedsubstack-highlight-marker';
      document.body.appendChild(this.highlightElement);
      
      // Position it
      this.updateHighlightPosition();
      
      // Setup scroll listener to keep highlight in sync
      const parent = word.textNode.parentElement;
      if (parent) {
        this.scrollContainer = this.findScrollableParent(parent);
        this.setupScrollListener();
      }
    } catch (e) {
      // Range operations can fail if DOM changed
      console.warn('[SpeedSubstack] Highlight failed:', e);
    }
  }

  private updateHighlightPosition(): void {
    if (!this.currentWord || !this.highlightElement) return;

    try {
      const range = document.createRange();
      range.setStart(this.currentWord.textNode, this.currentWord.startOffset);
      range.setEnd(this.currentWord.textNode, this.currentWord.endOffset);

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      // Check if highlight is within visible content area (excluding nav bars)
      const visibleBounds = this.getVisibleContentBounds();
      if (visibleBounds) {
        const isVisible = rect.top >= visibleBounds.top && rect.bottom <= visibleBounds.bottom;
        this.highlightElement.style.visibility = isVisible ? 'visible' : 'hidden';
      }

      this.highlightElement.style.left = `${rect.left + window.scrollX}px`;
      this.highlightElement.style.top = `${rect.top + window.scrollY}px`;
      this.highlightElement.style.width = `${rect.width}px`;
      this.highlightElement.style.height = `${rect.height}px`;
    } catch (e) {
      // Ignore positioning errors
    }
  }

  private cacheNavElements(): void {
    if (this.navsCached) return;
    this.topNav = document.querySelector<HTMLElement>('[class*="nav-"][class*="pc-display-flex"][class*="pc-justifyContent-space-between"]');
    this.bottomNav = document.querySelector<HTMLElement>('[class*="bottomNav-"]');
    this.navsCached = true;
  }

  private getVisibleContentBounds(): { top: number; bottom: number } | null {
    this.cacheNavElements();
    
    let top = 0;
    let bottom = window.innerHeight;

    if (this.topNav) {
      const topNavRect = this.topNav.getBoundingClientRect();
      top = topNavRect.bottom;
    }

    if (this.bottomNav) {
      const bottomNavRect = this.bottomNav.getBoundingClientRect();
      bottom = bottomNavRect.top;
    }

    // Also respect scrollable container bounds
    if (this.scrollContainer && this.scrollContainer !== document.documentElement) {
      const containerRect = this.scrollContainer.getBoundingClientRect();
      top = Math.max(top, containerRect.top);
      bottom = Math.min(bottom, containerRect.bottom);
    }

    return { top, bottom };
  }

  private setupScrollListener(): void {
    this.removeScrollListener();
    
    this.boundScrollHandler = () => {
      if (this.rafId !== null) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.updateHighlightPosition();
      });
    };

    this.boundResizeHandler = () => {
      if (this.resizeRafId !== null) return;
      this.resizeRafId = requestAnimationFrame(() => {
        this.resizeRafId = null;
        this.updateHighlightPosition();
      });
    };

    // Listen on both window and scroll container
    window.addEventListener('scroll', this.boundScrollHandler, { passive: true });
    window.addEventListener('resize', this.boundResizeHandler, { passive: true });
    if (this.scrollContainer && this.scrollContainer !== document.documentElement) {
      this.scrollContainer.addEventListener('scroll', this.boundScrollHandler, { passive: true });
    }
  }

  private removeScrollListener(): void {
    if (this.boundScrollHandler) {
      window.removeEventListener('scroll', this.boundScrollHandler);
      if (this.scrollContainer && this.scrollContainer !== document.documentElement) {
        this.scrollContainer.removeEventListener('scroll', this.boundScrollHandler);
      }
      this.boundScrollHandler = null;
    }
    if (this.boundResizeHandler) {
      window.removeEventListener('resize', this.boundResizeHandler);
      this.boundResizeHandler = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }
  }

  private clearHighlight(): void {
    this.removeScrollListener();
    if (this.highlightElement) {
      this.highlightElement.remove();
      this.highlightElement = null;
    }
    this.currentWord = null;
    this.scrollContainer = null;
    // Reset nav cache for next highlight
    this.navsCached = false;
    this.topNav = null;
    this.bottomNav = null;
  }

  scrollToHighlight(): void {
    if (!this.currentWord) return;

    try {
      const parent = this.currentWord.textNode.parentElement;
      if (!parent) return;

      // Find the scrollable container (for Substack reader view modals)
      const scrollContainer = this.findScrollableParent(parent);
      
      const range = document.createRange();
      range.setStart(this.currentWord.textNode, this.currentWord.startOffset);
      range.setEnd(this.currentWord.textNode, this.currentWord.endOffset);
      const rect = range.getBoundingClientRect();

      if (scrollContainer && scrollContainer !== document.documentElement) {
        // Scroll within the container
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetScrollTop = scrollContainer.scrollTop + rect.top - containerRect.top - containerRect.height / 2;
        scrollContainer.scrollTo({
          top: targetScrollTop,
          behavior: 'instant',
        });
      } else {
        // Fallback to window scroll
        const scrollY = window.scrollY + rect.top - window.innerHeight / 2;
        window.scrollTo({
          top: scrollY,
          behavior: 'instant',
        });
      }
    } catch (e) {
      // Fallback: scroll to text node's parent
      const parent = this.currentWord.textNode.parentElement;
      if (parent) {
        parent.scrollIntoView({
          behavior: 'instant',
          block: 'center',
        });
      }
    }
  }

  private findScrollableParent(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element;
    
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      
      // Check if this element is scrollable
      if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
        return current;
      }
      current = current.parentElement;
    }
    
    return document.documentElement;
  }

  destroy(): void {
    this.clearHighlight();
    this.styleElement?.remove();
    this.styleElement = null;
  }

  getCurrentWord(): ExtractedWord | null {
    return this.currentWord;
  }
}
