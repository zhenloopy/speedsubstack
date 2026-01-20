export interface SubstackDetectionResult {
  isSubstack: boolean;
  isArticle: boolean;
  articleContainer: HTMLElement | null;
}

const ARTICLE_SELECTORS = [
  '.post-content',
  '.body.markup',
  'article .body',
  '.available-content',
  '[data-component-name="PostContent"]',
  '.post-content-final',
  '.single-post',
  '.post',
];

const NON_ARTICLE_INDICATORS = [
  '.post-list',
  '.publication-homepage',
  '.archive-page',
  '.subscribe-page',
];

export function isSubstackDomain(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'substack.com' || hostname.endsWith('.substack.com');
}

export function findArticleContainer(): HTMLElement | null {
  for (const selector of ARTICLE_SELECTORS) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      const textLength = element.textContent?.trim().length || 0;
      if (textLength > 100) {
        console.log('[SpeedSubstack] Found article container:', selector);
        return element;
      }
    }
  }
  return null;
}

export function isNonArticlePage(): boolean {
  for (const selector of NON_ARTICLE_INDICATORS) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  return false;
}

export function detectSubstackArticle(): SubstackDetectionResult {
  const isSubstack = isSubstackDomain();

  if (!isSubstack) {
    return { isSubstack: false, isArticle: false, articleContainer: null };
  }

  if (isNonArticlePage()) {
    return { isSubstack: true, isArticle: false, articleContainer: null };
  }

  const articleContainer = findArticleContainer();
  const isArticle = articleContainer !== null;

  return { isSubstack, isArticle, articleContainer };
}

export function waitForArticle(timeout = 10000): Promise<SubstackDetectionResult> {
  return new Promise((resolve) => {
    // Check immediately first
    const immediate = detectSubstackArticle();
    if (immediate.isArticle) {
      resolve(immediate);
      return;
    }

    // Not substack? Return immediately
    if (!immediate.isSubstack) {
      resolve(immediate);
      return;
    }

    let resolved = false;
    let observer: MutationObserver | null = null;
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const check = () => {
      if (resolved) return;
      
      const result = detectSubstackArticle();
      if (result.isArticle) {
        resolved = true;
        cleanup();
        resolve(result);
      }
    };

    // Use MutationObserver instead of RAF polling
    observer = new MutationObserver(() => {
      // Debounce checks - don't check on every single mutation
      check();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Set timeout
    timeoutId = window.setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(detectSubstackArticle());
    }, timeout);
  });
}
