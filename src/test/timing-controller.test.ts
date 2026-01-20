import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimingController } from '../engine/timing-controller';
import type { ExtractedWord } from '../parser/article-extractor';

// Create mock words
function createMockWords(count: number): ExtractedWord[] {
  return Array.from({ length: count }, (_, i) => ({
    word: `word${i}`,
    index: i,
    element: document.createElement('span'),
    paragraphIndex: Math.floor(i / 10),
    isParagraphStart: i % 10 === 0,
    spanId: `speedsubstack-word-${i}`,
  }));
}

describe('TimingController', () => {
  let controller: TimingController;
  let mockCallbacks: {
    onWordChange: ReturnType<typeof vi.fn>;
    onComplete: ReturnType<typeof vi.fn>;
    onProgress: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCallbacks = {
      onWordChange: vi.fn(),
      onComplete: vi.fn(),
      onProgress: vi.fn(),
    };
    controller = new TimingController(300, mockCallbacks);
  });

  afterEach(() => {
    controller.destroy();
  });

  describe('initialization', () => {
    it('should initialize with given WPM', () => {
      expect(controller.getWpm()).toBe(300);
    });

    it('should start at index 0', () => {
      expect(controller.getIndex()).toBe(0);
    });

    it('should not be playing initially', () => {
      expect(controller.getIsPlaying()).toBe(false);
    });
  });

  describe('setWords', () => {
    it('should set words and reset index', () => {
      const words = createMockWords(100);
      controller.setWords(words);

      expect(controller.getTotalWords()).toBe(100);
      expect(controller.getIndex()).toBe(0);
    });

    it('should call onProgress with initial values', () => {
      const words = createMockWords(50);
      controller.setWords(words);

      expect(mockCallbacks.onProgress).toHaveBeenCalledWith(0, 50);
    });
  });

  describe('setWpm', () => {
    it('should update WPM', () => {
      controller.setWpm(500);
      expect(controller.getWpm()).toBe(500);
    });

    it('should clamp WPM to minimum 100', () => {
      controller.setWpm(50);
      expect(controller.getWpm()).toBe(100);
    });

    it('should clamp WPM to maximum 800', () => {
      controller.setWpm(1000);
      expect(controller.getWpm()).toBe(800);
    });
  });

  describe('setIndex', () => {
    it('should update current index', () => {
      const words = createMockWords(100);
      controller.setWords(words);
      controller.setIndex(50);

      expect(controller.getIndex()).toBe(50);
    });

    it('should clamp index to valid range (minimum)', () => {
      const words = createMockWords(100);
      controller.setWords(words);
      controller.setIndex(-10);

      expect(controller.getIndex()).toBe(0);
    });

    it('should clamp index to valid range (maximum)', () => {
      const words = createMockWords(100);
      controller.setWords(words);
      controller.setIndex(200);

      expect(controller.getIndex()).toBe(99);
    });

    it('should call onWordChange when setting index', () => {
      const words = createMockWords(100);
      controller.setWords(words);
      mockCallbacks.onWordChange.mockClear();

      controller.setIndex(25);

      expect(mockCallbacks.onWordChange).toHaveBeenCalledWith(words[25], 25);
    });
  });

  describe('skipForward', () => {
    it('should advance index by specified words', () => {
      const words = createMockWords(100);
      controller.setWords(words);
      controller.setIndex(10);

      controller.skipForward(25);

      expect(controller.getIndex()).toBe(35);
    });

    it('should not exceed total words', () => {
      const words = createMockWords(100);
      controller.setWords(words);
      controller.setIndex(90);

      controller.skipForward(50);

      expect(controller.getIndex()).toBe(99);
    });
  });

  describe('skipBackward', () => {
    it('should decrease index by specified words', () => {
      const words = createMockWords(100);
      controller.setWords(words);
      controller.setIndex(50);

      controller.skipBackward(25);

      expect(controller.getIndex()).toBe(25);
    });

    it('should not go below 0', () => {
      const words = createMockWords(100);
      controller.setWords(words);
      controller.setIndex(10);

      controller.skipBackward(25);

      expect(controller.getIndex()).toBe(0);
    });
  });

  describe('seekToProgress', () => {
    it('should seek to percentage position', () => {
      const words = createMockWords(100);
      controller.setWords(words);

      controller.seekToProgress(0.5);

      expect(controller.getIndex()).toBe(50);
    });

    it('should handle edge cases', () => {
      const words = createMockWords(100);
      controller.setWords(words);

      controller.seekToProgress(0);
      expect(controller.getIndex()).toBe(0);

      controller.seekToProgress(1);
      expect(controller.getIndex()).toBe(99);
    });
  });

  describe('reset', () => {
    it('should reset to beginning and pause', () => {
      const words = createMockWords(100);
      controller.setWords(words);
      controller.setIndex(50);
      controller.play();

      controller.reset();

      expect(controller.getIndex()).toBe(0);
      expect(controller.getIsPlaying()).toBe(false);
    });
  });
});
