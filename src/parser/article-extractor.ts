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
}

export interface ExtractionResult {
  words: ExtractedWord[];
  paragraphStartIndices: number[];
  totalWords: number;
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

function shouldSkipElement(element: Element): boolean {
  for (const selector of SKIP_SELECTORS) {
    if (element.matches(selector)) return true;
    if (element.closest(selector)) return true;
  }
  return false;
}

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

export function extractArticleContent(container: HTMLElement): ExtractionResult {
  const words: ExtractedWord[] = [];
  const paragraphStartIndices: number[] = [];
  let wordIndex = 0;
  let paragraphIndex = 0;
  let lastBlockElement: Element | null = null;

  const textNodes = collectTextNodes(container);

  console.log('[SpeedSubstack] Found', textNodes.length, 'text nodes to process');

  for (const { node, blockAncestor } of textNodes) {
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
      });

      wordIndex++;
    }
  }

  console.log('[SpeedSubstack] Extracted', words.length, 'words from', paragraphStartIndices.length, 'paragraphs');

  return {
    words,
    paragraphStartIndices,
    totalWords: words.length,
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
