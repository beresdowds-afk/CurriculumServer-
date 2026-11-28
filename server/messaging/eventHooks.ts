import type { DatabasePool } from '../db/postgres';
import { createVerifiedTenantPrincipal, type VerifiedTenantPrincipal } from '../db/tenantContext';
import { CmagCommunicationEngine } from './communicationEngine';
import { CmagDeliveryEngine } from './deliveryEngine';
import { currentDeploymentEnvironment } from './providers';

export interface PlatformAlertEvent {
  category: 'platform_security' | 'platform_provisioning' | 'provider_health' | 'platform_operations';
  purpose: string;
  toPhone?: string;
  toEmail?: string;
  channel?: 'sms' | 'whatsapp' | 'email';
  message: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface TenantWorkflowNotificationEvent {
  tenantId: string;
  applicationId?: string;
  applicationInstanceId?: string;
  category: 'attendance' | 'fees' | 'admissions' | 'logistics' | 'academics' | 'emergency';
  purpose: string;
  guardianId?: string;
  studentId?: string;
  recipientType?: 'guardian' | 'staff' | 'student' | 'admin' | 'user';
  recipientId?: string;
  toPhone?: string;
  channel?: 'sms' | 'whatsapp' | 'email';
  templateKey?: string;
  variables?: Record<string, string>;
  message: string;
  classification?: 'transactional' | 'emergency';
  idempotencyKey?: string;
  actorSubject: string;
}

function buildSystemPlatformPrincipal(): VerifiedTenantPrincipal {
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: 'platform-control-plane',
      role: 'super_admin',
      appId: 'curriculum-server-control-plane',
      schoolName: 'Curriculum Server Control Plane',
      subscriptionTier: 'platform',
      status: 'ACTIVE',
      databaseName: '',
      storageNamespace: '',
      issuer: 'CurriculumServer-ControlPlane',
      audience: 'platform-control-plane',
      email: 'cmag-worker@curriculum-server.internal',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 120,
      tokenSignature: 'cmag-internal-hook',
      permissions: ['super_admin']
    }
  });
}

function buildTenantHookPrincipal(tenantId: string, actorSubject: string): VerifiedTenantPrincipal {
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId,
      role: 'tenant_admin',
      appId: 'app_curriculum_flow',
      schoolName: 'School',
      subscriptionTier: 'standard',
      status: 'ACTIVE',
      databaseName: '',
      storageNamespace: '',
      issuer: 'CurriculumServer-ControlPlane',
      audience: tenantId,
      userId: actorSubject,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 120,
      tokenSignature: 'cmag-tenant-hook',
      permissions: []
    }
  });
}

/**
 * Fault-isolated CMAG event hooks.
 * Never throws into core school workflows (attendance, finance, logistics, provisioning):
 * failures are caught cleanly so primary transactions remain reliable.
 */
export class CmagEventHooks {
  private readonly deliveryEngine: CmagDeliveryEngine;
  private readonly communicationEngine: CmagCommunicationEngine;

  constructor(pool: DatabasePool, deliveryEngine?: CmagDeliveryEngine) {
    this.deliveryEngine = deliveryEngine ?? new CmagDeliveryEngine(pool);
    this.communicationEngine = new CmagCommunicationEngine(pool, this.deliveryEngine);
  }

  async emitPlatformOperationalAlert(event: PlatformAlertEvent): Promise<{ queued: boolean; outboxId?: string }> {
    try {
      const channel = event.channel ?? (event.toPhone ? 'sms' : 'email');
      if ((channel === 'sms' || channel === 'whatsapp') && !event.toPhone) return { queued: false };
      if (channel === 'email' && !event.toEmail) return { queued: false };

      const principal = buildSystemPlatformPrincipal();
      const res = await this.deliveryEngine.enqueuePlatformMessage(principal, {
        applicationId: 'platform_control_plane',
        environment: currentDeploymentEnvironment(),
        classification: 'transactional',
        category: event.category,
        purpose: event.purpose,
        idempotencyKey: event.idempotencyKey,
        recipientType: 'admin',
        request: channel === 'email'
          ? { channel: 'email', to: event.toEmail!, subject: `Platform Alert: ${event.purpose}`, text: event.message }
          : channel === 'sms'
            ? { channel: 'sms', to: event.toPhone!, message: event.message }
            : { channel: 'whatsapp', to: event.toPhone!, message: event.message },
        metadata: event.metadata
      });
      return { queued: true, outboxId: res.outboxId };
    } catch {
      return { queued: false };
    }
  }

  async emitTenantWorkflowNotification(
    event: TenantWorkflowNotificationEvent
  ): Promise<{ queued: boolean; outboxId?: string }> {
    try {
      const principal = buildTenantHookPrincipal(event.tenantId, event.actorSubject);
      const res = await this.communicationEngine.sendTargetedMessage(principal, {
        applicationId: event.applicationId || 'app_curriculum_flow',
        applicationInstanceId: event.applicationInstanceId,
        recipientType: event.recipientType ?? (event.guardianId ? 'guardian' : 'user'),
        recipientId: event.recipientId || event.guardianId,
        toPhone: event.toPhone,
        studentId: event.studentId,
        guardianId: event.guardianId,
        channel: event.channel,
        classification: event.classification ?? 'transactional',
        category: event.category,
        purpose: event.purpose,
        templateKey: event.templateKey,
        variables: event.variables,
        message: event.message,
        idempotencyKey: event.idempotencyKey,
        actorSubject: event.actorSubject
      });
      return { queued: true, outboxId: res.outboxId };
    } catch {
      return { queued: false };
    }
  }
}
