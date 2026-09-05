import { get, set, del, keys } from 'idb-keyval';
import { EmergencyRequest } from '../types';

const OFFLINE_QUEUE_PREFIX = 'offline_req_';
const LOCAL_REQUESTS_KEY = 'varahi_local_my_requests';

export interface QueuedOfflineRequest {
  client_local_id: string;
  data: Partial<EmergencyRequest>;
  createdAt: string;
  status: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
  retryCount: number;
}

/**
 * Save request locally in IndexedDB queue when citizen is offline
 */
export async function queueOfflineRequest(requestData: Partial<EmergencyRequest>): Promise<QueuedOfflineRequest> {
  const localId = `LOC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const queuedItem: QueuedOfflineRequest = {
    client_local_id: localId,
    data: {
      ...requestData,
      client_local_id: localId,
      status: 'PENDING',
      is_offline_captured: true,
      created_at: new Date().toISOString()
    },
    createdAt: new Date().toISOString(),
    status: 'PENDING_SYNC',
    retryCount: 0
  };

  // Save to IndexedDB sync queue
  await set(`${OFFLINE_QUEUE_PREFIX}${localId}`, queuedItem);

  // Also append to local my-requests list for citizen visibility
  await saveToLocalHistory(queuedItem.data);

  return queuedItem;
}

/**
 * Retrieve all requests pending synchronization
 */
export async function getPendingSyncRequests(): Promise<QueuedOfflineRequest[]> {
  try {
    const allKeys = await keys();
    const queueKeys = allKeys.filter(k => String(k).startsWith(OFFLINE_QUEUE_PREFIX));
    const pendingList: QueuedOfflineRequest[] = [];

    for (const key of queueKeys) {
      const item = await get<QueuedOfflineRequest>(key);
      if (item && item.status === 'PENDING_SYNC') {
        pendingList.push(item);
      }
    }
    return pendingList;
  } catch (err) {
    console.error('Error fetching offline queue:', err);
    return [];
  }
}

/**
 * Synchronize offline queue with backend API
 */
export async function syncOfflineQueue(apiUrl: string = 'http://localhost:5000'): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingSyncRequests();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  console.log(`[Offline Sync] Found ${pending.length} pending offline request(s). Syncing...`);
  const payload = pending.map(p => ({
    ...p.data,
    client_local_id: p.client_local_id
  }));

  try {
    const res = await fetch(`${apiUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: payload })
    });

    if (res.ok) {
      const result = await res.json();
      for (const item of pending) {
        // Mark as synced and clean up queue
        await del(`${OFFLINE_QUEUE_PREFIX}${item.client_local_id}`);
        // Update local history status
        await updateLocalHistoryStatus(item.client_local_id, 'PRIORITIZED');
      }
      console.log(`[Offline Sync] Successfully synced ${result.synced_count} request(s).`);
      return { synced: result.synced_count || pending.length, failed: 0 };
    } else {
      throw new Error(`Server returned ${res.status}`);
    }
  } catch (err) {
    console.warn('[Offline Sync] Sync failed, requests remain safely queued in IndexedDB:', err);
    return { synced: 0, failed: pending.length };
  }
}

/**
 * Local history management in localStorage/IndexedDB for offline view
 */
export async function getLocalHistory(): Promise<Partial<EmergencyRequest>[]> {
  try {
    const raw = localStorage.getItem(LOCAL_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveToLocalHistory(req: Partial<EmergencyRequest>) {
  const current = await getLocalHistory();
  current.unshift(req);
  localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(current));
}

async function updateLocalHistoryStatus(clientLocalId: string, status: any) {
  const current = await getLocalHistory();
  const found = current.find(r => r.client_local_id === clientLocalId);
  if (found) {
    found.status = status;
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(current));
  }
}
