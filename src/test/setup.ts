// Mock chrome.storage API for tests
const mockStorage: Record<string, unknown> = {};

const mockChrome = {
  storage: {
    local: {
      get: (keys: string[], callback: (result: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in mockStorage) {
            result[key] = mockStorage[key];
          }
        }
        callback(result);
      },
      set: (items: Record<string, unknown>, callback?: () => void) => {
        Object.assign(mockStorage, items);
        callback?.();
      },
    },
    onChanged: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
};

// @ts-expect-error - mock chrome API
globalThis.chrome = mockChrome;

// Reset storage between tests
beforeEach(() => {
  for (const key of Object.keys(mockStorage)) {
    delete mockStorage[key];
  }
});
