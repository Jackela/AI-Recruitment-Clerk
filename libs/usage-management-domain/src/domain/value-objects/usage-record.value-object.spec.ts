import { UsageRecord } from './usage-record.value-object';

describe('UsageRecord', () => {
  const timestamp = new Date('2024-01-15T10:30:00Z');

  describe('constructor', () => {
    it('should create usage record with timestamp and count', () => {
      const record = new UsageRecord({ timestamp, count: 5 });
      expect(record.timestamp).toBe(timestamp);
      expect(record.count).toBe(5);
    });
  });

  describe('timestamp getter', () => {
    it('should return the timestamp', () => {
      const record = new UsageRecord({ timestamp, count: 1 });
      expect(record.timestamp).toBe(timestamp);
    });
  });

  describe('count getter', () => {
    it('should return the count', () => {
      const record = new UsageRecord({ timestamp, count: 10 });
      expect(record.count).toBe(10);
    });
  });
});
