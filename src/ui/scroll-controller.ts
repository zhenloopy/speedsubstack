export interface ScrollCallbacks {
  onScrollToArticle: () => void;
  onScrollToReader: () => void;
}

export class ScrollController {
  private callbacks: ScrollCallbacks;
  private isEnabled = false;
  private articleContainer: HTMLElement | null = null;
  private threshold = 100;
  private inReaderZone = false;
  private boundHandler: () => void;
  private rafId: number | null = null;

  constructor(callbacks: ScrollCallbacks) {
    this.callbacks = callbacks;
    this.boundHandler = this.handleScroll.bind(this);
  }

  setArticleContainer(container: HTMLElement): void {
    this.articleContainer = container;
  }

  enable(): void {
    if (this.isEnabled) return;
    this.isEnabled = true;
    window.addEventListener('scroll', this.boundHandler, { passive: true });
  }

  disable(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    window.removeEventListener('scroll', this.boundHandler);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private handleScroll(): void {
    if (this.rafId !== null) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.processScroll();
    });
  }

  private processScroll(): void {
    if (!this.articleContainer) return;

    const articleRect = this.articleContainer.getBoundingClientRect();
    const isPastArticle = articleRect.bottom < this.threshold;

    if (isPastArticle && !this.inReaderZone) {
      this.inReaderZone = true;
      this.callbacks.onScrollToReader();
    } else if (!isPastArticle && this.inReaderZone) {
      this.inReaderZone = false;
      this.callbacks.onScrollToArticle();
    }
  }

  destroy(): void {
    this.disable();
    this.articleContainer = null;
  }
}
