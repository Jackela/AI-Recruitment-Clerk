import { Injectable } from '@angular/core';

/**
 * Provides device id functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class DeviceIdService {
  private readonly STORAGE_KEY = 'ai-recruitment-device-id';
  private deviceId: string | null = null;

  /**
   * Initializes a new instance of the Device ID Service.
   */
  constructor() {
    // Don't auto-initialize - only initialize when requested
  }

  /**
   * Get the current device ID, generating one if needed
   */
  public getDeviceId(): string {
    if (!this.deviceId) {
      this.initializeDeviceId();
    }
    // After initializeDeviceId, deviceId is guaranteed to be set
    return this.deviceId as string;
  }

  /**
   * Generate a new device ID and store it
   */
  public regenerateDeviceId(): string {
    const newDeviceId = this.generateUUID();
    this.deviceId = newDeviceId;
    this.storeDeviceId(newDeviceId);
    return newDeviceId;
  }

  /**
   * Clear the device ID (for testing or reset purposes)
   */
  public clearDeviceId(): void {
    this.deviceId = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Check if device ID exists
   */
  public hasDeviceId(): boolean {
    return !!this.deviceId || !!this.getStoredDeviceId();
  }

  private initializeDeviceId(): void {
    // Try to get existing device ID from localStorage
    const storedId = this.getStoredDeviceId();

    if (storedId && this.isValidDeviceId(storedId)) {
      this.deviceId = storedId;
    } else {
      // Generate new device ID
      const newDeviceId = this.generateUUID();
      this.deviceId = newDeviceId;
      this.storeDeviceId(newDeviceId);
    }
  }

  private getStoredDeviceId(): string | null {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
      return null;
    }
  }

  private storeDeviceId(deviceId: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, deviceId);
    } catch (error) {
      console.error('Failed to store device ID:', error);
    }
  }

  private generateUUID(): string {
    // Generate RFC 4122 compliant UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  private isValidDeviceId(deviceId: string): boolean {
    if (!deviceId || typeof deviceId !== 'string') {
      return false;
    }

    // Validate UUID v4 format specifically
    const uuidV4Pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Pattern.test(deviceId);
  }

  /**
   * Get device fingerprint information for enhanced tracking
   */
  public getDeviceFingerprint(): {
    deviceId: string;
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
  } {
    return {
      deviceId: this.getDeviceId(),
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };
  }
}
