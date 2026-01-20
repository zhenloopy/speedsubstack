/**
 * Navigation calculations for skip/rewind
 */

/**
 * Calculate number of words to skip for a given time period
 * @param wpm Current words per minute
 * @param seconds Number of seconds to skip
 * @returns Number of words to skip
 */
export function calculateSkipWords(wpm: number, seconds: number = 10): number {
  // words per second = wpm / 60
  // skip words = words per second * seconds
  return Math.round((wpm / 60) * seconds);
}

/**
 * Calculate the target index when skipping forward
 * @param currentIndex Current word index
 * @param totalWords Total number of words
 * @param skipWords Number of words to skip
 * @returns New index, clamped to valid range
 */
export function calculateForwardIndex(
  currentIndex: number,
  totalWords: number,
  skipWords: number
): number {
  return Math.min(currentIndex + skipWords, totalWords - 1);
}

/**
 * Calculate the target index when skipping backward
 * @param currentIndex Current word index
 * @param skipWords Number of words to skip
 * @returns New index, clamped to valid range
 */
export function calculateBackwardIndex(
  currentIndex: number,
  skipWords: number
): number {
  return Math.max(currentIndex - skipWords, 0);
}

/**
 * Calculate reading time remaining
 * @param remainingWords Number of words remaining
 * @param wpm Current words per minute
 * @returns Remaining time in seconds
 */
export function calculateRemainingTime(remainingWords: number, wpm: number): number {
  return (remainingWords / wpm) * 60;
}

/**
 * Format time in seconds to mm:ss
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
