/**
 * Article content extractor for Substack pages
 */

import { tokenizeText, cleanText, type WordToken } from './word-tokenizer';

export interface ExtractedWord {
  word: string;
  index: number;
  element: HTMLElement;
  paragraphIndex: number;
  isParagraphStart: boolean;
  spanId: string;
}

export interface ExtractionResult {
  words: ExtractedWord[];
  paragraphStartIndices: number[];
  totalWords: number;
}

/**
 * Elements to skip when extracting content
 */
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

/**
 * Block elements that start new paragraphs
 */
const BLOCK_ELEMENTS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'BLOCKQUOTE', 'DIV', 'SECTION', 'ARTICLE',
]);

/**
 * Check if an element should be skipped
 */
function shouldSkipElement(element: Element): boolean {
  for (const selector of SKIP_SELECTORS) {
    if (element.matches(selector)) return true;
    if (element.closest(selector)) return true;
  }
  return false;
}

/**
 * Collect all text nodes from a container
 */
function collectTextNodes(container: HTMLElement): { node: Text; blockAncestor: Element | null }[] {
  const textNodes: { node: Text; blockAncestor: Element | null }[] = [];

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
        textNodes.push({ node: currentNode as Text, blockAncestor });
      }
    }
  }

  return textNodes;
}

/**
 * Extract article content and wrap each word in a span
 */
export function extractArticleContent(container: HTMLElement): ExtractionResult {
  const words: ExtractedWord[] = [];
  const paragraphStartIndices: number[] = [];
  let wordIndex = 0;
  let paragraphIndex = 0;
  let lastBlockElement: Element | null = null;

  // First, collect all text nodes (before modifying DOM)
  const textNodes = collectTextNodes(container);

  console.log('[SpeedSubstack] Found', textNodes.length, 'text nodes to process');

  // Then process each text node
  for (const { node, blockAncestor } of textNodes) {
    const text = cleanText(node.textContent || '');
    if (!text) continue;

    // Check if we're in a new block element (new paragraph)
    if (blockAncestor !== lastBlockElement && blockAncestor) {
      lastBlockElement = blockAncestor;
      if (wordIndex > 0) {
        paragraphIndex++;
      }
      paragraphStartIndices.push(wordIndex);
    }

    // Tokenize the text
    const tokens = tokenizeText(text, paragraphIndex, wordIndex);

    // Wrap each word in a span
    const fragment = document.createDocumentFragment();

    for (const token of tokens) {
      const spanId = `speedsubstack-word-${token.index}`;
      const span = document.createElement('span');
      span.id = spanId;
      span.className = 'speedsubstack-word';
      span.textContent = token.word;
      span.dataset.wordIndex = token.index.toString();

      words.push({
        word: token.word,
        index: token.index,
        element: span,
        paragraphIndex: token.paragraphIndex,
        isParagraphStart: token.isParagraphStart,
        spanId,
      });

      fragment.appendChild(span);

      // Add space between words
      if (token.index < tokens[tokens.length - 1].index) {
        fragment.appendChild(document.createTextNode(' '));
      }

      wordIndex++;
    }

    // Add trailing space if original text had it
    if (node.textContent?.endsWith(' ')) {
      fragment.appendChild(document.createTextNode(' '));
    }

    // Replace the text node with our spans
    node.parentNode?.replaceChild(fragment, node);
  }

  console.log('[SpeedSubstack] Extracted', words.length, 'words from', paragraphStartIndices.length, 'paragraphs');

  return {
    words,
    paragraphStartIndices,
    totalWords: words.length,
  };
}

/**
 * Find the nearest block-level ancestor of an element
 */
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

/**
 * Get the paragraph start index for a given word index
 */
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

/**
 * Clean up word spans (for when extension is disabled/removed)
 */
export function cleanupWordSpans(container: HTMLElement): void {
  const spans = container.querySelectorAll('.speedsubstack-word');

  spans.forEach((span) => {
    const text = span.textContent || '';
    const textNode = document.createTextNode(text);
    span.parentNode?.replaceChild(textNode, span);
  });

  // Normalize text nodes
  container.normalize();
}
