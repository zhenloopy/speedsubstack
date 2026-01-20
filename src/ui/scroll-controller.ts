/**
 * Scroll-based mode switching controller
 */

export interface ScrollCallbacks {
  onScrollToArticle: () => void;
  onScrollToReader: () => void;
}

export class ScrollController {
  private callbacks: ScrollCallbacks;
  private isEnabled = false;
  private articleContainer: HTMLElement | null = null;
  private lastScrollY = 0;
  private threshold = 100; // pixels of scroll to trigger
  private inReaderZone = false;
  private boundHandler: () => void;
  private rafId: number | null = null;

  constructor(callbacks: ScrollCallbacks) {
    this.callbacks = callbacks;
    this.boundHandler = this.handleScroll.bind(this);
  }

  /**
   * Set the article container to monitor
   */
  setArticleContainer(container: HTMLElement): void {
    this.articleContainer = container;
  }

  /**
   * Enable scroll monitoring
   */
  enable(): void {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.lastScrollY = window.scrollY;
    window.addEventListener('scroll', this.boundHandler, { passive: true });
  }

  /**
   * Disable scroll monitoring
   */
  disable(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    window.removeEventListener('scroll', this.boundHandler);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Handle scroll events (debounced with rAF)
   */
  private handleScroll(): void {
    if (this.rafId !== null) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.processScroll();
    });
  }

  /**
   * Process scroll position
   */
  private processScroll(): void {
    if (!this.articleContainer) return;

    const scrollY = window.scrollY;
    const articleRect = this.articleContainer.getBoundingClientRect();
    const articleBottom = articleRect.bottom;

    // Check if we've scrolled past the article
    const isPastArticle = articleBottom < this.threshold;

    if (isPastArticle && !this.inReaderZone) {
      // Scrolled down past article - show reader
      this.inReaderZone = true;
      this.callbacks.onScrollToReader();
    } else if (!isPastArticle && this.inReaderZone) {
      // Scrolled back up into article - show article
      this.inReaderZone = false;
      this.callbacks.onScrollToArticle();
    }

    this.lastScrollY = scrollY;
  }

  /**
   * Force check current scroll position
   */
  checkPosition(): void {
    this.processScroll();
  }

  /**
   * Get whether we're in the reader zone
   */
  isInReaderZone(): boolean {
    return this.inReaderZone;
  }

  /**
   * Scroll to show the reader (past article)
   */
  scrollToReader(): void {
    if (!this.articleContainer) return;

    const articleRect = this.articleContainer.getBoundingClientRect();
    const scrollTarget = window.scrollY + articleRect.bottom + 200;

    window.scrollTo({
      top: scrollTarget,
      behavior: 'smooth',
    });
  }

  /**
   * Scroll to show the article
   */
  scrollToArticle(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  /**
   * Destroy controller
   */
  destroy(): void {
    this.disable();
    this.articleContainer = null;
  }
}
