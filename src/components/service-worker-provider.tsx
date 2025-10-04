"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ServiceWorkerManager } from '@/lib/service-worker';

interface ServiceWorkerContextType {
  isReady: boolean;
  isSupported: boolean;
  cachePDF: (url: string, blob: Blob) => Promise<void>;
  clearCache: () => Promise<void>;
  getCacheStatus: () => Promise<{
    isSupported: boolean;
    isRegistered: boolean;
    isActive: boolean;
    cacheSize: number;
  }>;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType | null>(null);

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [swManager] = useState(() => ServiceWorkerManager.getInstance());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once
    if (initialized) return;

    const initializeSW = async () => {
      try {
        const registered = await swManager.register();
        setIsSupported(registered);
        
        if (registered) {
          const ready = await swManager.waitForReady();
          setIsReady(ready);
        }
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize service worker:', error);
        setIsSupported(false);
        setIsReady(false);
        setInitialized(true);
      }
    };

    initializeSW();
  }, [swManager, initialized]);

  const contextValue: ServiceWorkerContextType = {
    isReady,
    isSupported,
    cachePDF: swManager.cachePDF.bind(swManager),
    clearCache: swManager.clearCache.bind(swManager),
    getCacheStatus: swManager.getCacheStatus.bind(swManager),
  };

  return (
    <ServiceWorkerContext.Provider value={contextValue}>
      {children}
    </ServiceWorkerContext.Provider>
  );
}

export function useServiceWorker() {
  const context = useContext(ServiceWorkerContext);
  if (!context) {
    throw new Error('useServiceWorker must be used within a ServiceWorkerProvider');
  }
  return context;
}
