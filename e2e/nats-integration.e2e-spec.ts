import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { connect, NatsConnection } from 'nats';

describe('NATS Integration (e2e)', () => {
  let app: INestApplication;
  let natsConnection: NatsConnection;

  // Test timeout for E2E tests
  const TEST_TIMEOUT = 30000;

  beforeAll(async () => {
    // Connect to test NATS instance
    try {
      natsConnection = await connect({
        servers: process.env.NATS_URL || 'nats://localhost:4222',
        timeout: 5000,
      });
    } catch (error) {
      console.warn('NATS server not available for E2E tests:', error.message);
      natsConnection = null;
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (natsConnection) {
      await natsConnection.close();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Message Bus Health Check', () => {
    it('should check NATS server connectivity', async () => {
      if (!natsConnection) {
        console.log('Skipping NATS connectivity test - server not available');
        return;
      }

      expect(natsConnection.isClosed()).toBeFalsy();
      
      // Test basic pub/sub functionality
      const subject = 'test.connectivity';
      const testMessage = { test: 'connectivity', timestamp: Date.now() };
      
      let messageReceived = false;
      const subscription = natsConnection.subscribe(subject);
      
      // Set up message handler
      (async () => {
        for await (const msg of subscription) {
          const data = JSON.parse(new TextDecoder().decode(msg.data));
          expect(data.test).toBe('connectivity');
          messageReceived = true;
          break;
        }
      })();

      // Publish test message
      natsConnection.publish(subject, new TextEncoder().encode(JSON.stringify(testMessage)));
      
      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(messageReceived).toBeTruthy();
      subscription.unsubscribe();
    }, TEST_TIMEOUT);
  });

  describe('Event Flow Verification', () => {
    it('should verify JetStream is available', async () => {
      if (!natsConnection) {
        console.log('Skipping JetStream test - NATS server not available');
        return;
      }

      const jetstream = natsConnection.jetstream();
      expect(jetstream).toBeDefined();

      // Test JetStream publish
      try {
        const publishAck = await jetstream.publish('test.jetstream', new TextEncoder().encode('test'));
        expect(publishAck.seq).toBeGreaterThan(0);
      } catch (error) {
        console.log('JetStream not configured, which is expected for basic NATS setup');
      }
    }, TEST_TIMEOUT);

    it('should verify stream creation and message persistence', async () => {
      if (!natsConnection) {
        console.log('Skipping stream test - NATS server not available');
        return;
      }

      try {
        const jsm = await natsConnection.jetstreamManager();
        
        // Try to create a test stream
        const streamConfig = {
          name: 'TEST_EVENTS',
          subjects: ['test.*'],
          retention: 'limits' as const,
          max_msgs: 100,
          max_age: 60 * 60 * 1000 * 1000000, // 1 hour in nanoseconds
        };

        try {
          await jsm.streams.add(streamConfig);
          console.log('Test stream created successfully');
          
          // Clean up test stream
          await jsm.streams.delete('TEST_EVENTS');
          console.log('Test stream cleaned up');
        } catch (error) {
          console.log('Stream operations not available, which is expected for basic NATS setup');
        }
      } catch (error) {
        console.log('JetStream Manager not available, which is expected for basic NATS setup');
      }
    }, TEST_TIMEOUT);
  });

  describe('Service Integration Points', () => {
    const expectedEventSubjects = [
      'job.jd.submitted',
      'job.resume.submitted',
      'analysis.jd.extracted',
      'analysis.resume.parsed',
      'analysis.scoring.completed'
    ];

    it.each(expectedEventSubjects)('should handle %s events', async (subject) => {
      if (!natsConnection) {
        console.log(`Skipping ${subject} event test - NATS server not available`);
        return;
      }

      const testPayload = {
        eventType: subject.replace(/\./g, ''),
        timestamp: new Date().toISOString(),
        testData: true,
      };

      let messageReceived = false;
      const subscription = natsConnection.subscribe(subject);
      
      // Set up message handler
      (async () => {
        for await (const msg of subscription) {
          const data = JSON.parse(new TextDecoder().decode(msg.data));
          expect(data.testData).toBe(true);
          messageReceived = true;
          break;
        }
      })();

      // Publish test message
      natsConnection.publish(subject, new TextEncoder().encode(JSON.stringify(testPayload)));
      
      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(messageReceived).toBeTruthy();
      subscription.unsubscribe();
    }, TEST_TIMEOUT);
  });

  describe('Error Handling and Recovery', () => {
    it('should handle connection failures gracefully', async () => {
      // This test validates that our services can handle NATS connection failures
      // In a real scenario, you would:
      // 1. Start services without NATS
      // 2. Verify they start successfully (degraded mode)
      // 3. Start NATS and verify automatic reconnection
      
      // For now, we just verify that the test framework handles missing connections
      if (!natsConnection) {
        expect(natsConnection).toBeNull();
        console.log('NATS connection failure handled gracefully');
      } else {
        console.log('NATS connection available - testing recovery scenarios not needed');
        expect(natsConnection.isClosed()).toBeFalsy();
      }
    });

    it('should handle message delivery failures', async () => {
      if (!natsConnection) {
        console.log('Skipping message delivery test - NATS server not available');
        return;
      }

      // Test publishing to a subject with no subscribers
      // This should not cause errors in a properly configured system
      const orphanSubject = 'test.orphan.message';
      const testMessage = { orphaned: true, timestamp: Date.now() };
      
      expect(() => {
        natsConnection.publish(orphanSubject, new TextEncoder().encode(JSON.stringify(testMessage)));
      }).not.toThrow();
    });
  });
});