/**
 * Utilities for detecting Substack article pages
 */

export interface SubstackDetectionResult {
  isSubstack: boolean;
  isArticle: boolean;
  articleContainer: HTMLElement | null;
}

/**
 * Known selectors for Substack article content containers
 */
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

/**
 * Selectors that indicate we're NOT on an article page
 */
const NON_ARTICLE_INDICATORS = [
  '.post-list',
  '.publication-homepage',
  '.archive-page',
  '.subscribe-page',
];

/**
 * Checks if the current page is a Substack domain
 */
export function isSubstackDomain(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'substack.com' || hostname.endsWith('.substack.com');
}

/**
 * Finds the article content container on the page
 */
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

/**
 * Checks if the page is a non-article page (homepage, archive, etc.)
 */
export function isNonArticlePage(): boolean {
  for (const selector of NON_ARTICLE_INDICATORS) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  return false;
}

/**
 * Comprehensive detection of whether we're on a readable Substack article
 */
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

/**
 * Wait for the article container to be available in the DOM
 * (useful for SPAs or slow-loading pages)
 */
export function waitForArticle(timeout = 10000): Promise<SubstackDetectionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      const elapsed = Date.now() - startTime;
      const result = detectSubstackArticle();

      if (result.isArticle) {
        resolve(result);
        return;
      }

      if (elapsed > timeout) {
        resolve(result);
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}
