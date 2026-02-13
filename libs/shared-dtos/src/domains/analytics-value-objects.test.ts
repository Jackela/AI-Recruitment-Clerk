import { describe, beforeEach, expect } from '@jest/globals';
import {
  AnalyticsEventId,
  EventType,
  EventStatus,
  UserSession,
  DeviceInfo,
  GeoLocation,
  EventData,
  EventTimestamp,
  EventContext,
} from './analytics.dto';

describe('9. Value Objects', () => {
  // Test data
  const validSessionId = 'session_12345_abcdef';
  const validUserId = 'user_67890';

  const validDeviceInfo = new DeviceInfo({
    userAgent: 'Mozilla/5.0 Chrome/91.0',
    screenResolution: '1920x1080',
    language: 'en-US',
    timezone: 'America/New_York',
  });

  const validGeoLocation = new GeoLocation({
    country: 'US',
    region: 'NY',
    city: 'New York',
    latitude: 40.7128,
    longitude: -74.006,
  });

  const validUserSession = UserSession.create(
    validSessionId,
    validUserId,
    validDeviceInfo,
    validGeoLocation,
  );

  const validEventData = {
    action: 'click',
    target: 'submit_button',
    value: 'questionnaire_submit',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AnalyticsEventId', () => {
    it('should create valid AnalyticsEventId', () => {
      const id = AnalyticsEventId.generate();
      expect(id.getValue()).toMatch(/^analytics_/);
    });
  });

  describe('UserSession', () => {
    it('should create valid UserSession', () => {
      const session = UserSession.create(
        validSessionId,
        validUserId,
        validDeviceInfo,
        validGeoLocation,
      );

      expect(session.getSessionId()).toBe(validSessionId);
      expect(session.getUserId()).toBe(validUserId);
      expect(session.hasValidConsent()).toBe(true);
      expect(session.isValid()).toBe(true);
    });

    it('should detect invalid session', () => {
      const session = UserSession.create('', undefined); // Invalid session
      expect(session.isValid()).toBe(false);

      const errors = session.getValidationErrors();
      expect(errors).toContain('Session ID is required');
      expect(errors).toContain('User ID is required for user sessions');
    });
  });

  describe('DeviceInfo', () => {
    it('should validate device info', () => {
      expect(validDeviceInfo.isValid()).toBe(true);

      const invalidDeviceInfo = new DeviceInfo({
        userAgent: '',
        screenResolution: '',
        language: '',
        timezone: '',
      });
      expect(invalidDeviceInfo.isValid()).toBe(false);
    });
  });

  describe('GeoLocation', () => {
    it('should validate geo location', () => {
      expect(validGeoLocation.isValid()).toBe(true);

      const invalidGeoLocation = new GeoLocation({
        country: '',
        region: '',
        city: '',
      });
      expect(invalidGeoLocation.isValid()).toBe(false);
    });
  });

  describe('EventData', () => {
    it('should validate event data', () => {
      const eventData = EventData.create(
        EventType.USER_INTERACTION,
        validEventData,
      );

      expect(eventData.getEventType()).toBe(EventType.USER_INTERACTION);
      expect(eventData.isValid()).toBe(true);
      expect(eventData.getValidationErrors()).toEqual([]);
    });
  });

  describe('EventTimestamp', () => {
    it('should validate timestamp', () => {
      const timestamp = EventTimestamp.now('UTC');
      expect(timestamp.isValid()).toBe(true);
      expect(timestamp.toISOString()).toBeDefined();
      expect(timestamp.getValidationErrors()).toEqual([]);
    });
  });

  describe('EventContext', () => {
    it('should validate event context', () => {
      const context = EventContext.create({
        pageUrl: '/test',
        referrer: 'https://example.com',
        dimensions: { source: 'web' },
        metadata: { version: '1.0' },
      });

      expect(context.isValid()).toBe(true);
      expect(context.getValidationErrors()).toEqual([]);
    });
  });
});
