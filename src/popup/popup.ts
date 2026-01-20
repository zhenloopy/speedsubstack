/**
 * Popup script for SpeedSubstack settings
 */

import { loadSettings, saveSetting, type Settings } from '../storage/settings';

class PopupController {
  private wpmSlider: HTMLInputElement;
  private wpmValue: HTMLElement;
  private modeManualBtn: HTMLButtonElement;
  private modeAutoBtn: HTMLButtonElement;
  private modeHint: HTMLElement;

  constructor() {
    this.wpmSlider = document.getElementById('default-wpm') as HTMLInputElement;
    this.wpmValue = document.getElementById('wpm-value') as HTMLElement;
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
    // Apply WPM
    this.wpmSlider.value = settings.wpm.toString();
    this.wpmValue.textContent = settings.wpm.toString();

    // Apply activation mode
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
    // WPM slider
    this.wpmSlider.addEventListener('input', () => {
      const wpm = parseInt(this.wpmSlider.value, 10);
      this.wpmValue.textContent = wpm.toString();
    });

    this.wpmSlider.addEventListener('change', async () => {
      const wpm = parseInt(this.wpmSlider.value, 10);
      await saveSetting('wpm', wpm);
    });

    // Manual mode button
    this.modeManualBtn.addEventListener('click', async () => {
      this.setActivationMode('manual');
      await saveSetting('activationMode', 'manual');
    });

    // Auto mode button
    this.modeAutoBtn.addEventListener('click', async () => {
      this.setActivationMode('auto');
      await saveSetting('activationMode', 'auto');
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
