/**
 * Navigation buttons (rewind/forward) component
 */

export interface NavButtonsCallbacks {
  onRewind: () => void;
  onForward: () => void;
}

export class NavButtons {
  private rewindButton: HTMLButtonElement | null = null;
  private forwardButton: HTMLButtonElement | null = null;
  private callbacks: NavButtonsCallbacks;

  constructor(callbacks: NavButtonsCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Create nav buttons DOM structure
   */
  create(parent: HTMLElement): void {
    // Rewind button (bottom-left)
    this.rewindButton = document.createElement('button');
    this.rewindButton.id = 'speedsubstack-rewind';
    this.rewindButton.className = 'speedsubstack-nav-btn';
    this.rewindButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
      </svg>
      <span>-10s</span>
    `;
    this.rewindButton.setAttribute('aria-label', 'Rewind 10 seconds');
    this.rewindButton.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 40px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 20px;
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s ease;
      z-index: 1000000;
    `;

    // Forward button (bottom-right)
    this.forwardButton = document.createElement('button');
    this.forwardButton.id = 'speedsubstack-forward';
    this.forwardButton.className = 'speedsubstack-nav-btn';
    this.forwardButton.innerHTML = `
      <span>+10s</span>
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
      </svg>
    `;
    this.forwardButton.setAttribute('aria-label', 'Forward 10 seconds');
    this.forwardButton.style.cssText = `
      position: fixed;
      bottom: 40px;
      right: 40px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 20px;
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s ease;
      z-index: 1000000;
    `;

    // Style the SVG icons
    const svgStyle = `
      width: 18px;
      height: 18px;
    `;
    this.rewindButton.querySelector('svg')!.style.cssText = svgStyle;
    this.forwardButton.querySelector('svg')!.style.cssText = svgStyle;

    parent.appendChild(this.rewindButton);
    parent.appendChild(this.forwardButton);

    this.setupEventListeners();
    this.setupHoverStyles();
  }

  private setupEventListeners(): void {
    this.rewindButton?.addEventListener('click', () => {
      this.callbacks.onRewind();
    });

    this.forwardButton?.addEventListener('click', () => {
      this.callbacks.onForward();
    });
  }

  private setupHoverStyles(): void {
    const hoverIn = (btn: HTMLButtonElement) => {
      btn.style.background = 'rgba(255, 255, 255, 0.2)';
    };
    const hoverOut = (btn: HTMLButtonElement) => {
      btn.style.background = 'rgba(255, 255, 255, 0.1)';
    };

    this.rewindButton?.addEventListener('mouseenter', () => hoverIn(this.rewindButton!));
    this.rewindButton?.addEventListener('mouseleave', () => hoverOut(this.rewindButton!));
    this.forwardButton?.addEventListener('mouseenter', () => hoverIn(this.forwardButton!));
    this.forwardButton?.addEventListener('mouseleave', () => hoverOut(this.forwardButton!));
  }

  /**
   * Show buttons
   */
  show(): void {
    if (this.rewindButton) this.rewindButton.style.display = 'flex';
    if (this.forwardButton) this.forwardButton.style.display = 'flex';
  }

  /**
   * Hide buttons
   */
  hide(): void {
    if (this.rewindButton) this.rewindButton.style.display = 'none';
    if (this.forwardButton) this.forwardButton.style.display = 'none';
  }

  /**
   * Destroy buttons
   */
  destroy(): void {
    this.rewindButton?.remove();
    this.forwardButton?.remove();
    this.rewindButton = null;
    this.forwardButton = null;
  }
}
