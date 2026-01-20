import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveProgress, loadProgress, clearProgress } from '../storage/progress';

describe('progress storage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15'));
  });

  describe('saveProgress', () => {
    it('should save progress for an article', async () => {
      await saveProgress('https://example.substack.com/p/test-article', 10, 50);

      const progress = await loadProgress('https://example.substack.com/p/test-article');
      expect(progress).not.toBeNull();
      expect(progress?.paragraphStartIndex).toBe(10);
      expect(progress?.lastWordIndex).toBe(50);
    });

    it('should normalize URL by removing query params', async () => {
      await saveProgress('https://example.substack.com/p/test-article?ref=share', 10, 50);

      const progress = await loadProgress('https://example.substack.com/p/test-article');
      expect(progress).not.toBeNull();
    });
  });

  describe('loadProgress', () => {
    it('should return null for non-existent article', async () => {
      const progress = await loadProgress('https://example.substack.com/p/no-such-article');
      expect(progress).toBeNull();
    });

    it('should return null for expired progress (>30 days)', async () => {
      // Save at current time
      await saveProgress('https://example.substack.com/p/old-article', 10, 50);

      // Advance time by 31 days
      vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

      const progress = await loadProgress('https://example.substack.com/p/old-article');
      expect(progress).toBeNull();
    });

    it('should return progress for recent entries', async () => {
      await saveProgress('https://example.substack.com/p/recent-article', 10, 50);

      // Advance time by 15 days (still within 30 days)
      vi.advanceTimersByTime(15 * 24 * 60 * 60 * 1000);

      const progress = await loadProgress('https://example.substack.com/p/recent-article');
      expect(progress).not.toBeNull();
    });
  });

  describe('clearProgress', () => {
    it('should remove progress for an article', async () => {
      await saveProgress('https://example.substack.com/p/test-article', 10, 50);
      await clearProgress('https://example.substack.com/p/test-article');

      const progress = await loadProgress('https://example.substack.com/p/test-article');
      expect(progress).toBeNull();
    });

    it('should not affect other articles', async () => {
      await saveProgress('https://example.substack.com/p/article-1', 10, 50);
      await saveProgress('https://example.substack.com/p/article-2', 20, 100);

      await clearProgress('https://example.substack.com/p/article-1');

      const progress1 = await loadProgress('https://example.substack.com/p/article-1');
      const progress2 = await loadProgress('https://example.substack.com/p/article-2');

      expect(progress1).toBeNull();
      expect(progress2).not.toBeNull();
    });
  });
});
