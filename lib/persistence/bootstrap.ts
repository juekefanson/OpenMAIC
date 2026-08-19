import {
  BrowserKVStore,
  HttpAssetStore,
  HttpDocumentStore,
  type HttpAssetHeadersHook,
  type HttpDocumentHeadersHook,
} from '@openmaic/storage';
import { HttpRuntimeStore, type HttpRuntimeHeadersHook } from '@openmaic/storage/runtime/http';

import {
  assertDocumentStorageConfigurable,
  configureDocumentStorage,
  type DocumentStorageOptions,
} from '@/lib/document-store/config';
import {
  assertAssetPoolStorageConfigurable,
  configureAssetPoolStorage,
  type AssetPoolStorageOptions,
} from '@/lib/media/asset-pool-config';
import { assertRuntimeStorageConfigurable, configureRuntimeStorage } from '@/lib/runtime/config';
import { getLearnerKey } from '@/lib/runtime/learner-key';
import { useAuthStore, type UserRole } from '@/lib/store/auth';

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PERSISTENCE === '1') {
  const deviceKv = new BrowserKVStore();
  let learnerKeyPromise: Promise<string> | undefined;

  // Resolve learner key: use user ID if logged in, otherwise anonymous
  const learnerKey = async (): Promise<string> => {
    const authState = useAuthStore.getState();
    if (authState.userId) {
      return `user:${authState.userId}`;
    }
    // Fall back to anonymous device key
    return (
      (learnerKeyPromise ??= getLearnerKey(deviceKv).catch((error) => {
        learnerKeyPromise = undefined;
        throw error;
      }))
    );
  };

  // Headers hook: include JWT token if logged in
  const headers = async (): Promise<Record<string, string>> => {
    const resolvedLearnerKey = await learnerKey();
    const token = useAuthStore.getState().token;
    return {
      'x-learner-key': resolvedLearnerKey,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  };

  const runtimeOptions = {
    store: () =>
      new HttpRuntimeStore({
        baseUrl: '/api/persistence',
        headers: headers satisfies HttpRuntimeHeadersHook,
      }),
    learnerKey,
  };
  const documentOptions: DocumentStorageOptions = {
    store: ({ validateScene, validateStage }) =>
      new HttpDocumentStore({
        baseUrl: '/api/persistence',
        headers: headers satisfies HttpDocumentHeadersHook,
        validateScene,
        validateStage,
      }),
  };
  const assetOptions: AssetPoolStorageOptions = {
    store: () =>
      new HttpAssetStore({
        baseUrl: '/api/persistence',
        headers: headers satisfies HttpAssetHeadersHook,
      }),
    serverBacked: true,
  };

  try {
    // All checks are mutation-free. Once they pass, the synchronous configure
    // calls cannot leave only a subset of the persistence seams configured.
    assertRuntimeStorageConfigurable();
    assertDocumentStorageConfigurable();
    assertAssetPoolStorageConfigurable();
    configureRuntimeStorage(runtimeOptions);
    configureDocumentStorage(documentOptions);
    configureAssetPoolStorage(assetOptions);
  } catch (error) {
    console.error(
      'FATAL: server-backed persistence bootstrap failed; no storage seam changes were applied',
      error,
    );
  }
}
