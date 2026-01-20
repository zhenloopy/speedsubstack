export interface KeyboardCallbacks {
  onPlayPause: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onIncreaseWpm: () => void;
  onDecreaseWpm: () => void;
  onClose: () => void;
}

export class KeyboardHandler {
  private callbacks: KeyboardCallbacks;
  private isEnabled = false;
  private boundHandler: (e: KeyboardEvent) => void;

  constructor(callbacks: KeyboardCallbacks) {
    this.callbacks = callbacks;
    this.boundHandler = this.handleKeydown.bind(this);
  }

  enable(): void {
    if (this.isEnabled) return;
    this.isEnabled = true;
    document.addEventListener('keydown', this.boundHandler);
  }

  disable(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    document.removeEventListener('keydown', this.boundHandler);
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (this.isInputFocused()) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.callbacks.onPlayPause();
        break;

      case 'ArrowRight':
        e.preventDefault();
        this.callbacks.onSkipForward();
        break;

      case 'ArrowLeft':
        e.preventDefault();
        this.callbacks.onSkipBackward();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.callbacks.onIncreaseWpm();
        break;

      case 'ArrowDown':
        e.preventDefault();
        this.callbacks.onDecreaseWpm();
        break;

      case 'Escape':
        e.preventDefault();
        this.callbacks.onClose();
        break;
    }
  }

  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      (activeElement as HTMLElement).isContentEditable
    );
  }

  destroy(): void {
    this.disable();
  }
}
