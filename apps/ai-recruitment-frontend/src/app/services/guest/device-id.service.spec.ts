import { TestBed } from '@angular/core/testing';
import { DeviceIdService } from './device-id.service';

describe('DeviceIdService', () => {
  let service: DeviceIdService;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    mockLocalStorage = {};

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviceIdService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Device ID Generation', () => {
    it('should generate a valid UUID on first call', () => {
      const deviceId = service.getDeviceId();
      
      expect(deviceId).toBeTruthy();
      expect(deviceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should return the same device ID on subsequent calls', () => {
      const deviceId1 = service.getDeviceId();
      const deviceId2 = service.getDeviceId();
      
      expect(deviceId1).toBe(deviceId2);
    });

    it('should persist device ID in localStorage', () => {
      const deviceId = service.getDeviceId();
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'ai-recruitment-device-id',
        deviceId
      );
    });

    it('should retrieve existing device ID from localStorage', () => {
      const existingId = '12345678-1234-4321-8765-123456789012';
      mockLocalStorage['ai-recruitment-device-id'] = existingId;
      
      // Create new service instance to simulate app restart
      const newService = new DeviceIdService();
      const retrievedId = newService.getDeviceId();
      
      expect(retrievedId).toBe(existingId);
    });

    it('should generate new ID if stored ID is invalid', () => {
      mockLocalStorage['ai-recruitment-device-id'] = 'invalid-id';
      
      const newService = new DeviceIdService();
      const deviceId = newService.getDeviceId();
      
      expect(deviceId).not.toBe('invalid-id');
      expect(deviceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('Device ID Management', () => {
    it('should regenerate device ID when requested', () => {
      const originalId = service.getDeviceId();
      const newId = service.regenerateDeviceId();
      
      expect(newId).not.toBe(originalId);
      expect(newId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(service.getDeviceId()).toBe(newId);
    });

    it('should clear device ID', () => {
      service.getDeviceId(); // Generate initial ID
      service.clearDeviceId();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('ai-recruitment-device-id');
    });

    it('should check if device ID exists', () => {
      expect(service.hasDeviceId()).toBe(false);
      
      service.getDeviceId(); // Generate ID
      expect(service.hasDeviceId()).toBe(true);
      
      service.clearDeviceId();
      expect(service.hasDeviceId()).toBe(false);
    });
  });

  describe('Device Fingerprinting', () => {
    beforeEach(() => {
      // Mock browser APIs
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true,
      });

      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        writable: true,
      });

      Object.defineProperty(screen, 'width', {
        value: 1920,
        writable: true,
      });

      Object.defineProperty(screen, 'height', {
        value: 1080,
        writable: true,
      });

      // Mock Intl API
      jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        timeZone: 'America/New_York',
      } as any);
    });

    it('should generate device fingerprint', () => {
      const fingerprint = service.getDeviceFingerprint();
      
      expect(fingerprint).toEqual({
        deviceId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        language: 'en-US',
      });
    });

    it('should include valid device ID in fingerprint', () => {
      const deviceId = service.getDeviceId();
      const fingerprint = service.getDeviceFingerprint();
      
      expect(fingerprint.deviceId).toBe(deviceId);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock console methods before creating service
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Override the global localStorage mock to throw errors
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => {
            throw new Error('localStorage not available');
          }),
          setItem: jest.fn(() => {
            throw new Error('localStorage not available');
          }),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      });

      const newService = new DeviceIdService();
      const deviceId = newService.getDeviceId();
      
      expect(deviceId).toBeTruthy();
      expect(deviceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to access localStorage:',
        expect.any(Error)
      );

      // Restore original mock
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
          setItem: jest.fn((key: string, value: string) => {
            mockLocalStorage[key] = value;
          }),
          removeItem: jest.fn((key: string) => {
            delete mockLocalStorage[key];
          }),
          clear: jest.fn(() => {
            mockLocalStorage = {};
          }),
        },
        writable: true,
      });

      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should handle clearDeviceId with localStorage errors', () => {
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(() => service.clearDeviceId()).not.toThrow();
    });
  });

  describe('Device ID Validation', () => {
    const validIds = [
      '12345678-1234-4321-8765-123456789012',
      'aBcDeF12-3456-4789-8765-123456789abc',
      '00000000-0000-4000-8000-000000000000',
    ];

    const invalidIds = [
      'invalid-id',
      '12345678-1234-1234-1234-123456789012', // Wrong version
      '12345678-1234-4321-1234-123456789012', // Wrong variant
      '12345678-1234-4321-8765-12345678901',  // Too short
      '12345678-1234-4321-8765-1234567890123', // Too long
      '',
      null,
      undefined,
    ];

    validIds.forEach((id) => {
      it(`should accept valid UUID: ${id}`, () => {
        mockLocalStorage['ai-recruitment-device-id'] = id;
        
        const newService = new DeviceIdService();
        const retrievedId = newService.getDeviceId();
        
        expect(retrievedId).toBe(id);
      });
    });

    invalidIds.forEach((id) => {
      it(`should reject invalid ID and generate new: ${id}`, () => {
        mockLocalStorage['ai-recruitment-device-id'] = id as string;
        
        const newService = new DeviceIdService();
        const retrievedId = newService.getDeviceId();
        
        expect(retrievedId).not.toBe(id);
        expect(retrievedId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      });
    });
  });
});