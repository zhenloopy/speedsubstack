export function getWordDurationModifier(word: string): number {
  let modifier = 1.0;

  if (word.length > 8) {
    modifier += 0.2;
  } else if (word.length > 12) {
    modifier += 0.4;
  }

  if (/[.!?]$/.test(word)) {
    modifier += 0.5;
  }

  if (/[,;:]$/.test(word)) {
    modifier += 0.25;
  }

  return modifier;
}
