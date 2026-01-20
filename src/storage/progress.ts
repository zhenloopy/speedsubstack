export interface ArticleProgress {
  paragraphStartIndex: number;
  lastWordIndex: number;
  savedAt: number;
}

type ProgressStore = Record<string, ArticleProgress>;

const STORAGE_KEY = 'speedsubstack_progress';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function getArticleKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

async function loadProgressStore(): Promise<ProgressStore> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || {});
    });
  });
}

async function saveProgressStore(store: ProgressStore): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: store }, resolve);
  });
}

export async function saveProgress(
  url: string,
  paragraphStartIndex: number,
  lastWordIndex: number
): Promise<void> {
  const store = await loadProgressStore();
  const key = getArticleKey(url);

  store[key] = {
    paragraphStartIndex,
    lastWordIndex,
    savedAt: Date.now(),
  };

  await saveProgressStore(store);
}

export async function loadProgress(url: string): Promise<ArticleProgress | null> {
  const store = await loadProgressStore();
  const key = getArticleKey(url);

  const progress = store[key];
  if (!progress) return null;

  if (Date.now() - progress.savedAt > MAX_AGE_MS) {
    delete store[key];
    await saveProgressStore(store);
    return null;
  }

  return progress;
}

export async function clearProgress(url: string): Promise<void> {
  const store = await loadProgressStore();
  const key = getArticleKey(url);

  delete store[key];
  await saveProgressStore(store);
}

export async function cleanupOldProgress(): Promise<number> {
  const store = await loadProgressStore();
  const now = Date.now();
  let cleaned = 0;

  for (const key of Object.keys(store)) {
    if (now - store[key].savedAt > MAX_AGE_MS) {
      delete store[key];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    await saveProgressStore(store);
  }

  return cleaned;
}

export async function getAllProgress(): Promise<ProgressStore> {
  return loadProgressStore();
}
