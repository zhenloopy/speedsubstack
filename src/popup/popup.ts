import { loadSettings, saveSetting, resetAllSettings, DEFAULT_SETTINGS, type Settings } from '../storage/settings';

class PopupController {
  private powerOnBtn: HTMLButtonElement;
  private powerOffBtn: HTMLButtonElement;
  private wpmSlider: HTMLInputElement;
  private wpmValue: HTMLElement;
  private fontSizeSlider: HTMLInputElement;
  private fontSizeValue: HTMLElement;
  private rampTimeSlider: HTMLInputElement;
  private rampTimeValue: HTMLElement;
  private startingWpmSlider: HTMLInputElement;
  private startingWpmValue: HTMLElement;
  private autostartDelaySlider: HTMLInputElement;
  private autostartDelayValue: HTMLElement;
  private paragraphPauseEnabledCheckbox: HTMLInputElement;
  private paragraphPauseDurationSlider: HTMLInputElement;
  private paragraphPauseDurationValue: HTMLElement;
  private paragraphPauseDurationGroup: HTMLElement;
  private paragraphRampUpCheckbox: HTMLInputElement;
  private paragraphRampUpGroup: HTMLElement;
  private titleDisplayCheckbox: HTMLInputElement;
  private headingDisplayCheckbox: HTMLInputElement;
  private surroundingWordsSlider: HTMLInputElement;
  private surroundingWordsValue: HTMLElement;
  private themeColorInput: HTMLInputElement;
  private colorPreview: HTMLElement;
  private modeManualBtn: HTMLButtonElement;
  private modeAutoBtn: HTMLButtonElement;
  private modeHint: HTMLElement;
  private resetBtn: HTMLButtonElement;

  constructor() {
    this.powerOnBtn = document.getElementById('power-on') as HTMLButtonElement;
    this.powerOffBtn = document.getElementById('power-off') as HTMLButtonElement;
    this.wpmSlider = document.getElementById('default-wpm') as HTMLInputElement;
    this.wpmValue = document.getElementById('wpm-value') as HTMLElement;
    this.fontSizeSlider = document.getElementById('font-size') as HTMLInputElement;
    this.fontSizeValue = document.getElementById('font-size-value') as HTMLElement;
    this.rampTimeSlider = document.getElementById('ramp-time') as HTMLInputElement;
    this.rampTimeValue = document.getElementById('ramp-time-value') as HTMLElement;
    this.startingWpmSlider = document.getElementById('starting-wpm') as HTMLInputElement;
    this.startingWpmValue = document.getElementById('starting-wpm-value') as HTMLElement;
    this.autostartDelaySlider = document.getElementById('autostart-delay') as HTMLInputElement;
    this.autostartDelayValue = document.getElementById('autostart-delay-value') as HTMLElement;
    this.paragraphPauseEnabledCheckbox = document.getElementById('paragraph-pause-enabled') as HTMLInputElement;
    this.paragraphPauseDurationSlider = document.getElementById('paragraph-pause-duration') as HTMLInputElement;
    this.paragraphPauseDurationValue = document.getElementById('paragraph-pause-duration-value') as HTMLElement;
    this.paragraphPauseDurationGroup = document.getElementById('paragraph-pause-duration-group') as HTMLElement;
    this.paragraphRampUpCheckbox = document.getElementById('paragraph-ramp-up') as HTMLInputElement;
    this.paragraphRampUpGroup = document.getElementById('paragraph-ramp-up-group') as HTMLElement;
    this.titleDisplayCheckbox = document.getElementById('title-display') as HTMLInputElement;
    this.headingDisplayCheckbox = document.getElementById('heading-display') as HTMLInputElement;
    this.surroundingWordsSlider = document.getElementById('surrounding-words') as HTMLInputElement;
    this.surroundingWordsValue = document.getElementById('surrounding-words-value') as HTMLElement;
    this.themeColorInput = document.getElementById('theme-color') as HTMLInputElement;
    this.colorPreview = document.getElementById('color-preview') as HTMLElement;
    this.modeManualBtn = document.getElementById('mode-manual') as HTMLButtonElement;
    this.modeAutoBtn = document.getElementById('mode-auto') as HTMLButtonElement;
    this.modeHint = document.getElementById('mode-hint') as HTMLElement;
    this.resetBtn = document.getElementById('reset-defaults') as HTMLButtonElement;

    this.init();
  }

