/**
 * Word tokenizer for article content
 */

export interface WordToken {
  word: string;
  index: number;
  paragraphIndex: number;
  isParagraphStart: boolean;
}

/**
 * Tokenize text into words, preserving important information
 */
export function tokenizeText(text: string, paragraphIndex: number, startIndex: number): WordToken[] {
  const tokens: WordToken[] = [];

  // Split on whitespace, preserving punctuation attached to words
  const words = text.split(/\s+/).filter(w => w.length > 0);

  let index = startIndex;
  for (let i = 0; i < words.length; i++) {
    tokens.push({
      word: words[i],
      index,
      paragraphIndex,
      isParagraphStart: i === 0,
    });
    index++;
  }

  return tokens;
}

/**
 * Clean up text by removing extra whitespace and normalizing
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
    .trim();
}

/**
 * Check if a word contains mainly punctuation
 */
export function isPunctuationOnly(word: string): boolean {
  return /^[^\w\s]+$/.test(word);
}

/**
 * Get the "optimal recognition point" index for a word
 * This is typically slightly left of center for better reading
 */
export function getORPIndex(word: string): number {
  const length = word.length;

  if (length <= 1) return 0;
  if (length <= 3) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  if (length <= 13) return 3;
  return 4;
}

/**
 * Split a word into before-ORP, ORP character, and after-ORP parts
 */
export function splitAtORP(word: string): { before: string; orp: string; after: string } {
  const orpIndex = getORPIndex(word);

  return {
    before: word.slice(0, orpIndex),
    orp: word[orpIndex] || '',
    after: word.slice(orpIndex + 1),
  };
}
