export function calculateSkipWords(wpm: number, seconds: number = 10): number {
  return Math.round((wpm / 60) * seconds);
}

export function calculateForwardIndex(
  currentIndex: number,
  totalWords: number,
  skipWords: number
): number {
  return Math.min(currentIndex + skipWords, totalWords - 1);
}

export function calculateBackwardIndex(
  currentIndex: number,
  skipWords: number
): number {
  return Math.max(currentIndex - skipWords, 0);
}

export function calculateRemainingTime(remainingWords: number, wpm: number): number {
  return (remainingWords / wpm) * 60;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
