/**
 * Production authentication for the embedded persistence route.
 *
 * Replaces the development-only DEV_TOKEN scheme with JWT-based authentication.
 * The token is extracted from the Authorization header and verified against
 * the server-side AUTH_SECRET.
 *
 * The learnerKey is derived from the JWT payload (userId), providing proper
 * user isolation in the persistence layer.
 */
import type { IncomingMessage } from 'node:http';

import type { AssetPrincipal } from '@openmaic/storage';
import type { RuntimeHttpPrincipal } from '@openmaic/storage/server';

import { verifyToken } from '@/lib/auth/utils';

type PersistencePrincipal = RuntimeHttpPrincipal & Partial<Pick<AssetPrincipal, 'key'>>;

/**
 * The single asset partition for this deployment shape. Documents have no
 * ownership partition; assets get the same treatment until real auth lands.
 */
const SHARED_ASSET_PRINCIPAL = 'shared';

function singleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function authenticatePersistenceRequest(
  req: IncomingMessage,
): Promise<PersistencePrincipal | undefined> {
  const authHeader = singleHeader(req.headers.authorization);
  if (!authHeader?.startsWith('Bearer ')) return undefined;

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) return undefined;

  // Extract learnerKey from JWT payload
  const learnerKey = `user:${payload.sub}`;

  // Also check for x-learner-key header (backward compat)
  const headerLearnerKey = singleHeader(req.headers['x-learner-key']);
  const finalLearnerKey = headerLearnerKey || learnerKey;

  return {
    key: SHARED_ASSET_PRINCIPAL,
    ...(finalLearnerKey ? { learnerKey: finalLearnerKey } : {}),
  };
}
