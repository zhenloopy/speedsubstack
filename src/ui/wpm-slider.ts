export interface WpmSliderCallbacks {
  onChange: (wpm: number) => void;
}

export class WpmSlider {
  private container: HTMLDivElement | null = null;
  private slider: HTMLInputElement | null = null;
  private label: HTMLSpanElement | null = null;
  private currentWpm: number;
  private maxWpm: number;
  private callbacks: WpmSliderCallbacks;

  constructor(initialWpm: number, callbacks: WpmSliderCallbacks, maxWpm: number = 800) {
    this.currentWpm = initialWpm;
    this.maxWpm = maxWpm;
    this.callbacks = callbacks;
  }

  create(parent: HTMLElement): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'speedsubstack-wpm-container';

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.id = 'speedsubstack-wpm-slider';
    this.slider.min = '100';
    this.slider.max = this.maxWpm.toString();
    this.slider.step = '25';
    this.slider.value = this.currentWpm.toString();
    this.slider.setAttribute('aria-label', 'Words per minute');

    this.label = document.createElement('span');
    this.label.id = 'speedsubstack-wpm-label';
    this.updateLabel();

    this.container.appendChild(this.slider);
    this.container.appendChild(this.label);

    parent.appendChild(this.container);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.slider?.addEventListener('input', () => {
      this.currentWpm = parseInt(this.slider!.value, 10);
      this.updateLabel();
      this.callbacks.onChange(this.currentWpm);
    });
  }

  private updateLabel(): void {
    if (this.label) {
      this.label.textContent = `${this.currentWpm} WPM`;
    }
  }

  setWpm(wpm: number): void {
    this.currentWpm = Math.max(100, Math.min(this.maxWpm, wpm));
    if (this.slider) {
      this.slider.value = this.currentWpm.toString();
    }
    this.updateLabel();
  }

  increaseWpm(amount: number = 25): void {
    this.setWpm(this.currentWpm + amount);
    this.callbacks.onChange(this.currentWpm);
  }

  decreaseWpm(amount: number = 25): void {
    this.setWpm(this.currentWpm - amount);
    this.callbacks.onChange(this.currentWpm);
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.slider = null;
    this.label = null;
  }
}
