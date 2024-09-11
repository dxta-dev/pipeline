import { describe, expect, test } from '@jest/globals';
import { getUTCOffset } from './timezone-utils';

  describe('timezone offset calculation', () => {
    test('should return 0 for UTC', () => {

      const date = new Date('2021-01-01T00:00:00Z');
      const timezone = 'UTC';
  
      const offset = getUTCOffset(timezone, date);
      expect(offset).toBe(0); 
    });

    test('should return the correct offset for America/New_York during daylight saving time', () => {
      const date = new Date('2021-07-01T00:00:00Z');
      const timezone = 'America/New_York';

      const offset = getUTCOffset(timezone, date);
      expect(offset).toBe(-240);
    });

    test('should return the correct offset for America/New_York WITHOUT daylight saving time', () => {
      const date = new Date('2021-01-01T00:00:00Z');
      const timezone = 'America/New_York';

      const offset = getUTCOffset(timezone, date);
      expect(offset).toBe(-300);
    });

    test('should return the correct offset for Europe/London during daylight saving time', () => {
      const date = new Date('2021-01-01T00:00:00Z');
      const timezone = 'Europe/London';

      const offset = getUTCOffset(timezone, date);
      expect(offset).toBe(0);
    });

    test('should return the correct offset for Europe/London WITHOUT daylight saving time', () => {
      const date = new Date('2021-07-01T00:00:00Z');
      const timezone = 'Europe/London';

      const offset = getUTCOffset(timezone, date);
      expect(offset).toBe(60);
    });

    test('check Asian offset in summer time', () => {
      const date = new Date('2021-07-01T00:00:00Z');
      const timezone = 'Asia/Tokyo';

      const offset = getUTCOffset(timezone, date);
      expect(offset).toBe(540);
    });

    test('check Asian offset in winter time', () => {
      const date = new Date('2021-01-01T00:00:00Z');
      const timezone = 'Asia/Tokyo';

      const offset = getUTCOffset(timezone, date);
      expect(offset).toBe(540);
    });
  });