import { useState, useEffect, useCallback } from 'react';

export interface PwaMutation {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  tenantId?: string;
  appType: 'curriculum_server' | 'curriculum_flow' | 'provisioned_instance';
}

export interface PwaSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingMutationsCount: number;
  syncError: string | null;
  serverVersion: string;
}

class PwaSyncManager {
  private listeners: ((state: PwaSyncState) => void)[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private syncInterval: any = null;
  private state: PwaSyncState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: Date.now(),
    pendingMutationsCount: 0,
    syncError: null,
    serverVersion: '2.4.0-prod'
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnlineStatus(true));
      window.addEventListener('offline', () => this.handleOnlineStatus(false));

      try {
        this.broadcastChannel = new BroadcastChannel('curriculum_pwa_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_STATE_UPDATE') {
            this.state = { ...this.state, ...event.data.state };
            this.notifyListeners();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported in this environment:', e);
      }

      this.loadQueueFromStorage();
      this.startPeriodicSync();
    }
  }

  public getState(): PwaSyncState {
    return { ...this.state };
  }

  public subscribe(listener: (state: PwaSyncState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const currentState = this.getState();
    this.listeners.forEach(l => l(currentState));
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'SYNC_STATE_UPDATE', state: currentState });
      } catch (e) {
        // Ignore cross-frame postMessage restriction
      }
    }
  }

  private handleOnlineStatus(isOnline: boolean) {
    this.state.isOnline = isOnline;
    if (isOnline) {
      this.state.syncError = null;
      this.triggerSync();
    } else {
      this.state.syncError = 'Device is offline. Changes queued locally.';
    }
    this.notifyListeners();
  }

  private loadQueueFromStorage() {
    try {
      const queue = JSON.parse(localStorage.getItem('curriculum_pwa_mutation_queue') || '[]');
      this.state.pendingMutationsCount = queue.length;
    } catch (e) {
      this.state.pendingMutationsCount = 0;
    }
  }

  private saveQueueToStorage(queue: PwaMutation[]) {
    try {
      localStorage.setItem('curriculum_pwa_mutation_queue', JSON.stringify(queue));
      this.state.pendingMutationsCount = queue.length;
    } catch (e) {
      console.error('Failed to persist PWA sync queue:', e);
    }
  }

  public queueMutation(type: string, payload: any, appType: 'curriculum_server' | 'curriculum_flow' | 'provisioned_instance', tenantId?: string) {
    const mutation: PwaMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      tenantId,
      appType
    };

    try {
      const queue: PwaMutation[] = JSON.parse(localStorage.getItem('curriculum_pwa_mutation_queue') || '[]');
      queue.push(mutation);
      this.saveQueueToStorage(queue);
      this.notifyListeners();

      if (this.state.isOnline) {
        this.triggerSync();
      }
    } catch (e) {
      console.error('Failed to queue mutation:', e);
    }
  }

  public async triggerSync(): Promise<void> {
    if (this.state.isSyncing || !this.state.isOnline) return;

    this.state.isSyncing = true;
    this.notifyListeners();

    try {
      const queue: PwaMutation[] = JSON.parse(localStorage.getItem('curriculum_pwa_mutation_queue') || '[]');
      
      if (queue.length > 0) {
        const response = await fetch('/api/v1/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mutations: queue })
        });

        if (!response.ok) {
          throw new Error(`Sync push failed with status ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          localStorage.setItem('curriculum_pwa_mutation_queue', JSON.stringify([]));
          this.state.pendingMutationsCount = 0;
        }
      }

      const statusRes = await fetch(`/api/v1/sync/status?since=${this.state.lastSyncedAt || 0}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.serverVersion) {
          this.state.serverVersion = statusData.serverVersion;
        }
      }

      this.state.lastSyncedAt = Date.now();
      this.state.syncError = null;
    } catch (error: any) {
      console.warn('PWA sync roundtrip warning:', error.message);
      this.state.syncError = 'Sync operational warning: Operating with cached offline state.';
    } finally {
      this.state.isSyncing = false;
      this.notifyListeners();
    }
  }

  private startPeriodicSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        this.triggerSync();
      }
    }, 15000);
  }
}

export const pwaSyncManager = new PwaSyncManager();

export function usePwaSync() {
  const [syncState, setSyncState] = useState<PwaSyncState>(pwaSyncManager.getState());

  useEffect(() => {
    return pwaSyncManager.subscribe(setSyncState);
  }, []);

  const forceSync = useCallback(() => {
    pwaSyncManager.triggerSync();
  }, []);

  const queueAction = useCallback((type: string, payload: any, appType: 'curriculum_server' | 'curriculum_flow' | 'provisioned_instance', tenantId?: string) => {
    pwaSyncManager.queueMutation(type, payload, appType, tenantId);
  }, []);

  return {
    ...syncState,
    forceSync,
    queueAction
  };
}
