import { describe, it, expect } from 'vitest';
import {
  tokenizeText,
  cleanText,
  isPunctuationOnly,
  getORPIndex,
  splitAtORP,
} from '../parser/word-tokenizer';

describe('word-tokenizer', () => {
  describe('tokenizeText', () => {
    it('should tokenize simple text into words', () => {
      const result = tokenizeText('Hello world test', 0, 0);

      expect(result).toHaveLength(3);
      expect(result[0].word).toBe('Hello');
      expect(result[1].word).toBe('world');
      expect(result[2].word).toBe('test');
    });

    it('should assign correct indices', () => {
      const result = tokenizeText('One two three', 0, 0);

      expect(result[0].index).toBe(0);
      expect(result[1].index).toBe(1);
      expect(result[2].index).toBe(2);
    });

    it('should start from given startIndex', () => {
      const result = tokenizeText('Hello world', 0, 10);

      expect(result[0].index).toBe(10);
      expect(result[1].index).toBe(11);
    });

    it('should track paragraph index', () => {
      const result = tokenizeText('Hello world', 5, 0);

      expect(result[0].paragraphIndex).toBe(5);
      expect(result[1].paragraphIndex).toBe(5);
    });

    it('should mark first word as paragraph start', () => {
      const result = tokenizeText('Hello world test', 0, 0);

      expect(result[0].isParagraphStart).toBe(true);
      expect(result[1].isParagraphStart).toBe(false);
      expect(result[2].isParagraphStart).toBe(false);
    });

    it('should handle punctuation attached to words', () => {
      const result = tokenizeText('Hello, world!', 0, 0);

      expect(result[0].word).toBe('Hello,');
      expect(result[1].word).toBe('world!');
    });

    it('should handle extra whitespace', () => {
      const result = tokenizeText('Hello    world   test', 0, 0);

      expect(result).toHaveLength(3);
    });

    it('should return empty array for empty text', () => {
      const result = tokenizeText('', 0, 0);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for whitespace only', () => {
      const result = tokenizeText('   \n\t   ', 0, 0);
      expect(result).toHaveLength(0);
    });
  });

  describe('cleanText', () => {
    it('should trim whitespace', () => {
      expect(cleanText('  hello  ')).toBe('hello');
    });

    it('should collapse multiple spaces', () => {
      expect(cleanText('hello   world')).toBe('hello world');
    });

    it('should remove zero-width characters', () => {
      expect(cleanText('hello\u200Bworld')).toBe('helloworld');
    });
  });

  describe('isPunctuationOnly', () => {
    it('should return true for punctuation only strings', () => {
      expect(isPunctuationOnly('...')).toBe(true);
      expect(isPunctuationOnly('!')).toBe(true);
      expect(isPunctuationOnly('---')).toBe(true);
    });

    it('should return false for strings with letters', () => {
      expect(isPunctuationOnly('hello')).toBe(false);
      expect(isPunctuationOnly('test!')).toBe(false);
    });
  });

  describe('getORPIndex', () => {
    it('should return 0 for single character words', () => {
      expect(getORPIndex('a')).toBe(0);
    });

    it('should return 0 for short words (2-3 chars)', () => {
      expect(getORPIndex('to')).toBe(0);
      expect(getORPIndex('the')).toBe(0);
    });

    it('should return 1 for medium words (4-5 chars)', () => {
      expect(getORPIndex('four')).toBe(1);
      expect(getORPIndex('hello')).toBe(1);
    });

    it('should return 2 for longer words (6-9 chars)', () => {
      expect(getORPIndex('morning')).toBe(2);
      expect(getORPIndex('beautiful')).toBe(2);
    });

    it('should return 3 for very long words (10-13 chars)', () => {
      expect(getORPIndex('programming')).toBe(3);
    });

    it('should return 4 for extremely long words (14+ chars)', () => {
      expect(getORPIndex('acknowledgement')).toBe(4);
    });
  });

  describe('splitAtORP', () => {
    it('should split short words correctly', () => {
      const result = splitAtORP('the');
      expect(result.before).toBe('');
      expect(result.orp).toBe('t');
      expect(result.after).toBe('he');
    });

    it('should split medium words correctly', () => {
      const result = splitAtORP('hello');
      expect(result.before).toBe('h');
      expect(result.orp).toBe('e');
      expect(result.after).toBe('llo');
    });

    it('should split long words correctly', () => {
      const result = splitAtORP('beautiful');
      expect(result.before).toBe('be');
      expect(result.orp).toBe('a');
      expect(result.after).toBe('utiful');
    });

    it('should handle single character words', () => {
      const result = splitAtORP('I');
      expect(result.before).toBe('');
      expect(result.orp).toBe('I');
      expect(result.after).toBe('');
    });
  });
});
