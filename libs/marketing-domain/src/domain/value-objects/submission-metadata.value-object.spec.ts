import { SubmissionMetadata } from './submission-metadata.value-object.js';

describe('SubmissionMetadata', () => {
  describe('constructor', () => {
    it('should create submission metadata with all properties', () => {
      const metadata = new SubmissionMetadata({
        ip: '192.168.1.1',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date('2024-01-15T10:30:00Z'),
      });

      expect(metadata).toBeInstanceOf(SubmissionMetadata);
    });

    it('should store IP address correctly', () => {
      const metadata = new SubmissionMetadata({
        ip: '10.0.0.1',
        userAgent: 'Test Agent',
        timestamp: new Date(),
      });

      expect((metadata as any).props.ip).toBe('10.0.0.1');
    });

    it('should store user agent correctly', () => {
      const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      const metadata = new SubmissionMetadata({
        ip: '127.0.0.1',
        userAgent,
        timestamp: new Date(),
      });

      expect((metadata as any).props.userAgent).toBe(userAgent);
    });

    it('should store timestamp correctly', () => {
      const timestamp = new Date('2024-06-01T12:00:00Z');
      const metadata = new SubmissionMetadata({
        ip: '127.0.0.1',
        userAgent: 'Test',
        timestamp,
      });

      expect((metadata as any).props.timestamp).toEqual(timestamp);
    });
  });

  describe('restore', () => {
    it('should restore from serialized data with string timestamp', () => {
      const data = {
        ip: '192.168.1.1',
        userAgent: 'Test Agent',
        timestamp: '2024-01-15T10:30:00Z',
      };

      const metadata = SubmissionMetadata.restore(data);

      expect(metadata).toBeInstanceOf(SubmissionMetadata);
      expect(metadata.ip).toBe('192.168.1.1');
      expect((metadata as any).props.userAgent).toBe('Test Agent');
      expect((metadata as any).props.timestamp).toBeInstanceOf(Date);
      expect((metadata as any).props.timestamp.toISOString()).toBe(
        '2024-01-15T10:30:00.000Z',
      );
    });

    it('should restore from data with Date timestamp', () => {
      const originalDate = new Date('2024-03-20T08:00:00Z');
      const data = {
        ip: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
        timestamp: originalDate,
      };

      const metadata = SubmissionMetadata.restore(data);

      expect((metadata as any).props.timestamp).toBeInstanceOf(Date);
    });

    it('should handle different date formats', () => {
      const dates = [
        '2024-01-01T00:00:00Z',
        '2024-12-31T23:59:59Z',
        '2024-06-15T12:30:45.123Z',
      ];

      dates.forEach((dateStr) => {
        const metadata = SubmissionMetadata.restore({
          ip: '127.0.0.1',
          userAgent: 'Test',
          timestamp: dateStr,
        });

        expect((metadata as any).props.timestamp.toISOString()).toBe(
          new Date(dateStr).toISOString(),
        );
      });
    });
  });

  describe('getters', () => {
    it('should get IP address', () => {
      const metadata = new SubmissionMetadata({
        ip: '192.168.1.100',
        userAgent: 'Test Agent',
        timestamp: new Date(),
      });

      expect(metadata.ip).toBe('192.168.1.100');
    });
  });

  describe('edge cases', () => {
    it('should handle IPv6 addresses', () => {
      const metadata = new SubmissionMetadata({
        ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        userAgent: 'Test',
        timestamp: new Date(),
      });

      expect(metadata.ip).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('should handle localhost', () => {
      const metadata = new SubmissionMetadata({
        ip: '127.0.0.1',
        userAgent: 'Test',
        timestamp: new Date(),
      });

      expect(metadata.ip).toBe('127.0.0.1');
    });

    it('should handle very long user agent strings', () => {
      const longUserAgent = 'A'.repeat(1000);
      const metadata = new SubmissionMetadata({
        ip: '127.0.0.1',
        userAgent: longUserAgent,
        timestamp: new Date(),
      });

      expect((metadata as any).props.userAgent).toBe(longUserAgent);
    });

    it('should handle user agents with special characters', () => {
      const userAgent =
        'Mozilla/5.0 (compatible; Bot/1.0; +http://example.com/bot)';
      const metadata = new SubmissionMetadata({
        ip: '127.0.0.1',
        userAgent,
        timestamp: new Date(),
      });

      expect((metadata as any).props.userAgent).toBe(userAgent);
    });

    it('should handle empty user agent', () => {
      const metadata = new SubmissionMetadata({
        ip: '127.0.0.1',
        userAgent: '',
        timestamp: new Date(),
      });

      expect((metadata as any).props.userAgent).toBe('');
    });
  });
});
