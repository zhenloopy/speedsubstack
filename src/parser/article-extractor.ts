import { cleanText } from './word-tokenizer';

export interface ExtractedWord {
  word: string;
  index: number;
  paragraphIndex: number;
  isParagraphStart: boolean;
  // Text node reference for Range-based highlighting
  textNode: Text;
  startOffset: number;
  endOffset: number;
  // Current heading this word is under (null if no heading yet)
  currentHeading: string | null;
}

export interface ExtractionResult {
  words: ExtractedWord[];
  paragraphStartIndices: number[];
  totalWords: number;
  articleTitle: string | null;
}

// Tags to skip - use Set for O(1) lookup
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'FIGURE', 'IMG', 'BUTTON', 'CODE', 'PRE']);

// Class-based selectors that need closest() check
const SKIP_CLASSES = ['subscription-widget', 'share-dialog', 'post-footer', 'comments-section'];

// Combined selector for closest() - built once
const SKIP_ANCESTOR_SELECTOR = SKIP_CLASSES.map(c => `.${c}`).join(',') + ',[role="button"]';

const BLOCK_ELEMENTS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'BLOCKQUOTE', 'DIV', 'SECTION', 'ARTICLE',
]);

const HEADING_ELEMENTS = new Set(['H2', 'H3', 'H4', 'H5', 'H6']);
const HEADING_CLASSES = ['header-anchor-post'];

// Selectors to find the article title on Substack pages
const TITLE_SELECTORS = [
  'h1.post-title',
  'h1[data-testid="post-title"]',
  '.post-header h1',
  'article h1:first-of-type',
  'h1.headline',
];

function shouldSkipElement(element: Element): boolean {
  // Fast tag check first (O(1))
  if (SKIP_TAGS.has(element.tagName)) return true;
  
  // Single closest() call with combined selector
  if (element.closest(SKIP_ANCESTOR_SELECTOR)) return true;
  
  return false;
}

function isHeadingElement(element: Element): boolean {
  if (HEADING_ELEMENTS.has(element.tagName)) {
    return true;
  }
  for (const className of HEADING_CLASSES) {
    if (element.classList.contains(className)) {
      return true;
    }
  }
  return false;
}

function findHeadingAncestor(element: Element): Element | null {
  let current: Element | null = element;
  while (current) {
    if (isHeadingElement(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function findArticleTitle(): string | null {
  // Try standard selectors first
  for (const selector of TITLE_SELECTORS) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text) {
        return text;
      }
    }
  }
  
  // Fallback: find a link in article that points to the current URL (common title pattern)
  const currentPath = window.location.pathname;
  const articleLinks = document.querySelectorAll<HTMLAnchorElement>('article a[href]');
  for (const link of articleLinks) {
    try {
      const linkUrl = new URL(link.href, window.location.origin);
      if (linkUrl.pathname === currentPath) {
        const text = link.textContent?.trim();
        if (text && text.length > 5) { // Ensure it's not just a short label
          return text;
        }
      }
    } catch {
      // Invalid URL, skip
    }
  }
  
  return null;
}

interface TextNodeInfo {
  node: Text;
  blockAncestor: Element | null;
  headingText: string | null;
}

function collectTextNodes(container: HTMLElement): TextNodeInfo[] {
  const textNodes: TextNodeInfo[] = [];
  let currentHeading: string | null = null;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (shouldSkipElement(element)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let currentNode: Node | null;
  while ((currentNode = walker.nextNode())) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      const text = cleanText(currentNode.textContent || '');
      if (text) {
        const parentElement = currentNode.parentElement;
        const blockAncestor = parentElement ? findBlockAncestor(parentElement) : null;
        
        // Check if this text is inside a heading
        const headingAncestor = parentElement ? findHeadingAncestor(parentElement) : null;
        if (headingAncestor) {
          currentHeading = headingAncestor.textContent?.trim() || null;
        }
        
        textNodes.push({ node: currentNode as Text, blockAncestor, headingText: currentHeading });
      }
    }
  }

  return textNodes;
}

// Check if a string is only punctuation (no letters or numbers)
function isPunctuationOnly(str: string): boolean {
  return /^[^\p{L}\p{N}]+$/u.test(str);
}

// Check if a string starts with connecting punctuation (hyphen, en-dash, em-dash)
function startsWithConnector(str: string): boolean {
  return /^[-–—]/.test(str);
}

export function extractArticleContent(container: HTMLElement): ExtractionResult {
  const rawWords: ExtractedWord[] = [];
  const paragraphStartIndices: number[] = [];
  let wordIndex = 0;
  let paragraphIndex = 0;
  let lastBlockElement: Element | null = null;

  const textNodes = collectTextNodes(container);
  const articleTitle = findArticleTitle();

  for (const { node, blockAncestor, headingText } of textNodes) {
    const rawText = node.textContent || '';
    if (!rawText.trim()) continue;

    if (blockAncestor !== lastBlockElement && blockAncestor) {
      lastBlockElement = blockAncestor;
      if (wordIndex > 0) {
        paragraphIndex++;
      }
      paragraphStartIndices.push(wordIndex);
    }

    // Find word boundaries in the original text node
    const wordRegex = /\S+/g;
    let match;

    while ((match = wordRegex.exec(rawText)) !== null) {
      const word = match[0];
      const startOffset = match.index;
      const endOffset = startOffset + word.length;

      rawWords.push({
        word,
        index: wordIndex,
        paragraphIndex,
        isParagraphStart: rawWords.length === 0 ||
          (paragraphStartIndices.length > 0 && paragraphStartIndices[paragraphStartIndices.length - 1] === wordIndex),
        textNode: node,
        startOffset,
        endOffset,
        currentHeading: headingText,
      });

      wordIndex++;
    }
  }

  // Post-process: merge punctuation-only tokens with adjacent words
  // This handles cases like <em>Empirically</em>, where the comma ends up in a separate text node
  const words: ExtractedWord[] = [];
  for (let i = 0; i < rawWords.length; i++) {
    const current = rawWords[i];
    const prev = words[words.length - 1];

    // If current is punctuation-only or starts with a connector (hyphen), merge with previous word
    if (prev && (isPunctuationOnly(current.word) || startsWithConnector(current.word))) {
      // Merge: append current word to previous
      prev.word = prev.word + current.word;
      // Keep the original textNode/offsets from the first part for highlighting
      // The highlighting will only show the first part, which is acceptable
    } else {
      // Re-index the word
      current.index = words.length;
      words.push(current);
    }
  }

  // Update paragraph start indices to account for merged words
  // We need to recalculate based on actual word indices
  const updatedParagraphStarts: number[] = [];
  for (const word of words) {
    if (word.isParagraphStart) {
      updatedParagraphStarts.push(word.index);
    }
  }

  return {
    words,
    paragraphStartIndices: updatedParagraphStarts,
    totalWords: words.length,
    articleTitle,
  };
}

function findBlockAncestor(element: Element): Element | null {
  let current: Element | null = element;

  while (current) {
    if (BLOCK_ELEMENTS.has(current.tagName)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

export function getParagraphStart(wordIndex: number, paragraphStartIndices: number[]): number {
  let paragraphStart = 0;

  for (const startIndex of paragraphStartIndices) {
    if (startIndex <= wordIndex) {
      paragraphStart = startIndex;
    } else {
      break;
    }
  }

  return paragraphStart;
}
