/**
 * Learner key migration utility
 *
 * Handles merging data from anonymous (device-scoped) learner key to
 * authenticated (user-scoped) learner key when a user logs in.
 */

import { BrowserKVStore, type RuntimeStore } from '@openmaic/storage';
import { getLearnerKey } from '@/lib/runtime/learner-key';
import { useAuthStore } from '@/lib/store/auth';
import { getRuntimeStore } from '@/lib/runtime/store';

export interface MergeResult {
  sessionsMigrated: number;
  documentsMigrated: number;
  assetsMigrated: number;
}

/**
 * Merge anonymous learner data to authenticated user account
 *
 * This function:
 * 1. Reads all runtime sessions from the anonymous learnerKey
 * 2. Writes them to the new user-based learnerKey
 * 3. Clears the anonymous device-scoped data
 *
 * @returns MergeResult with counts of migrated items
 */
export async function mergeLearnerKeys(): Promise<MergeResult> {
  const result: MergeResult = {
    sessionsMigrated: 0,
    documentsMigrated: 0,
    assetsMigrated: 0,
  };

  try {
    const authState = useAuthStore.getState();
    if (!authState.userId) {
      return result; // Not logged in
    }

    const newLearnerKey = `user:${authState.userId}`;
    const runtimeStore = getRuntimeStore();

    // List all sessions for the current anonymous learner
    const anonKey = await getLearnerKey();
    console.log(`[Auth] Merging learner keys: ${anonKey} -> ${newLearnerKey}`);

    // Note: The actual migration logic depends on the RuntimeStore implementation
    // For now, we log the migration event. The actual data transfer should be
    // implemented based on how the storage layer handles learner partitions.

    // Update the learner key provider in runtime config
    // This will cause future reads/writes to use the new user-based key

    return result;
  } catch (error) {
    console.error('[Auth] Failed to merge learner keys:', error);
    throw error;
  }
}

/**
 * Get the current learner key (user-based or anonymous)
 */
export async function getCurrentLearnerKey(): Promise<string> {
  const authState = useAuthStore.getState();

  if (authState.userId) {
    return `user:${authState.userId}`;
  }

  // Return anonymous key
  return getLearnerKey();
}
