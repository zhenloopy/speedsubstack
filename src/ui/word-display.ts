/**
 * Word display utilities
 */

import { splitAtORP } from '../parser/word-tokenizer';

/**
 * Format a word for display with ORP (Optimal Recognition Point) highlighting
 */
export function formatWordWithORP(word: string): string {
  const { before, orp, after } = splitAtORP(word);
  return `${escapeHtml(before)}<span class="orp">${escapeHtml(orp)}</span>${escapeHtml(after)}`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Calculate display duration modifier based on word characteristics
 * Some words naturally need more time to read
 */
export function getWordDurationModifier(word: string): number {
  let modifier = 1.0;

  // Long words take longer
  if (word.length > 8) {
    modifier += 0.2;
  } else if (word.length > 12) {
    modifier += 0.4;
  }

  // Words ending with sentence punctuation get a pause
  if (/[.!?]$/.test(word)) {
    modifier += 0.5;
  }

  // Words ending with clause punctuation get a smaller pause
  if (/[,;:]$/.test(word)) {
    modifier += 0.25;
  }

  return modifier;
}
