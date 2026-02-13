import {
  ConsentStatus,
  UserSession,
  DeviceInfo,
  GeoLocation,
} from './analytics.dto';
import { AnalyticsDomainService } from './analytics.service';

// 测试数据
export const validSessionId = 'session_12345_abcdef';
export const validUserId = 'user_67890';

export const validDeviceInfo = new DeviceInfo({
  userAgent: 'Mozilla/5.0 Chrome/91.0',
  screenResolution: '1920x1080',
  language: 'en-US',
  timezone: 'America/New_York',
});

export const validGeoLocation = new GeoLocation({
  country: 'US',
  region: 'NY',
  city: 'New York',
  latitude: 40.7128,
  longitude: -74.006,
});

export const validUserSession = UserSession.create(
  validSessionId,
  validUserId,
  validDeviceInfo,
  validGeoLocation,
);

export const validEventData = {
  action: 'click',
  target: 'submit_button',
  value: 'questionnaire_submit',
};

// Mock 实现
export const mockRepository = {
  save: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  findBySession: jest.fn(),
  findByDateRange: jest.fn(),
  countSessionEvents: jest.fn().mockResolvedValue(5),
  deleteExpired: jest.fn(),
  anonymizeOldEvents: jest.fn(),
};

export const mockEventBus = {
  publish: jest.fn(),
};

export const mockAuditLogger = {
  logBusinessEvent: jest.fn(),
  logSecurityEvent: jest.fn(),
  logError: jest.fn(),
};

export const mockPrivacyService = {
  getUserConsentStatus: jest.fn().mockResolvedValue(ConsentStatus.GRANTED),
  anonymizeUserData: jest.fn(),
  deleteUserData: jest.fn(),
};

export const mockSessionTracker = {
  updateSessionActivity: jest.fn(),
  getSession: jest.fn().mockResolvedValue(validUserSession),
  endSession: jest.fn(),
};

export const domainService = new AnalyticsDomainService(
  mockRepository,
  mockEventBus,
  mockAuditLogger,
  mockPrivacyService,
  mockSessionTracker,
);

export function clearAllMocks(): void {
  jest.clearAllMocks();
}
