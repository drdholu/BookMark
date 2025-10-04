/**
 * Service Worker registration and management utilities
 */

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = false;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * Register the service worker
   */
  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('Service Worker not supported');
      return false;
    }

    // Check if already registered
    if (this.registration) {
      console.log('Service Worker already registered');
      return true;
    }

    try {
      // Check if there's already a registration
      const existingRegistration = await navigator.serviceWorker.getRegistration();
      if (existingRegistration) {
        this.registration = existingRegistration;
        console.log('Service Worker already registered:', this.registration);
        return true;
      }

      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered:', this.registration);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              this.showUpdateNotification();
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered:', result);
      this.registration = null;
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  /**
   * Check if service worker is ready
   */
  async waitForReady(): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      return false;
    }

    try {
      await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      console.error('Service Worker not ready:', error);
      return false;
    }
  }

  /**
   * Send message to service worker
   */
  async sendMessage(message: Record<string, unknown>): Promise<void> {
    if (!this.registration || !this.registration.active) {
      console.warn('Service Worker not active');
      return;
    }

    try {
      this.registration.active.postMessage(message);
    } catch (error) {
      console.error('Failed to send message to Service Worker:', error);
    }
  }

  /**
   * Cache a PDF for offline access
   */
  async cachePDF(url: string, blob: Blob): Promise<void> {
    await this.sendMessage({
      type: 'CACHE_PDF',
      data: { url, blob }
    });
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    await this.sendMessage({
      type: 'CLEAR_CACHE'
    });
  }

  /**
   * Show update notification to user
   */
  private showUpdateNotification(): void {
    // You can implement a custom notification here
    if (confirm('A new version of BookMarked is available. Would you like to update?')) {
      this.updateServiceWorker();
    }
  }

  /**
   * Update the service worker
   */
  private async updateServiceWorker(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    try {
      // Tell the waiting service worker to skip waiting
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page to use the new service worker
      window.location.reload();
    } catch (error) {
      console.error('Failed to update Service Worker:', error);
    }
  }

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<{
    isSupported: boolean;
    isRegistered: boolean;
    isActive: boolean;
    cacheSize: number;
  }> {
    const isRegistered = !!this.registration;
    const isActive = !!this.registration?.active;
    
    let cacheSize = 0;
    if (isActive) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          cacheSize += requests.length;
        }
      } catch (error) {
        console.error('Failed to get cache size:', error);
      }
    }

    return {
      isSupported: this.isSupported,
      isRegistered,
      isActive,
      cacheSize
    };
  }
}

/**
 * Initialize service worker on app startup
 */
export async function initializeServiceWorker(): Promise<boolean> {
  const swManager = ServiceWorkerManager.getInstance();
  return await swManager.register();
}

/**
 * Hook for React components to use service worker
 */
export function useServiceWorker() {
  const [isReady, setIsReady] = React.useState(false);
  const [swManager] = React.useState(() => ServiceWorkerManager.getInstance());

  React.useEffect(() => {
    const init = async () => {
      const ready = await swManager.waitForReady();
      setIsReady(ready);
    };

    init();
  }, [swManager]);

  return {
    isReady,
    cachePDF: swManager.cachePDF.bind(swManager),
    clearCache: swManager.clearCache.bind(swManager),
    getCacheStatus: swManager.getCacheStatus.bind(swManager)
  };
}

// Import React for the hook
import React from 'react';
