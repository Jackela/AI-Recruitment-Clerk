import { Injectable, signal } from '@angular/core';

export interface ConnectionStatus {
  isOffline: boolean;
  lastChecked: Date | null;
  backendAvailable: boolean;
  errorMessage: string | null;
}

/**
 * Service to detect backend connection status.
 * IMPORTANT: This project requires backend services for AI analysis.
 * When offline, operations should be blocked with clear error messages.
 */
@Injectable({
  providedIn: 'root',
})
export class ConnectionService {
  private readonly connectionStatus = signal<ConnectionStatus>({
    isOffline: false,
    lastChecked: null,
    backendAvailable: true,
    errorMessage: null,
  });

  private readonly isChecking = signal<boolean>(false);

  /**
   * Gets the current connection status as a readonly signal.
   */
  public getConnectionStatus() {
    return this.connectionStatus.asReadonly();
  }

  /**
   * Checks if backend is currently being checked.
   */
  public getIsChecking() {
    return this.isChecking.asReadonly();
  }

  /**
   * Checks if backend connection is available.
   * @returns Promise<boolean> - True if backend is available
   */
  public async checkBackendConnection(): Promise<boolean> {
    if (this.isChecking()) {
      return this.connectionStatus().backendAvailable;
    }

    this.isChecking.set(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);

      const isAvailable = response.ok;
      this.connectionStatus.set({
        isOffline: !isAvailable,
        lastChecked: new Date(),
        backendAvailable: isAvailable,
        errorMessage: isAvailable ? null : '无法连接到后端服务',
      });

      return isAvailable;
    } catch (error) {
      this.connectionStatus.set({
        isOffline: true,
        lastChecked: new Date(),
        backendAvailable: false,
        errorMessage: '后端服务不可用，请检查网络连接或服务状态',
      });
      return false;
    } finally {
      this.isChecking.set(false);
    }
  }

  /**
   * Gets offline status.
   */
  public isOffline(): boolean {
    return this.connectionStatus().isOffline;
  }

  /**
   * Retry connection check.
   */
  public async retryConnection(): Promise<boolean> {
    this.connectionStatus.set({
      isOffline: false,
      lastChecked: null,
      backendAvailable: true,
      errorMessage: null,
    });
    return this.checkBackendConnection();
  }

  /**
   * Asserts that backend is available, throws error if not.
   * Use this before operations that require backend.
   */
  public assertBackendAvailable(): void {
    if (this.connectionStatus().isOffline) {
      throw new Error(this.connectionStatus().errorMessage || '后端服务不可用');
    }
  }
}
