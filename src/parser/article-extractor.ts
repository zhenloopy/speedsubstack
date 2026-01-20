import { tokenizeText, cleanText } from './word-tokenizer';

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

const SKIP_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'figure',
  'img',
  '.subscription-widget',
  '.share-dialog',
  '.post-footer',
  '.comments-section',
  'button',
  '[role="button"]',
  'code',
  'pre',
];

const BLOCK_ELEMENTS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'BLOCKQUOTE', 'DIV', 'SECTION', 'ARTICLE',
]);

const HEADING_ELEMENTS = new Set(['H2', 'H3', 'H4', 'H5', 'H6']);

// Selectors to find the article title on Substack pages
const TITLE_SELECTORS = [
  'h1.post-title',
  'h1[data-testid="post-title"]',
  '.post-header h1',
  'article h1:first-of-type',
  'h1.headline',
];

function shouldSkipElement(element: Element): boolean {
  for (const selector of SKIP_SELECTORS) {
    if (element.matches(selector)) return true;
    if (element.closest(selector)) return true;
  }
  return false;
}

function findHeadingAncestor(element: Element): Element | null {
  let current: Element | null = element;
  while (current) {
    if (HEADING_ELEMENTS.has(current.tagName)) {
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

export function extractArticleContent(container: HTMLElement): ExtractionResult {
  const words: ExtractedWord[] = [];
  const paragraphStartIndices: number[] = [];
  let wordIndex = 0;
  let paragraphIndex = 0;
  let lastBlockElement: Element | null = null;

  const textNodes = collectTextNodes(container);
  const articleTitle = findArticleTitle();

  console.log('[SpeedSubstack] Found', textNodes.length, 'text nodes to process');
  console.log('[SpeedSubstack] Article title:', articleTitle);

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

      words.push({
        word,
        index: wordIndex,
        paragraphIndex,
        isParagraphStart: words.length === 0 || 
          (paragraphStartIndices.length > 0 && paragraphStartIndices[paragraphStartIndices.length - 1] === wordIndex),
        textNode: node,
        startOffset,
        endOffset,
        currentHeading: headingText,
      });

      wordIndex++;
    }
  }

  console.log('[SpeedSubstack] Extracted', words.length, 'words from', paragraphStartIndices.length, 'paragraphs');

  return {
    words,
    paragraphStartIndices,
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
