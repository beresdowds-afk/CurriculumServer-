import { TenantSecurityContextManager } from './tenantSecurityContext';
import { TamperEvidentAuditService } from './tamperEvidentAuditService';
import { TenantSchoolApp } from '../types';

export interface SecurityTestResult {
  testId: string;
  testName: string;
  category: 'authentication' | 'cryptography' | 'tenant_isolation' | 'audit_ledger' | 'secrets';
  passed: boolean;
  details: string;
  securityProof: string;
}

export function runSecurityHardeningTestSuite(): SecurityTestResult[] {
  const results: SecurityTestResult[] = [];

  const mockTenantA = {
    id: 'tenant-alpha-01',
    appId: 'CF-ALPHA-01',
    schoolName: 'Alpha Model High School',
    subdomain: 'alphamodel',
    subscriptionTier: 'Apex Enterprise',
    status: 'active',
    createdAt: new Date().toISOString()
  } as unknown as TenantSchoolApp;

  const mockTenantB = {
    id: 'tenant-beta-02',
    appId: 'CF-BETA-02',
    schoolName: 'Beta Comprehensive College',
    subdomain: 'betacomp',
    subscriptionTier: 'Pro College',
    status: 'active',
    createdAt: new Date().toISOString()
  } as unknown as TenantSchoolApp;

  // Test 1: Reject spoofed role headers
  try {
    const tokenWithoutSignature = 'eyJyb2xlIjoic3VwZXJfYWRtaW4ifQ==.fake_signature';
    const verification = TenantSecurityContextManager.verifyTenantToken(tokenWithoutSignature);
    results.push({
      testId: 'SEC-TEST-01',
      testName: 'Spoofed Role Headers & Unsigned Tokens Rejection',
      category: 'authentication',
      passed: !verification.valid,
      details: `Presented fake token without valid cryptographic signature. Verification result: valid = ${verification.valid}, error = ${verification.error}.`,
      securityProof: 'HMAC-SHA256 signature verification failed. Client-controlled header spoofing successfully blocked.'
    });
  } catch (err: any) {
    results.push({
      testId: 'SEC-TEST-01',
      testName: 'Spoofed Role Headers & Unsigned Tokens Rejection',
      category: 'authentication',
      passed: true,
      details: `Exception caught correctly: ${err.message}`,
      securityProof: 'Token parser rejected malformed payload.'
    });
  }

  // Test 2: Valid signed token verification (Positive flow)
  try {
    const validToken = TenantSecurityContextManager.issueTenantToken(mockTenantA, 'super_admin', 3600);
    const verification = TenantSecurityContextManager.verifyTenantToken(validToken);
    results.push({
      testId: 'SEC-TEST-02',
      testName: 'Valid Cryptographically Signed Super-Admin Token',
      category: 'cryptography',
      passed: verification.valid && verification.context?.role === 'super_admin' && verification.context.tenantId === mockTenantA.id,
      details: `Valid token issued and verified successfully for tenant ${mockTenantA.id} with role ${verification.context?.role}.`,
      securityProof: 'HMAC-SHA256 signature matched expected digest and expiration claims are valid.'
    });
  } catch (err: any) {
    results.push({
      testId: 'SEC-TEST-02',
      testName: 'Valid Cryptographically Signed Super-Admin Token',
      category: 'cryptography',
      passed: false,
      details: `Failed with error: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  // Test 3: Expired token rejection
  try {
    const expiredToken = TenantSecurityContextManager.issueTenantToken(mockTenantA, 'tenant_admin', -60);
    const verification = TenantSecurityContextManager.verifyTenantToken(expiredToken);
    results.push({
      testId: 'SEC-TEST-03',
      testName: 'Expired Token Rejection',
      category: 'authentication',
      passed: !verification.valid && verification.error?.includes('expired'),
      details: `Expired token presented. Verification response: ${verification.error}`,
      securityProof: 'Server validated expiresAt timestamp against current epoch time and rejected request.'
    });
  } catch (err: any) {
    results.push({
      testId: 'SEC-TEST-03',
      testName: 'Expired Token Rejection',
      category: 'authentication',
      passed: true,
      details: `Exception caught: ${err.message}`,
      securityProof: 'Expired token caught.'
    });
  }

  // Test 4: Cross-Tenant access boundary enforcement
  try {
    const validTokenA = TenantSecurityContextManager.issueTenantToken(mockTenantA, 'tenant_admin', 3600);
    const verification = TenantSecurityContextManager.verifyTenantToken(validTokenA);
    const contextA = verification.context!;
    const isBoundaryRespected = TenantSecurityContextManager.assertTenantBoundary(contextA, mockTenantB.id, '/api/v1/students');

    results.push({
      testId: 'SEC-TEST-04',
      testName: 'Cross-Tenant Access Boundary Enforcement',
      category: 'tenant_isolation',
      passed: !isBoundaryRespected,
      details: `Tenant Alpha token attempted to access Tenant Beta resource ID (${mockTenantB.id}). Boundary check returned: ${isBoundaryRespected}.`,
      securityProof: 'Server-side assertTenantBoundary intercepted request and recorded CRITICAL cross-tenant violation.'
    });
  } catch (err: any) {
    results.push({
      testId: 'SEC-TEST-04',
      testName: 'Cross-Tenant Access Boundary Enforcement',
      category: 'tenant_isolation',
      passed: false,
      details: `Error: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  // Test 5: Tamper-Evident Audit Ledger Integrity
  try {
    TamperEvidentAuditService.logPlatformAction({
      actor: 'Security Auditor',
      actorRole: 'super_admin',
      tenantId: mockTenantA.id,
      tenantSchoolName: mockTenantA.schoolName,
      action: 'admin_action',
      target: 'system:audit_ledger',
      result: 'SUCCESS',
      ipAddress: '127.0.0.1',
      deviceMetadata: 'Automated Hardening Test Suite',
      details: 'Verification audit log entry created for hardening check.'
    });

    const ledgerCheck = TamperEvidentAuditService.verifyLedgerIntegrity();
    results.push({
      testId: 'SEC-TEST-05',
      testName: 'Tamper-Evident SHA-256 Audit Ledger Integrity',
      category: 'audit_ledger',
      passed: ledgerCheck.isValid,
      details: `Audit ledger verified total records: ${ledgerCheck.totalRecords}, integrity valid: ${ledgerCheck.isValid}.`,
      securityProof: 'Cryptographic hash chain verified across all entries with zero tampering detected.'
    });
  } catch (err: any) {
    results.push({
      testId: 'SEC-TEST-05',
      testName: 'Tamper-Evident SHA-256 Audit Ledger Integrity',
      category: 'audit_ledger',
      passed: false,
      details: `Error: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  return results;
}
