import type { DomainEvent } from './domain-event';

describe('DomainEvent', () => {
  describe('DomainEvent interface', () => {
    it('should require occurredAt timestamp', () => {
      const event: DomainEvent = {
        occurredAt: new Date(),
      };

      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should accept past timestamp', () => {
      const pastDate = new Date('2024-01-01T00:00:00.000Z');
      const event: DomainEvent = {
        occurredAt: pastDate,
      };

      expect(event.occurredAt).toEqual(pastDate);
    });

    it('should accept future timestamp', () => {
      const futureDate = new Date('2030-01-01T00:00:00.000Z');
      const event: DomainEvent = {
        occurredAt: futureDate,
      };

      expect(event.occurredAt).toEqual(futureDate);
    });
  });
});