  private async init(): Promise<void> {
    const settings = await loadSettings();
    this.applySettings(settings);
    this.applyThemeColor(settings.themeColor);
    this.setupEventListeners();
  }

  private applySettings(settings: Settings): void {
    this.setEnabled(settings.enabled);
    this.wpmSlider.value = settings.wpm.toString();
    this.wpmValue.textContent = settings.wpm.toString();
    this.fontSizeSlider.value = settings.fontSize.toString();
    this.fontSizeValue.textContent = settings.fontSize.toString();
    this.rampTimeSlider.value = settings.rampTime.toString();
    this.rampTimeValue.textContent = settings.rampTime.toString();
    this.updateStartingWpmMax(settings.wpm);
    this.startingWpmSlider.value = settings.startingWpm.toString();
    this.startingWpmValue.textContent = settings.startingWpm.toString();
    this.autostartDelaySlider.value = settings.autostartDelay.toString();
    this.autostartDelayValue.textContent = settings.autostartDelay.toString();
    this.paragraphPauseEnabledCheckbox.checked = settings.paragraphPauseEnabled;
    this.paragraphPauseDurationSlider.value = settings.paragraphPauseDuration.toString();
    this.paragraphPauseDurationValue.textContent = settings.paragraphPauseDuration.toString();
    this.paragraphRampUpCheckbox.checked = settings.paragraphRampUp;
    this.titleDisplayCheckbox.checked = settings.titleDisplay;
    this.headingDisplayCheckbox.checked = settings.headingDisplay;
    this.surroundingWordsSlider.value = settings.surroundingWords.toString();
    this.surroundingWordsValue.textContent = settings.surroundingWords.toString();
    this.themeColorInput.value = settings.themeColor;
    this.colorPreview.style.background = settings.themeColor;
    this.updateParagraphPauseOptionsVisibility(settings.paragraphPauseEnabled);
    this.setActivationMode(settings.activationMode);
  }

  private updateParagraphPauseOptionsVisibility(enabled: boolean): void {
    this.paragraphPauseDurationGroup.style.display = enabled ? 'block' : 'none';
    this.paragraphRampUpGroup.style.display = enabled ? 'block' : 'none';
  }

  private updateStartingWpmMax(targetWpm: number): void {
    this.startingWpmSlider.max = targetWpm.toString();
    const currentStarting = parseInt(this.startingWpmSlider.value, 10);
    if (currentStarting > targetWpm) {
      this.startingWpmSlider.value = targetWpm.toString();
      this.startingWpmValue.textContent = targetWpm.toString();
    }
  }

