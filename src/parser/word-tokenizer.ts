export interface WordToken {
  word: string;
  index: number;
  paragraphIndex: number;
  isParagraphStart: boolean;
}

export function tokenizeText(text: string, paragraphIndex: number, startIndex: number): WordToken[] {
  const tokens: WordToken[] = [];
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

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

export function isPunctuationOnly(word: string): boolean {
  return /^[^\w\s]+$/.test(word);
}

export function getORPIndex(word: string): number {
  const length = word.length;

  if (length <= 1) return 0;
  if (length <= 3) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  if (length <= 13) return 3;
  return 4;
}

export function splitAtORP(word: string): { before: string; orp: string; after: string } {
  const orpIndex = getORPIndex(word);

  return {
    before: word.slice(0, orpIndex),
    orp: word[orpIndex] || '',
    after: word.slice(orpIndex + 1),
  };
}
