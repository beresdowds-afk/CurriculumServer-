import { createHash } from 'node:crypto';
import type { TenantProvisioningContract } from './tenantDatabaseProvisioner';

export type PiamVerificationStatus =
  | 'verified'
  | 'unavailable'
  | 'pending'
  | 'rejected'
  | 'expired'
  | 'revoked'
  | 'reused'
  | 'invalid';

export const PIAM_VERIFICATION_STATUSES: readonly PiamVerificationStatus[] = [
  'verified', 'unavailable', 'pending', 'rejected', 'expired', 'revoked', 'reused', 'invalid'
];

export interface PiamVerificationRequest {
  approvalId: string;
  contractHash: string;
  contract: TenantProvisioningContract;
  operation: 'tenant_database_storage_provisioning';
}

export interface PiamVerificationResult {
  status: PiamVerificationStatus;
  verifier?: string;
  approvalId?: string;
  contractHash?: string;
  tenantId?: string;
  applicationInstanceId?: string;
  operation?: PiamVerificationRequest['operation'];
  targetProjectId?: string | null;
  approverIdentity?: string;
  authenticationAssurance?: 'mfa_verified';
  requesterApproverSeparated?: boolean;
  consumed?: boolean;
  evidenceReference?: string;
  evidenceHash?: string;
  reason?: string;
}

export interface PiamVerificationAdapter {
  verifyAndConsume(request: PiamVerificationRequest): Promise<PiamVerificationResult>;
}

export class UnavailablePiamVerificationAdapter implements PiamVerificationAdapter {
  async verifyAndConsume(_request: PiamVerificationRequest): Promise<PiamVerificationResult> {
    return { status: 'unavailable', verifier: 'unconfigured', reason: 'PIAM_UNAVAILABLE' };
  }
}

export function hashProvisioningContract(contract: TenantProvisioningContract): string {
  return createHash('sha256').update(JSON.stringify(contract), 'utf8').digest('hex');
}

export function assertPiamApprovalMatchesContract(
  request: PiamVerificationRequest,
  result: PiamVerificationResult | null | undefined
): void {
  if (!result || typeof result !== 'object' ||
      !PIAM_VERIFICATION_STATUSES.includes(result.status)) {
    throw new Error('PIAM_APPROVAL_INVALID');
  }
  const contract = request.contract;
  if (result.status !== 'verified' ||
      result.approvalId !== request.approvalId ||
      result.contractHash !== request.contractHash ||
      result.tenantId !== contract.tenantId ||
      result.applicationInstanceId !== contract.applicationInstanceId ||
      result.operation !== request.operation ||
      result.targetProjectId !== (contract.customerProjectId ?? null) ||
      !result.approverIdentity?.trim() ||
      result.authenticationAssurance !== 'mfa_verified' ||
      result.requesterApproverSeparated !== true ||
      result.consumed !== true ||
      !result.evidenceReference?.trim() ||
      result.evidenceReference.length > 256 ||
      !/^[A-Za-z0-9._:/-]+$/.test(result.evidenceReference) ||
      !/^[0-9a-f]{64}$/.test(result.evidenceHash || '')) {
    throw new Error(result.status === 'unavailable'
      ? 'PIAM_UNAVAILABLE'
      : `PIAM_APPROVAL_${(result.status || 'invalid').toUpperCase()}`);
  }
}