  private setEnabled(enabled: boolean): void {
    if (enabled) {
      this.powerOnBtn.classList.add('active');
      this.powerOffBtn.classList.remove('active');
    } else {
      this.powerOffBtn.classList.add('active');
      this.powerOnBtn.classList.remove('active');
    }
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
    this.powerOnBtn.addEventListener('click', async () => {
      this.setEnabled(true);
      await saveSetting('enabled', true);
    });

    this.powerOffBtn.addEventListener('click', async () => {
      this.setEnabled(false);
      await saveSetting('enabled', false);
    });

    this.wpmSlider.addEventListener('input', () => {
      const wpm = parseInt(this.wpmSlider.value, 10);
      this.wpmValue.textContent = wpm.toString();
      this.updateStartingWpmMax(wpm);
    });

    this.wpmSlider.addEventListener('change', async () => {
      const wpm = parseInt(this.wpmSlider.value, 10);
      await saveSetting('wpm', wpm);
      const currentStarting = parseInt(this.startingWpmSlider.value, 10);
      if (currentStarting > wpm) {
        await saveSetting('startingWpm', wpm);
      }
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

    this.startingWpmSlider.addEventListener('input', () => {
      const startingWpm = parseInt(this.startingWpmSlider.value, 10);
      this.startingWpmValue.textContent = startingWpm.toString();
    });

    this.startingWpmSlider.addEventListener('change', async () => {
      const startingWpm = parseInt(this.startingWpmSlider.value, 10);
      await saveSetting('startingWpm', startingWpm);
    });

    this.autostartDelaySlider.addEventListener('input', () => {
      const autostartDelay = parseFloat(this.autostartDelaySlider.value);
      this.autostartDelayValue.textContent = autostartDelay.toString();
    });

    this.autostartDelaySlider.addEventListener('change', async () => {
      const autostartDelay = parseFloat(this.autostartDelaySlider.value);
      await saveSetting('autostartDelay', autostartDelay);
    });

    this.paragraphPauseEnabledCheckbox.addEventListener('change', async () => {
      const enabled = this.paragraphPauseEnabledCheckbox.checked;
      this.updateParagraphPauseOptionsVisibility(enabled);
      await saveSetting('paragraphPauseEnabled', enabled);
    });

    this.paragraphPauseDurationSlider.addEventListener('input', () => {
      const duration = parseFloat(this.paragraphPauseDurationSlider.value);
      this.paragraphPauseDurationValue.textContent = duration.toString();
    });

    this.paragraphPauseDurationSlider.addEventListener('change', async () => {
      const duration = parseFloat(this.paragraphPauseDurationSlider.value);
      await saveSetting('paragraphPauseDuration', duration);
    });

    this.paragraphRampUpCheckbox.addEventListener('change', async () => {
      const enabled = this.paragraphRampUpCheckbox.checked;
      await saveSetting('paragraphRampUp', enabled);
    });

    this.titleDisplayCheckbox.addEventListener('change', async () => {
      const enabled = this.titleDisplayCheckbox.checked;
      await saveSetting('titleDisplay', enabled);
    });

    this.headingDisplayCheckbox.addEventListener('change', async () => {
      const enabled = this.headingDisplayCheckbox.checked;
      await saveSetting('headingDisplay', enabled);
    });

    this.surroundingWordsSlider.addEventListener('input', () => {
      const surroundingWords = parseInt(this.surroundingWordsSlider.value, 10);
      this.surroundingWordsValue.textContent = surroundingWords.toString();
    });

    this.surroundingWordsSlider.addEventListener('change', async () => {
      const surroundingWords = parseInt(this.surroundingWordsSlider.value, 10);
      await saveSetting('surroundingWords', surroundingWords);
    });

    this.themeColorInput.addEventListener('input', () => {
      const color = this.themeColorInput.value.trim();
      if (this.isValidHexColor(color)) {
        this.colorPreview.style.background = color;
      }
    });

    this.themeColorInput.addEventListener('change', async () => {
      const color = this.themeColorInput.value.trim();
      if (this.isValidHexColor(color)) {
        await saveSetting('themeColor', color.toUpperCase());
        this.colorPreview.style.background = color;
        this.applyThemeColor(color);
      } else {
        const settings = await loadSettings();
        this.themeColorInput.value = settings.themeColor;
        this.colorPreview.style.background = settings.themeColor;
      }
    });

    this.modeManualBtn.addEventListener('click', async () => {
      this.setActivationMode('manual');
      await saveSetting('activationMode', 'manual');
    });

    this.modeAutoBtn.addEventListener('click', async () => {
      this.setActivationMode('auto');
      await saveSetting('activationMode', 'auto');
    });

    this.resetBtn.addEventListener('click', async () => {
      await resetAllSettings();
      this.applySettings(DEFAULT_SETTINGS);
    });
  }

  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  private applyThemeColor(color: string): void {
    document.documentElement.style.setProperty('--substack-orange', color);
    const darkerColor = this.adjustColorBrightness(color, -15);
    document.documentElement.style.setProperty('--substack-orange-hover', darkerColor);
  }

  private adjustColorBrightness(hex: string, percent: number): string {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    
    const adjust = (value: number) => {
      const adjusted = value + (value * percent / 100);
      return Math.max(0, Math.min(255, Math.round(adjusted)));
    };
    
    const newR = adjust(r);
    const newG = adjust(g);
    const newB = adjust(b);
    
    const toHex = (value: number) => value.toString(16).padStart(2, '0');
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
