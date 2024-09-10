import { describe, expect, test } from '@jest/globals';
import { getTimezoneOffset } from './timezone-utils';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

// Define a mock database type
type MockTenantDatabase = Partial<LibSQLDatabase<Record<string, never>>> & {
  select: jest.Mock<any, any>;
  from: jest.Mock<any, any>;
  limit: jest.Mock<any, any>;
  __brand: 'tenant';
};

const mockDb: MockTenantDatabase = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  limit: jest.fn(),
  __brand: 'tenant',
};

describe('getLocaleTimezoneOffset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('timezone offset calculation', () => {
    test('should return 0 for UTC', async () => {
      mockDb.limit.mockResolvedValue([{ timezoneCode: 'UTC' }]);
  
      const offset = await getTimezoneOffset(mockDb as unknown as LibSQLDatabase<Record<string, never>> & { __brand: 'tenant' });
      expect(offset).toBe(0); 
    });

    test('should return the correct offset for America/New_York during daylight saving time', async () => {
      mockDb.limit.mockResolvedValue([{ timezoneCode: 'America/New_York' }]);
      jest.useFakeTimers().setSystemTime(new Date('2020-06-06T00:00:00'));

      const offset = await getTimezoneOffset(
        mockDb as unknown as LibSQLDatabase<Record<string, never>> & { __brand: 'tenant' }
      );
      expect(offset).toBe(-240);
    });

    test('should return the correct offset for America/New_York during daylight saving time', async () => {
        mockDb.limit.mockResolvedValue([{ timezoneCode: 'America/New_York' }]);
        jest.useFakeTimers().setSystemTime(new Date('2020-01-01T00:00:00'));
  
        const offset = await getTimezoneOffset(
          mockDb as unknown as LibSQLDatabase<Record<string, never>> & { __brand: 'tenant' }
        );
        expect(offset).toBe(-300);
      });

    test('should return the correct offset for Europe/London during daylight saving time', async () => {
      mockDb.limit.mockResolvedValue([{ timezoneCode: 'Europe/London' }]);
      jest.useFakeTimers().setSystemTime(new Date('2020-06-06T00:00:00'));
      const offset = await getTimezoneOffset(
        mockDb as unknown as LibSQLDatabase<Record<string, never>> & { __brand: 'tenant' }
      );
      expect(offset).toBe(60);
    });

    test('should fallback to UTC if no timezone is returned', async () => {
      mockDb.limit.mockResolvedValue([]);
  
      const offset = await getTimezoneOffset(mockDb as unknown as LibSQLDatabase<Record<string, never>> & { __brand: 'tenant' });
      expect(offset).toBe(0);
    });
  });
});