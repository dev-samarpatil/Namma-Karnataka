import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSyncQueue,
  enqueueOperation,
  updateOperation,
  removeOperation,
  clearCompletedOperations,
  getTripSyncStatus,
  processSyncQueue,
} from './offlineSync';

describe('Resilient PWA Offline Synchronization Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('enqueues an operation with stable ID, status pending, and retry count 0', () => {
    const op = enqueueOperation({
      operation_type: 'UPDATE_TRIP',
      trip_id: 'trip-123',
      expected_version: 2,
      idempotency_key: 'idemp-test-key-1',
      payload: { custom_name: 'Mysuru Heritage Expedition' },
    });

    expect(op.operation_id).toMatch(/^sync-op-/);
    expect(op.status).toBe('pending');
    expect(op.retry_count).toBe(0);
    expect(op.idempotency_key).toBe('idemp-test-key-1');

    const queue = getSyncQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].trip_id).toBe('trip-123');
  });

  it('reports correct trip sync status across empty, pending, conflict, and auth states', () => {
    // 1. Empty queue
    expect(getTripSyncStatus('trip-123')).toEqual({
      status: 'synced',
      pendingCount: 0,
      hasConflict: false,
      lastError: undefined,
    });

    // 2. Pending operation
    const op = enqueueOperation({
      operation_type: 'UPDATE_TRIP',
      trip_id: 'trip-123',
      expected_version: 1,
      idempotency_key: 'idemp-2',
      payload: {},
    });

    let status = getTripSyncStatus('trip-123');
    expect(status.status).toBe('pending');
    expect(status.pendingCount).toBe(1);
    expect(status.hasConflict).toBe(false);

    // 3. Mark as conflict (OCC 409)
    updateOperation(op.operation_id, {
      status: 'conflict',
      last_error: 'TRIP_VERSION_CONFLICT: Another collaborator modified this trip',
    });

    status = getTripSyncStatus('trip-123');
    expect(status.status).toBe('conflict');
    expect(status.hasConflict).toBe(true);
    expect(status.lastError).toContain('TRIP_VERSION_CONFLICT');

    // 4. Mark as synced
    updateOperation(op.operation_id, { status: 'synced' });
    status = getTripSyncStatus('trip-123');
    expect(status.status).toBe('synced');
    expect(status.pendingCount).toBe(0);
  });

  it('clears completed synced operations while preserving pending ones', () => {
    const op1 = enqueueOperation({
      operation_type: 'UPDATE_TRIP',
      trip_id: 'trip-1',
      expected_version: 1,
      idempotency_key: 'key-1',
      payload: {},
    });

    const op2 = enqueueOperation({
      operation_type: 'UPDATE_TRIP',
      trip_id: 'trip-2',
      expected_version: 1,
      idempotency_key: 'key-2',
      payload: {},
    });

    updateOperation(op1.operation_id, { status: 'synced' });

    clearCompletedOperations();
    const remaining = getSyncQueue();
    expect(remaining.length).toBe(1);
    expect(remaining[0].operation_id).toBe(op2.operation_id);
    expect(remaining[0].status).toBe('pending');
  });

  it('processes queue successfully and sends Idempotency-Key headers', async () => {
    enqueueOperation({
      operation_type: 'UPDATE_TRIP',
      trip_id: 'trip-abc',
      expected_version: 4,
      idempotency_key: 'idemp-replay-safe-999',
      payload: { custom_name: 'Coorg Coffee Trails' },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    globalThis.fetch = mockFetch;

    const result = await processSyncQueue('mock-bearer-token');

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.conflicts).toBe(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toContain('/trips/trip-abc');
    expect(callArgs[1].headers['Idempotency-Key']).toBe('idemp-replay-safe-999');
    expect(callArgs[1].headers['Authorization']).toBe('Bearer mock-bearer-token');

    const queue = getSyncQueue();
    expect(queue[0].status).toBe('synced');
  });

  it('handles HTTP 409 conflict gracefully without throwing or erasing pending work', async () => {
    enqueueOperation({
      operation_type: 'UPDATE_TRIP',
      trip_id: 'trip-conflict',
      expected_version: 1,
      idempotency_key: 'idemp-conflict-1',
      payload: {},
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => 'Version conflict',
    });

    const result = await processSyncQueue('mock-bearer-token');

    expect(result.conflicts).toBe(1);
    expect(result.succeeded).toBe(0);

    const queue = getSyncQueue();
    expect(queue[0].status).toBe('conflict');
    expect(queue[0].last_error).toContain('TRIP_VERSION_CONFLICT');
  });

  it('handles temporary network disconnection with retry count increments', async () => {
    enqueueOperation({
      operation_type: 'UPDATE_TRIP',
      trip_id: 'trip-offline',
      expected_version: 2,
      idempotency_key: 'idemp-net-fail',
      payload: {},
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (offline)'));

    const result = await processSyncQueue('mock-bearer-token');

    expect(result.errors).toBe(1);
    const queue = getSyncQueue();
    expect(queue[0].status).toBe('failed_retryable');
    expect(queue[0].retry_count).toBe(1);
    expect(queue[0].last_error).toContain('Failed to fetch');
  });

  it('removes a specific operation when discarded by the user', () => {
    const op = enqueueOperation({
      operation_type: 'UPDATE_TRIP',
      trip_id: 'trip-del',
      expected_version: 1,
      idempotency_key: 'key-del',
      payload: {},
    });

    expect(getSyncQueue().length).toBe(1);
    removeOperation(op.operation_id);
    expect(getSyncQueue().length).toBe(0);
  });
});
