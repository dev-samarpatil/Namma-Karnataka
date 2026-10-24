/**
 * Resilient PWA Offline Synchronization Service
 *
 * Manages an offline mutation queue for authenticated and shared itinerary updates.
 * Guarantees idempotency, preserves user work during connection drops, and detects
 * version conflicts (HTTP 409) under optimistic concurrency control without silent overwrites.
 *
 * Guest trips stay strictly local in browser localStorage and are NEVER silently uploaded.
 */

import { SyncOperation, SyncOperationStatus } from '../types';
import { getApiBaseUrl } from '../lib/api';

const SYNC_QUEUE_KEY = 'nk_sync_queue_v1';

export function getSyncQueue(): SyncOperation[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSyncQueue(queue: SyncOperation[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Gracefully handle storage quota limit
  }
}

export function enqueueOperation(
  params: Omit<SyncOperation, 'operation_id' | 'created_at' | 'retry_count' | 'status'>
): SyncOperation {
  const queue = getSyncQueue();
  const operation: SyncOperation = {
    ...params,
    operation_id: `sync-op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    created_at: new Date().toISOString(),
    retry_count: 0,
    status: 'pending',
  };

  queue.push(operation);
  saveSyncQueue(queue);

  // Attempt background sync registration if available
  registerBackgroundSync();

  return operation;
}

export function updateOperation(opId: string, updates: Partial<SyncOperation>): void {
  const queue = getSyncQueue();
  const idx = queue.findIndex((op) => op.operation_id === opId);
  if (idx !== -1) {
    queue[idx] = { ...queue[idx], ...updates, last_attempt_at: new Date().toISOString() };
    saveSyncQueue(queue);
  }
}

export function removeOperation(opId: string): void {
  const queue = getSyncQueue();
  const filtered = queue.filter((op) => op.operation_id !== opId);
  saveSyncQueue(filtered);
}

export function clearCompletedOperations(): void {
  const queue = getSyncQueue();
  const remaining = queue.filter((op) => op.status !== 'synced');
  saveSyncQueue(remaining);
}

export async function processSyncQueue(authToken?: string): Promise<{
  processed: number;
  succeeded: number;
  conflicts: number;
  errors: number;
}> {
  const queue = getSyncQueue();
  const eligible = queue.filter(
    (op) =>
      op.status === 'pending' ||
      op.status === 'failed_retryable' ||
      op.status === 'syncing'
  );

  let succeeded = 0;
  let conflicts = 0;
  let errors = 0;

  for (const op of eligible) {
    updateOperation(op.operation_id, { status: 'syncing' });

    try {
      const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
      let endpoint = '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': op.idempotency_key,
      };

      if (op.operation_type === 'UPDATE_SHARED_TRIP') {
        if (!op.share_token) {
          updateOperation(op.operation_id, {
            status: 'failed_permanent',
            last_error: 'Missing share token for shared trip update',
          });
          errors++;
          continue;
        }
        endpoint = `${baseUrl}/trips/shared/${encodeURIComponent(op.share_token)}`;
      } else {
        // Authenticated owner trip update
        if (!authToken) {
          updateOperation(op.operation_id, {
            status: 'needs_auth',
            last_error: 'Authentication required to synchronize cloud trip',
          });
          errors++;
          continue;
        }
        headers['Authorization'] = `Bearer ${authToken}`;
        endpoint = `${baseUrl}/trips/${encodeURIComponent(op.trip_id)}`;
      }

      // Merge expected_version and idempotency_key into payload
      const bodyPayload = {
        ...op.payload,
        expected_version: op.expected_version,
        idempotency_key: op.idempotency_key,
      };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (response.ok) {
        updateOperation(op.operation_id, {
          status: 'synced',
          last_error: undefined,
        });
        succeeded++;
      } else if (response.status === 409) {
        updateOperation(op.operation_id, {
          status: 'conflict',
          last_error: 'TRIP_VERSION_CONFLICT: Another collaborator has updated this trip.',
        });
        conflicts++;
      } else if (response.status === 401) {
        updateOperation(op.operation_id, {
          status: 'needs_auth',
          last_error: 'Session expired. Please log in to complete synchronization.',
        });
        errors++;
      } else if (response.status === 403) {
        updateOperation(op.operation_id, {
          status: 'failed_permanent',
          last_error: 'SHARE_REVOKED: This share link has been revoked or expired.',
        });
        errors++;
      } else {
        const errText = await response.text();
        updateOperation(op.operation_id, {
          status: 'failed_retryable',
          retry_count: op.retry_count + 1,
          last_error: `Server responded with status ${response.status}: ${errText}`,
        });
        errors++;
      }
    } catch (networkErr: any) {
      updateOperation(op.operation_id, {
        status: 'failed_retryable',
        retry_count: op.retry_count + 1,
        last_error: networkErr?.message || 'Network communication failure',
      });
      errors++;
    }
  }

  return { processed: eligible.length, succeeded, conflicts, errors };
}

export async function registerBackgroundSync(): Promise<boolean> {
  try {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'SyncManager' in window
    ) {
      const reg = await navigator.serviceWorker.ready;
      if ('sync' in reg) {
        await (reg as any).sync.register('nk-itinerary-sync');
        return true;
      }
    }
  } catch {
    // Background sync not supported or permission denied in this context
  }
  return false;
}

export function getTripSyncStatus(tripId?: string | null): {
  status: SyncOperationStatus | 'synced';
  pendingCount: number;
  hasConflict: boolean;
  lastError?: string;
} {
  const queue = getSyncQueue();
  const relevant = tripId ? queue.filter((op) => op.trip_id === tripId) : queue;
  if (relevant.length === 0) {
    return { status: 'synced', pendingCount: 0, hasConflict: false };
  }
  const hasConflict = relevant.some((op) => op.status === 'conflict');
  const needsAuth = relevant.some((op) => op.status === 'needs_auth');
  const isSyncing = relevant.some((op) => op.status === 'syncing');
  const isPending = relevant.some((op) => op.status === 'pending' || op.status === 'failed_retryable');

  let overallStatus: SyncOperationStatus | 'synced' = 'synced';
  if (hasConflict) overallStatus = 'conflict';
  else if (needsAuth) overallStatus = 'needs_auth';
  else if (isSyncing) overallStatus = 'syncing';
  else if (isPending) overallStatus = 'pending';

  const lastFailed = relevant.slice().reverse().find((op) => op.last_error);

  return {
    status: overallStatus,
    pendingCount: relevant.filter((op) => op.status !== 'synced').length,
    hasConflict,
    lastError: lastFailed?.last_error,
  };
}
