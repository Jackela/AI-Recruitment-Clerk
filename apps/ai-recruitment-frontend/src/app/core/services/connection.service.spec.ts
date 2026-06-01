import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ConnectionService } from './connection.service';

describe('ConnectionService', () => {
  let service: ConnectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideMockStore()],
    });
    service = TestBed.inject(ConnectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Connection Status', () => {
    it('should have correct initial connection status', () => {
      const status = service.getConnectionStatus();
      expect(status()).toEqual({
        isOffline: false,
        lastChecked: null,
        backendAvailable: true,
        errorMessage: null,
      });
    });

    it('should track offline status', () => {
      expect(service.isOffline()).toBe(false);
    });
  });

  describe('Backend Availability Check', () => {
    it('should have assertBackendAvailable method', () => {
      expect(service.assertBackendAvailable).toBeDefined();
    });

    it('should throw error when backend is offline', () => {
      // Manually set to offline state
      service['connectionStatus'].set({
        isOffline: true,
        lastChecked: new Date(),
        backendAvailable: false,
        errorMessage: '后端服务不可用',
      });

      expect(() => service.assertBackendAvailable()).toThrow('后端服务不可用');
    });

    it('should not throw error when backend is online', () => {
      service['connectionStatus'].set({
        isOffline: false,
        lastChecked: new Date(),
        backendAvailable: true,
        errorMessage: null,
      });

      expect(() => service.assertBackendAvailable()).not.toThrow();
    });
  });
});
