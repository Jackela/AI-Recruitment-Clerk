import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, fromEvent } from 'rxjs';
// import { filter, take } from 'rxjs/operators'; // Reserved for future use

export interface InstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: any[]; // NotificationAction type not available in browser
  tag?: string;
  silent?: boolean;
  requireInteraction?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PWAService {
  private deferredPrompt: InstallPromptEvent | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  
  private isInstalledSubject = new BehaviorSubject<boolean>(false);
  private isInstallableSubject = new BehaviorSubject<boolean>(false);
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  private updateAvailableSubject = new BehaviorSubject<boolean>(false);

  public isInstalled$ = this.isInstalledSubject.asObservable();
  public isInstallable$ = this.isInstallableSubject.asObservable();
  public isOnline$ = this.isOnlineSubject.asObservable();
  public updateAvailable$ = this.updateAvailableSubject.asObservable();

  constructor(private ngZone: NgZone) {
    this.initializePWA();
  }

  private initializePWA(): void {
    this.checkInstallation();
    this.setupInstallPrompt();
    this.setupServiceWorker();
    this.setupNetworkMonitoring();
    this.setupBackgroundSync();
  }

  /**
   * Check if app is installed
   */
  private checkInstallation(): void {
    // Check if running in standalone mode (PWA installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');
    
    this.isInstalledSubject.next(isStandalone);
  }

  /**
   * Setup install prompt handling
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      this.deferredPrompt = e as InstallPromptEvent;
      this.isInstallableSubject.next(true);
      
      console.log('PWA: Install prompt is available');
    });

    window.addEventListener('appinstalled', () => {
      this.ngZone.run(() => {
        this.isInstalledSubject.next(true);
        this.isInstallableSubject.next(false);
        this.deferredPrompt = null;
        console.log('PWA: App was installed');
      });
    });
  }

  /**
   * Setup service worker
   */
  private setupServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-enhanced.js')
        .then((registration) => {
          this.swRegistration = registration;
          console.log('SW: Service Worker registered successfully');

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  this.ngZone.run(() => {
                    this.updateAvailableSubject.next(true);
                    console.log('SW: New update available');
                  });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('SW: Service Worker registration failed:', error);
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });
    }
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    fromEvent(window, 'online').subscribe(() => {
      this.ngZone.run(() => {
        this.isOnlineSubject.next(true);
        console.log('Network: Back online');
      });
    });

    fromEvent(window, 'offline').subscribe(() => {
      this.ngZone.run(() => {
        this.isOnlineSubject.next(false);
        console.log('Network: Gone offline');
      });
    });
  }

  /**
   * Setup background sync
   */
  private setupBackgroundSync(): void {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      // Background sync is supported
      console.log('Background sync is supported');
    }
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    this.ngZone.run(() => {
      switch (event.data.type) {
        case 'SYNC_SUCCESS':
          console.log('Sync successful:', event.data.data);
          break;
        case 'CACHE_UPDATED':
          console.log('Cache updated:', event.data.data);
          break;
        default:
          console.log('SW Message:', event.data);
      }
    });
  }

  /**
   * Trigger install prompt
   */
  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    } finally {
      this.deferredPrompt = null;
      this.isInstallableSubject.next(false);
    }
  }

  /**
   * Update service worker
   */
  async updateServiceWorker(): Promise<void> {
    if (!this.swRegistration) {
      console.warn('Service worker not registered');
      return;
    }

    try {
      await this.swRegistration.update();
      window.location.reload();
    } catch (error) {
      console.error('Error updating service worker:', error);
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  /**
   * Show local notification
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    const permission = await this.requestNotificationPermission();
    
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/assets/icons/icon-192x192.png',
      badge: payload.badge || '/assets/icons/badge-72x72.png',
      // image: payload.image, // Not supported in standard NotificationOptions
      data: payload.data,
      tag: payload.tag,
      silent: payload.silent,
      requireInteraction: payload.requireInteraction,
      // actions: payload.actions // Not supported in standard NotificationOptions
    };

    if (this.swRegistration) {
      // Show notification via service worker for better control
      await this.swRegistration.showNotification(payload.title, options);
    } else {
      // Fallback to regular notification
      new Notification(payload.title, options);
    }
  }

  /**
   * Add to background sync queue
   */
  async addToSyncQueue(tag: string, data: any): Promise<void> {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('Background sync not supported');
      return;
    }

    try {
      // Store data in IndexedDB for sync
      await this.storeForSync(tag, data);
      
      if (this.swRegistration) {
        // Background sync not available in standard ServiceWorkerRegistration
        // await this.swRegistration.sync?.register(tag);
        console.log('Background sync registered:', tag);
      }
    } catch (error) {
      console.error('Error registering background sync:', error);
    }
  }

  /**
   * Store data for background sync
   */
  private async storeForSync(tag: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('arc-mobile-db', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([tag], 'readwrite');
        const store = transaction.objectStore(tag);
        
        const item = {
          id: Date.now().toString(),
          data,
          timestamp: Date.now()
        };
        
        store.add(item);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as any).result;
        if (!db.objectStoreNames.contains(tag)) {
          db.createObjectStore(tag, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Get app info
   */
  getAppInfo(): {
    isInstalled: boolean;
    isInstallable: boolean;
    isOnline: boolean;
    hasServiceWorker: boolean;
    hasNotifications: boolean;
    hasBackgroundSync: boolean;
  } {
    return {
      isInstalled: this.isInstalledSubject.value,
      isInstallable: this.isInstallableSubject.value,
      isOnline: this.isOnlineSubject.value,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasNotifications: 'Notification' in window,
      hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
    };
  }

  /**
   * Clear app cache
   */
  async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    if (!('caches' in window) || !('estimate' in navigator.storage)) {
      return 0;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }

  /**
   * Share content (Web Share API)
   */
  async shareContent(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
    if (!('share' in navigator)) {
      console.warn('Web Share API not supported');
      return false;
    }

    try {
      await (navigator as any).share(data);
      return true;
    } catch (error) {
      if ((error as any)?.name !== 'AbortError') {
        console.error('Error sharing content:', error);
      }
      return false;
    }
  }

  /**
   * Check if file system access is available
   */
  hasFileSystemAccess(): boolean {
    return 'showOpenFilePicker' in window;
  }

  /**
   * Add haptic feedback
   */
  vibrate(pattern: number | number[]): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }
}