export interface Settings {
  enabled: boolean;
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
  surroundingWords: number;
  themeColor: string;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  wpm: 300,
  activationMode: 'manual',
  fontSize: 60,
  rampTime: 20,
  startingWpm: 150,
  autostartDelay: 1,
  paragraphPauseEnabled: false,
  paragraphPauseDuration: 0.5,
  paragraphRampUp: false,
  titleDisplay: true,
  headingDisplay: true,
  surroundingWords: 0,
  themeColor: '#FF6719',
};

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

export async function resetAllSettings(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(DEFAULT_SETTINGS, resolve);
  });
}

export async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEYS, (result) => {
      const settings: Record<string, unknown> = {};
      for (const key of SETTINGS_KEYS) {
        settings[key] = result[key] ?? DEFAULT_SETTINGS[key];
      }
      resolve(settings as unknown as Settings);
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
    for (const key of SETTINGS_KEYS) {
      if (changes[key]) {
        (settingsChanges as Record<string, unknown>)[key] = changes[key].newValue;
      }
    }

    if (Object.keys(settingsChanges).length > 0) {
      callback(settingsChanges);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
