import { describe, it, expect } from 'vitest';
import {
  calculateSkipWords,
  calculateForwardIndex,
  calculateBackwardIndex,
  calculateRemainingTime,
  formatTime,
  findNextParagraphIndex,
  findPreviousParagraphIndex,
} from '../engine/navigation';

describe('navigation', () => {
  describe('calculateSkipWords', () => {
    it('should calculate correct skip amount at 300 WPM', () => {
      // 300 WPM = 5 words per second
      // 10 seconds = 50 words
      expect(calculateSkipWords(300, 10)).toBe(50);
    });

    it('should calculate correct skip amount at 600 WPM', () => {
      // 600 WPM = 10 words per second
      // 10 seconds = 100 words
      expect(calculateSkipWords(600, 10)).toBe(100);
    });

    it('should calculate correct skip amount at 100 WPM', () => {
      // 100 WPM = 1.67 words per second
      // 10 seconds = ~17 words
      expect(calculateSkipWords(100, 10)).toBe(17);
    });

    it('should handle different time periods', () => {
      // 300 WPM, 5 seconds = 25 words
      expect(calculateSkipWords(300, 5)).toBe(25);
    });

    it('should default to 10 seconds', () => {
      expect(calculateSkipWords(300)).toBe(50);
    });
  });

  describe('calculateForwardIndex', () => {
    it('should calculate forward index within bounds', () => {
      expect(calculateForwardIndex(10, 100, 25)).toBe(35);
    });

    it('should clamp to max index', () => {
      expect(calculateForwardIndex(90, 100, 25)).toBe(99);
    });

    it('should handle skip to exactly end', () => {
      expect(calculateForwardIndex(75, 100, 24)).toBe(99);
    });
  });

  describe('calculateBackwardIndex', () => {
    it('should calculate backward index within bounds', () => {
      expect(calculateBackwardIndex(50, 25)).toBe(25);
    });

    it('should clamp to 0', () => {
      expect(calculateBackwardIndex(10, 25)).toBe(0);
    });

    it('should handle exact skip to start', () => {
      expect(calculateBackwardIndex(25, 25)).toBe(0);
    });
  });

  describe('calculateRemainingTime', () => {
    it('should calculate remaining time correctly', () => {
      // 300 words remaining at 300 WPM = 60 seconds
      expect(calculateRemainingTime(300, 300)).toBe(60);
    });

    it('should handle fractional results', () => {
      // 150 words remaining at 300 WPM = 30 seconds
      expect(calculateRemainingTime(150, 300)).toBe(30);
    });

    it('should handle high WPM', () => {
      // 600 words remaining at 600 WPM = 60 seconds
      expect(calculateRemainingTime(600, 600)).toBe(60);
    });
  });

  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(65)).toBe('1:05');
    });

    it('should handle zero', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('should handle minutes without padding', () => {
      expect(formatTime(120)).toBe('2:00');
    });

    it('should pad seconds with leading zero', () => {
      expect(formatTime(61)).toBe('1:01');
    });

    it('should handle large values', () => {
      expect(formatTime(3661)).toBe('61:01');
    });
  });

  describe('findNextParagraphIndex', () => {
    const paragraphStarts = [0, 25, 60, 100, 150];

    it('should find next paragraph from middle of current paragraph', () => {
      expect(findNextParagraphIndex(10, paragraphStarts)).toBe(25);
    });

    it('should find next paragraph from paragraph start', () => {
      expect(findNextParagraphIndex(25, paragraphStarts)).toBe(60);
    });

    it('should stay at current position when at last paragraph', () => {
      expect(findNextParagraphIndex(160, paragraphStarts)).toBe(160);
    });

    it('should find next paragraph when at second to last paragraph', () => {
      expect(findNextParagraphIndex(125, paragraphStarts)).toBe(150);
    });
  });

  describe('findPreviousParagraphIndex', () => {
    const paragraphStarts = [0, 25, 60, 100, 150];

    it('should find previous paragraph from middle of current paragraph', () => {
      expect(findPreviousParagraphIndex(50, paragraphStarts)).toBe(25);
    });

    it('should find previous paragraph from paragraph start', () => {
      expect(findPreviousParagraphIndex(60, paragraphStarts)).toBe(25);
    });

    it('should return 0 when in first paragraph', () => {
      expect(findPreviousParagraphIndex(10, paragraphStarts)).toBe(0);
    });

    it('should return 0 when at first paragraph start', () => {
      expect(findPreviousParagraphIndex(0, paragraphStarts)).toBe(0);
    });

    it('should find correct previous paragraph from last paragraph', () => {
      expect(findPreviousParagraphIndex(160, paragraphStarts)).toBe(150);
    });
  });
});
