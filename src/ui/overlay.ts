export class Overlay {
  private overlay: HTMLDivElement | null = null;
  private wordContainer: HTMLDivElement | null = null;
  private wordElement: HTMLDivElement | null = null;
  private titleElement: HTMLDivElement | null = null;
  private headingElement: HTMLDivElement | null = null;
  private fontSize: number = 64;
  private titleDisplay: boolean = true;
  private headingDisplay: boolean = false;
  private surroundingWords: number = 0;

  create(): void {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.id = 'speedsubstack-overlay';

    // Title element (shown at top)
    this.titleElement = document.createElement('div');
    this.titleElement.id = 'speedsubstack-title';
    this.titleElement.style.display = this.titleDisplay ? 'block' : 'none';

    // Heading element (shown below title)
    this.headingElement = document.createElement('div');
    this.headingElement.id = 'speedsubstack-heading';
    this.headingElement.style.display = this.headingDisplay ? 'block' : 'none';

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
      <div><kbd>Space</kbd> Play/Pause</div>
      <div><kbd>←</kbd><kbd>→</kbd> Skip</div>
      <div><kbd>↑</kbd><kbd>↓</kbd> WPM</div>
      <div><kbd>Esc</kbd> Close</div>
    `;

    this.overlay.appendChild(closeButton);
    this.overlay.appendChild(this.titleElement);
    this.overlay.appendChild(this.headingElement);
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

  isVisible(): boolean {
    return this.overlay?.classList.contains('visible') ?? false;
  }

  displayWord(word: string, prevWords: string[] = [], nextWords: string[] = []): void {
    if (!this.wordElement || !this.wordContainer) return;
    
    const orpIndex = this.calculateORPIndex(word.length);
    const beforeORP = word.slice(0, orpIndex);
    const orpChar = word[orpIndex] || '';
    const afterORP = word.slice(orpIndex + 1);
    
    // Clear existing content safely
    this.wordElement.textContent = '';
    
    // Build left side
    const leftSpan = document.createElement('span');
    leftSpan.className = 'word-left';
    if (prevWords.length > 0) {
      const dimmed = document.createElement('span');
      dimmed.className = 'dimmed';
      dimmed.textContent = prevWords.join(' ');
      leftSpan.appendChild(dimmed);
      const gap = document.createElement('span');
      gap.className = 'word-gap';
      leftSpan.appendChild(gap);
    }
    leftSpan.appendChild(document.createTextNode(beforeORP));
    
    // ORP character
    const orpSpan = document.createElement('span');
    orpSpan.className = 'orp';
    orpSpan.textContent = orpChar;
    
    // Build right side
    const rightSpan = document.createElement('span');
    rightSpan.className = 'word-right';
    rightSpan.appendChild(document.createTextNode(afterORP));
    if (nextWords.length > 0) {
      const gap = document.createElement('span');
      gap.className = 'word-gap';
      rightSpan.appendChild(gap);
      const dimmed = document.createElement('span');
      dimmed.className = 'dimmed';
      dimmed.textContent = nextWords.join(' ');
      rightSpan.appendChild(dimmed);
    }
    
    this.wordElement.appendChild(leftSpan);
    this.wordElement.appendChild(orpSpan);
    this.wordElement.appendChild(rightSpan);
    
    // Center the ORP character precisely
    this.centerORP();
  }

  private centerORP(): void {
    if (!this.wordElement || !this.wordContainer) return;
    
    const orp = this.wordElement.querySelector('.orp') as HTMLElement;
    if (!orp) return;
    
    // Reset transform first to get accurate measurements
    this.wordElement.style.transform = '';
    
    const orpRect = orp.getBoundingClientRect();
    const containerRect = this.wordContainer.getBoundingClientRect();
    const orpCenter = orpRect.left + orpRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const offset = containerCenter - orpCenter;
    
    this.wordElement.style.transform = `translateX(${offset}px)`;
  }

  private calculateORPIndex(length: number): number {
    // ORP is typically around 1/3 into the word
    if (length <= 1) return 0;
    if (length <= 5) return 1;
    if (length <= 9) return 2;
    if (length <= 13) return 3;
    return 4;
  }

  setFontSize(fontSize: number): void {
    this.fontSize = fontSize;
    if (this.wordElement) {
      this.wordElement.style.fontSize = `${fontSize}px`;
    }
  }

  setTitle(title: string | null): void {
    if (this.titleElement) {
      this.titleElement.textContent = title || '';
    }
  }

  setHeading(heading: string | null): void {
    if (this.headingElement) {
      this.headingElement.textContent = heading || '';
    }
  }

  setTitleDisplay(enabled: boolean): void {
    this.titleDisplay = enabled;
    if (this.titleElement) {
      this.titleElement.style.display = enabled ? 'block' : 'none';
    }
  }

  setHeadingDisplay(enabled: boolean): void {
    this.headingDisplay = enabled;
    if (this.headingElement) {
      this.headingElement.style.display = enabled ? 'block' : 'none';
    }
  }

  setSurroundingWords(count: number): void {
    this.surroundingWords = count;
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
    this.titleElement = null;
    this.headingElement = null;
  }
}
