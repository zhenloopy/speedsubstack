export interface Settings {
  wpm: number;
  activationMode: 'auto' | 'manual';
  fontSize: number;
  rampTime: number;
  startingWpm: number;
}

const DEFAULT_SETTINGS: Settings = {
  wpm: 300,
  activationMode: 'manual',
  fontSize: 64,
  rampTime: 10,
  startingWpm: 100,
};

export async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['wpm', 'activationMode', 'fontSize', 'rampTime', 'startingWpm'], (result) => {
      resolve({
        wpm: result.wpm ?? DEFAULT_SETTINGS.wpm,
        activationMode: result.activationMode ?? DEFAULT_SETTINGS.activationMode,
        fontSize: result.fontSize ?? DEFAULT_SETTINGS.fontSize,
        rampTime: result.rampTime ?? DEFAULT_SETTINGS.rampTime,
        startingWpm: result.startingWpm ?? DEFAULT_SETTINGS.startingWpm,
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

    if (Object.keys(settingsChanges).length > 0) {
      callback(settingsChanges);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
