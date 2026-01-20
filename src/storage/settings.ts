export interface Settings {
  wpm: number;
  activationMode: 'auto' | 'manual';
  fontSize: number;
  rampTime: number;
  startingWpm: number;
  autostartDelay: number;
  paragraphPauseEnabled: boolean;
  paragraphPauseDuration: number;
  paragraphRampUp: boolean;
  titleDisplay: boolean;
  headingDisplay: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  wpm: 300,
  activationMode: 'manual',
  fontSize: 92,
  rampTime: 20,
  startingWpm: 150,
  autostartDelay: 1,
  paragraphPauseEnabled: false,
  paragraphPauseDuration: 0.5,
  paragraphRampUp: false,
  titleDisplay: true,
  headingDisplay: false,
};

export async function resetAllSettings(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(DEFAULT_SETTINGS, resolve);
  });
}

export async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['wpm', 'activationMode', 'fontSize', 'rampTime', 'startingWpm', 'autostartDelay', 'paragraphPauseEnabled', 'paragraphPauseDuration', 'paragraphRampUp', 'titleDisplay', 'headingDisplay'], (result) => {
      resolve({
        wpm: result.wpm ?? DEFAULT_SETTINGS.wpm,
        activationMode: result.activationMode ?? DEFAULT_SETTINGS.activationMode,
        fontSize: result.fontSize ?? DEFAULT_SETTINGS.fontSize,
        rampTime: result.rampTime ?? DEFAULT_SETTINGS.rampTime,
        startingWpm: result.startingWpm ?? DEFAULT_SETTINGS.startingWpm,
        autostartDelay: result.autostartDelay ?? DEFAULT_SETTINGS.autostartDelay,
        paragraphPauseEnabled: result.paragraphPauseEnabled ?? DEFAULT_SETTINGS.paragraphPauseEnabled,
        paragraphPauseDuration: result.paragraphPauseDuration ?? DEFAULT_SETTINGS.paragraphPauseDuration,
        paragraphRampUp: result.paragraphRampUp ?? DEFAULT_SETTINGS.paragraphRampUp,
        titleDisplay: result.titleDisplay ?? DEFAULT_SETTINGS.titleDisplay,
        headingDisplay: result.headingDisplay ?? DEFAULT_SETTINGS.headingDisplay,
      });
    });
  });
}

export async function saveSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

export function onSettingsChange(
  callback: (changes: Partial<Settings>) => void
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName !== 'local') return;

    const settingsChanges: Partial<Settings> = {};

    if (changes.wpm) {
      settingsChanges.wpm = changes.wpm.newValue;
    }
    if (changes.activationMode) {
      settingsChanges.activationMode = changes.activationMode.newValue;
    }
    if (changes.fontSize) {
      settingsChanges.fontSize = changes.fontSize.newValue;
    }
    if (changes.rampTime) {
      settingsChanges.rampTime = changes.rampTime.newValue;
    }
    if (changes.startingWpm) {
      settingsChanges.startingWpm = changes.startingWpm.newValue;
    }
    if (changes.autostartDelay) {
      settingsChanges.autostartDelay = changes.autostartDelay.newValue;
    }
    if (changes.paragraphPauseEnabled) {
      settingsChanges.paragraphPauseEnabled = changes.paragraphPauseEnabled.newValue;
    }
    if (changes.paragraphPauseDuration) {
      settingsChanges.paragraphPauseDuration = changes.paragraphPauseDuration.newValue;
    }
    if (changes.paragraphRampUp) {
      settingsChanges.paragraphRampUp = changes.paragraphRampUp.newValue;
    }
    if (changes.titleDisplay) {
      settingsChanges.titleDisplay = changes.titleDisplay.newValue;
    }
    if (changes.headingDisplay) {
      settingsChanges.headingDisplay = changes.headingDisplay.newValue;
    }

    if (Object.keys(settingsChanges).length > 0) {
      callback(settingsChanges);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
