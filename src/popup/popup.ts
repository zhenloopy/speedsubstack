import { loadSettings, saveSetting, type Settings } from '../storage/settings';

class PopupController {
  private wpmSlider: HTMLInputElement;
  private wpmValue: HTMLElement;
  private fontSizeSlider: HTMLInputElement;
  private fontSizeValue: HTMLElement;
  private rampTimeSlider: HTMLInputElement;
  private rampTimeValue: HTMLElement;
  private modeManualBtn: HTMLButtonElement;
  private modeAutoBtn: HTMLButtonElement;
  private modeHint: HTMLElement;

  constructor() {
    this.wpmSlider = document.getElementById('default-wpm') as HTMLInputElement;
    this.wpmValue = document.getElementById('wpm-value') as HTMLElement;
    this.fontSizeSlider = document.getElementById('font-size') as HTMLInputElement;
    this.fontSizeValue = document.getElementById('font-size-value') as HTMLElement;
    this.rampTimeSlider = document.getElementById('ramp-time') as HTMLInputElement;
    this.rampTimeValue = document.getElementById('ramp-time-value') as HTMLElement;
    this.modeManualBtn = document.getElementById('mode-manual') as HTMLButtonElement;
    this.modeAutoBtn = document.getElementById('mode-auto') as HTMLButtonElement;
    this.modeHint = document.getElementById('mode-hint') as HTMLElement;

    this.init();
  }

  private async init(): Promise<void> {
    const settings = await loadSettings();
    this.applySettings(settings);
    this.setupEventListeners();
  }

  private applySettings(settings: Settings): void {
    this.wpmSlider.value = settings.wpm.toString();
    this.wpmValue.textContent = settings.wpm.toString();
    this.fontSizeSlider.value = settings.fontSize.toString();
    this.fontSizeValue.textContent = settings.fontSize.toString();
    this.rampTimeSlider.value = settings.rampTime.toString();
    this.rampTimeValue.textContent = settings.rampTime.toString();
    this.setActivationMode(settings.activationMode);
  }

  private setActivationMode(mode: 'auto' | 'manual'): void {
    if (mode === 'manual') {
      this.modeManualBtn.classList.add('active');
      this.modeAutoBtn.classList.remove('active');
      this.modeHint.textContent = 'Click the button on article pages to start';
    } else {
      this.modeAutoBtn.classList.add('active');
      this.modeManualBtn.classList.remove('active');
      this.modeHint.textContent = 'Speed reading starts automatically on articles';
    }
  }

  private setupEventListeners(): void {
    this.wpmSlider.addEventListener('input', () => {
      const wpm = parseInt(this.wpmSlider.value, 10);
      this.wpmValue.textContent = wpm.toString();
    });

    this.wpmSlider.addEventListener('change', async () => {
      const wpm = parseInt(this.wpmSlider.value, 10);
      await saveSetting('wpm', wpm);
    });

    this.fontSizeSlider.addEventListener('input', () => {
      const fontSize = parseInt(this.fontSizeSlider.value, 10);
      this.fontSizeValue.textContent = fontSize.toString();
    });

    this.fontSizeSlider.addEventListener('change', async () => {
      const fontSize = parseInt(this.fontSizeSlider.value, 10);
      await saveSetting('fontSize', fontSize);
    });

    this.rampTimeSlider.addEventListener('input', () => {
      const rampTime = parseInt(this.rampTimeSlider.value, 10);
      this.rampTimeValue.textContent = rampTime.toString();
    });

    this.rampTimeSlider.addEventListener('change', async () => {
      const rampTime = parseInt(this.rampTimeSlider.value, 10);
      await saveSetting('rampTime', rampTime);
    });

    this.modeManualBtn.addEventListener('click', async () => {
      this.setActivationMode('manual');
      await saveSetting('activationMode', 'manual');
    });

    this.modeAutoBtn.addEventListener('click', async () => {
      this.setActivationMode('auto');
      await saveSetting('activationMode', 'auto');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
