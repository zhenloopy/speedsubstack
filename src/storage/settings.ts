/**
 * Settings storage using chrome.storage.local
 */

export interface Settings {
  wpm: number;
  activationMode: 'auto' | 'manual';
}

const DEFAULT_SETTINGS: Settings = {
  wpm: 300,
  activationMode: 'manual',
};

/**
 * Load settings from chrome.storage.local
 */
export async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['wpm', 'activationMode'], (result) => {
      resolve({
        wpm: result.wpm ?? DEFAULT_SETTINGS.wpm,
        activationMode: result.activationMode ?? DEFAULT_SETTINGS.activationMode,
      });
    });
  });
}

/**
 * Save a single setting to chrome.storage.local
 */
export async function saveSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

/**
 * Save all settings to chrome.storage.local
 */
export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(settings, resolve);
  });
}

/**
 * Listen for settings changes
 */
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

    if (Object.keys(settingsChanges).length > 0) {
      callback(settingsChanges);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
