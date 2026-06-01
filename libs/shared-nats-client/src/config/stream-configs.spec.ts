import { RetentionPolicy, DiscardPolicy } from 'nats';
import {
  JOB_EVENTS_STREAM,
  ERROR_EVENTS_STREAM,
  METRICS_STREAM,
  DEFAULT_STREAMS,
  StreamConfigFactory,
} from './stream-configs';

describe('StreamConfigs', () => {
  describe('JOB_EVENTS_STREAM', () => {
    it('should have correct stream name', () => {
      expect(JOB_EVENTS_STREAM.name).toBe('JOB_EVENTS');
    });

    it('should have correct subjects', () => {
      expect(JOB_EVENTS_STREAM.subjects).toEqual(['job.*', 'analysis.*']);
    });

    it('should have limits retention policy', () => {
      expect(JOB_EVENTS_STREAM.retention).toBe(RetentionPolicy.Limits);
    });

    it('should have 7 days max age in nanoseconds', () => {
      const sevenDays = 7 * 24 * 60 * 60 * 1000 * 1000000;
      expect(JOB_EVENTS_STREAM.maxAge).toBe(sevenDays);
    });

    it('should have 10000 max messages', () => {
      expect(JOB_EVENTS_STREAM.maxMsgs).toBe(10000);
    });

    it('should have old discard policy', () => {
      expect(JOB_EVENTS_STREAM.discard).toBe(DiscardPolicy.Old);
    });

    it('should have 2 minutes duplicate window', () => {
      const twoMinutes = 2 * 60 * 1000 * 1000000;
      expect(JOB_EVENTS_STREAM.duplicateWindow).toBe(twoMinutes);
    });
  });

  describe('ERROR_EVENTS_STREAM', () => {
    it('should have correct stream name', () => {
      expect(ERROR_EVENTS_STREAM.name).toBe('ERROR_EVENTS');
    });

    it('should have error subjects', () => {
      expect(ERROR_EVENTS_STREAM.subjects).toEqual(['error.*', 'failure.*']);
    });

    it('should have 14 days max age', () => {
      const fourteenDays = 14 * 24 * 60 * 60 * 1000 * 1000000;
      expect(ERROR_EVENTS_STREAM.maxAge).toBe(fourteenDays);
    });

    it('should have 50000 max messages', () => {
      expect(ERROR_EVENTS_STREAM.maxMsgs).toBe(50000);
    });

    it('should have 5 minutes duplicate window', () => {
      const fiveMinutes = 5 * 60 * 1000 * 1000000;
      expect(ERROR_EVENTS_STREAM.duplicateWindow).toBe(fiveMinutes);
    });
  });

  describe('METRICS_STREAM', () => {
    it('should have correct stream name', () => {
      expect(METRICS_STREAM.name).toBe('METRICS');
    });

    it('should have metrics subjects', () => {
      expect(METRICS_STREAM.subjects).toEqual(['metrics.*', 'performance.*']);
    });

    it('should have 3 days max age', () => {
      const threeDays = 3 * 24 * 60 * 60 * 1000 * 1000000;
      expect(METRICS_STREAM.maxAge).toBe(threeDays);
    });

    it('should have 100000 max messages', () => {
      expect(METRICS_STREAM.maxMsgs).toBe(100000);
    });
  });

  describe('DEFAULT_STREAMS', () => {
    it('should contain all three streams', () => {
      expect(DEFAULT_STREAMS).toHaveLength(3);
      expect(DEFAULT_STREAMS).toContain(JOB_EVENTS_STREAM);
      expect(DEFAULT_STREAMS).toContain(ERROR_EVENTS_STREAM);
      expect(DEFAULT_STREAMS).toContain(METRICS_STREAM);
    });
  });

  describe('StreamConfigFactory', () => {
    describe('create', () => {
      it('should create stream with provided name and subjects', () => {
        const config = StreamConfigFactory.create('TEST_STREAM', ['test.*']);
        expect(config.name).toBe('TEST_STREAM');
        expect(config.subjects).toEqual(['test.*']);
      });

      it('should apply default values', () => {
        const config = StreamConfigFactory.create('TEST', ['test.*']);
        expect(config.retention).toBe(RetentionPolicy.Limits);
        expect(config.discard).toBe(DiscardPolicy.Old);
      });

      it('should allow overriding defaults', () => {
        const config = StreamConfigFactory.create('TEST', ['test.*'], {
          maxMsgs: 50000,
        });
        expect(config.maxMsgs).toBe(50000);
      });

      it('should preserve default values when not overridden', () => {
        const config = StreamConfigFactory.create('TEST', ['test.*'], {
          maxMsgs: 50000,
        });
        expect(config.maxAge).toBe(7 * 24 * 60 * 60 * 1000 * 1000000);
      });
    });

    describe('createDev', () => {
      it('should create development stream with short retention', () => {
        const config = StreamConfigFactory.createDev('DEV_STREAM', ['dev.*']);
        expect(config.maxAge).toBe(1 * 24 * 60 * 60 * 1000 * 1000000);
      });

      it('should create development stream with limited messages', () => {
        const config = StreamConfigFactory.createDev('DEV_STREAM', ['dev.*']);
        expect(config.maxMsgs).toBe(1000);
      });

      it('should create development stream with short duplicate window', () => {
        const config = StreamConfigFactory.createDev('DEV_STREAM', ['dev.*']);
        expect(config.duplicateWindow).toBe(30 * 1000 * 1000000);
      });

      it('should allow overriding dev defaults', () => {
        const config = StreamConfigFactory.createDev('DEV', ['dev.*'], {
          maxAge: 2 * 24 * 60 * 60 * 1000 * 1000000,
        });
        expect(config.maxAge).toBe(2 * 24 * 60 * 60 * 1000 * 1000000);
      });
    });

    describe('createProd', () => {
      it('should create production stream with long retention', () => {
        const config = StreamConfigFactory.createProd('PROD_STREAM', [
          'prod.*',
        ]);
        expect(config.maxAge).toBe(30 * 24 * 60 * 60 * 1000 * 1000000);
      });

      it('should create production stream with high message limit', () => {
        const config = StreamConfigFactory.createProd('PROD_STREAM', [
          'prod.*',
        ]);
        expect(config.maxMsgs).toBe(100000);
      });

      it('should create production stream with long duplicate window', () => {
        const config = StreamConfigFactory.createProd('PROD_STREAM', [
          'prod.*',
        ]);
        expect(config.duplicateWindow).toBe(10 * 60 * 1000 * 1000000);
      });

      it('should allow overriding prod defaults', () => {
        const config = StreamConfigFactory.createProd('PROD', ['prod.*'], {
          maxMsgs: 200000,
        });
        expect(config.maxMsgs).toBe(200000);
      });
    });
  });
});
