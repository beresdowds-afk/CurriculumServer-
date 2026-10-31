import { TenantSecurityContextManager } from './tenantSecurityContext';

export function getSuperAdminAuthHeader(): Record<string, string> {
  const adminTenant: any = {
    id: 'platform-control-plane',
    appId: 'CF-CONTROL-PLANE-001',
    schoolName: 'Curriculum Server Control Plane',
    subscriptionTier: 'Apex Enterprise',
    status: 'active'
  };
  const token = TenantSecurityContextManager.issueTenantToken(adminTenant, 'super_admin', 86400);
  return {
    'Authorization': `Bearer ${token}`
  };
}
