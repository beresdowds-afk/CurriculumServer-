import fs from 'fs';
import path from 'path';
import { 
  UniversalInstanceRecord, 
  InstanceGovernanceHierarchy, 
  SchoolStaffAppointment,
  ProvisionerRole 
} from '../src/types/customerOnboarding';
import { TamperEvidentAuditService } from '../src/services/tamperEvidentAuditService';
import { customerOnboardingManager } from './customerOnboardingManager';

const GOVERNANCE_DIR = path.join(process.cwd(), 'data', 'governance');
const HIERARCHY_STORE_FILE = path.join(GOVERNANCE_DIR, 'school_governance_records.json');

export class SchoolGovernanceManager {
  private static instance: SchoolGovernanceManager;
  private hierarchies: Record<string, InstanceGovernanceHierarchy> = {};

  private constructor() {
    this.ensureStorage();
    this.loadPersistence();
  }

  public static getInstance(): SchoolGovernanceManager {
    if (!SchoolGovernanceManager.instance) {
      SchoolGovernanceManager.instance = new SchoolGovernanceManager();
    }
    return SchoolGovernanceManager.instance;
  }

  private ensureStorage(): void {
    if (!fs.existsSync(GOVERNANCE_DIR)) {
      fs.mkdirSync(GOVERNANCE_DIR, { recursive: true, mode: 0o700 });
    }
  }

  private loadPersistence(): void {
    try {
      if (fs.existsSync(HIERARCHY_STORE_FILE)) {
        this.hierarchies = JSON.parse(fs.readFileSync(HIERARCHY_STORE_FILE, 'utf8'));
      }
    } catch (e) {
      this.hierarchies = {};
    }
  }

  private savePersistence(): void {
    try {
      this.ensureStorage();
      fs.writeFileSync(HIERARCHY_STORE_FILE, JSON.stringify(this.hierarchies, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save governance hierarchies:', e);
    }
  }

  /**
   * Initializes or returns the governance hierarchy for a provisioned school instance
   */
  public getOrCreateHierarchy(instanceId: string, initialData?: Partial<InstanceGovernanceHierarchy>): InstanceGovernanceHierarchy {
    if (this.hierarchies[instanceId]) {
      return this.hierarchies[instanceId];
    }

    const instanceRecord = customerOnboardingManager.getInstanceById(instanceId);
    const org = instanceRecord?.organization;

    const provisionerRole = initialData?.provisionedByRole || 
      (org?.provisionerRole === 'principal' ? 'principal' : 'proprietor');
    const provisionerName = initialData?.provisionerName || org?.contactPersonName || 'School Authority';
    const provisionerEmail = initialData?.provisionerEmail || org?.contactEmail || 'admin@school.sch.ng';

    const isDual = initialData?.principal?.isAlsoIctTechnician ?? 
      Boolean(org?.isPrincipalAlsoIctTechnician);

    const hierarchy: InstanceGovernanceHierarchy = {
      provisionedByRole: provisionerRole,
      provisionerName,
      provisionerEmail,
      proprietor: provisionerRole === 'proprietor' ? {
        name: org?.proprietorName || provisionerName,
        email: org?.proprietorEmail || provisionerEmail,
        phone: org?.proprietorPhone || org?.contactPhone
      } : (initialData?.proprietor || undefined),
      principal: {
        name: org?.principalName || (provisionerRole === 'principal' ? provisionerName : 'Dr. (Mrs.) A. O. Adeleke'),
        email: org?.principalEmail || (provisionerRole === 'principal' ? provisionerEmail : 'principal@school.sch.ng'),
        phone: org?.principalPhone || org?.contactPhone,
        appointedBy: provisionerRole === 'proprietor' ? 'proprietor' : 'self_provisioned',
        appointedAt: new Date().toISOString(),
        isAlsoIctTechnician: isDual
      },
      ictTechnician: isDual ? {
        name: org?.principalName || provisionerName,
        email: org?.principalEmail || provisionerEmail,
        appointedBy: provisionerRole === 'proprietor' ? 'proprietor' : 'principal',
        appointedByName: provisionerName,
        appointedAt: new Date().toISOString(),
        isDualRoleWithPrincipal: true
      } : {
        name: org?.ictTechnicianName || 'Engr. Kayode Bello',
        email: org?.ictTechnicianEmail || 'ict@school.sch.ng',
        phone: org?.ictTechnicianPhone,
        appointedBy: provisionerRole === 'proprietor' ? 'proprietor' : 'principal',
        appointedByName: provisionerName,
        appointedAt: new Date().toISOString(),
        isDualRoleWithPrincipal: false
      },
      appointmentHistory: [
        {
          role: 'principal',
          name: org?.principalName || provisionerName,
          email: org?.principalEmail || provisionerEmail,
          appointedByRole: provisionerRole,
          appointedByName: provisionerName,
          appointedAt: new Date().toISOString(),
          isAlsoIctTechnician: isDual,
          status: 'active',
          notes: provisionerRole === 'proprietor' ? 'Appointed by Proprietor upon initial school instance provisioning' : 'Self-provisioned as Academic Principal'
        }
      ]
    };

    this.hierarchies[instanceId] = hierarchy;
    this.savePersistence();
    return hierarchy;
  }

  /**
   * Proprietor Appoints or Reassigns School Principal
   * Enforces: "Proprietor is above principal and ICT technician."
   */
  public appointPrincipal(
    instanceId: string, 
    callerRole: string,
    callerName: string,
    principalData: {
      name: string;
      email: string;
      phone?: string;
      isAlsoIctTechnician?: boolean;
      notes?: string;
    }
  ): { success: boolean; hierarchy?: InstanceGovernanceHierarchy; error?: string } {
    // Only Proprietor or SuperAdmin can appoint a Principal
    if (callerRole !== 'proprietor' && callerRole !== 'super_admin') {
      return {
        success: false,
        error: 'PERMISSION_DENIED: Only the School Proprietor is authorized to appoint or assign the School Principal.'
      };
    }

    const hierarchy = this.getOrCreateHierarchy(instanceId);

    // Archive previous principal in appointment history
    if (hierarchy.principal) {
      hierarchy.appointmentHistory.push({
        role: 'principal',
        name: hierarchy.principal.name,
        email: hierarchy.principal.email,
        phone: hierarchy.principal.phone,
        appointedByRole: 'proprietor',
        appointedByName: callerName,
        appointedAt: new Date().toISOString(),
        isAlsoIctTechnician: hierarchy.principal.isAlsoIctTechnician,
        status: 'reassigned',
        notes: `Reassigned on ${new Date().toLocaleDateString()}`
      });
    }

    const isDual = Boolean(principalData.isAlsoIctTechnician);

    hierarchy.principal = {
      name: principalData.name,
      email: principalData.email,
      phone: principalData.phone,
      appointedBy: 'proprietor',
      appointedAt: new Date().toISOString(),
      isAlsoIctTechnician: isDual
    };

    // If principal also holds ICT technician position
    if (isDual) {
      hierarchy.ictTechnician = {
        name: principalData.name,
        email: principalData.email,
        phone: principalData.phone,
        appointedBy: 'proprietor',
        appointedByName: callerName,
        appointedAt: new Date().toISOString(),
        isDualRoleWithPrincipal: true
      };
    }

    hierarchy.appointmentHistory.unshift({
      role: 'principal',
      name: principalData.name,
      email: principalData.email,
      phone: principalData.phone,
      appointedByRole: 'proprietor',
      appointedByName: callerName,
      appointedAt: new Date().toISOString(),
      isAlsoIctTechnician: isDual,
      status: 'active',
      notes: principalData.notes || 'Officially appointed by School Proprietor'
    });

    this.hierarchies[instanceId] = hierarchy;
    this.savePersistence();

    TamperEvidentAuditService.logPlatformAction({
      actor: callerName,
      actorRole: 'proprietor',
      tenantId: `tenant_${instanceId}`,
      action: 'security_profile_applied',
      target: `instance:${instanceId}:principal_appointed`,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `Proprietor ${callerName} appointed Principal ${principalData.name} (${principalData.email}). DualRoleWithICT: ${isDual}`,
      ipAddress: '127.0.0.1'
    });

    return { success: true, hierarchy };
  }

  /**
   * Principal or Proprietor Appoints or Reassigns ICT Technician
   * Enforces: "School principal is above ICT technician."
   */
  public appointIctTechnician(
    instanceId: string,
    callerRole: string,
    callerName: string,
    technicianData: {
      name: string;
      email: string;
      phone?: string;
      isDualRoleWithPrincipal?: boolean;
      notes?: string;
    }
  ): { success: boolean; hierarchy?: InstanceGovernanceHierarchy; error?: string } {
    // Only Principal, Proprietor, or SuperAdmin can appoint an ICT technician
    if (callerRole !== 'principal' && callerRole !== 'proprietor' && callerRole !== 'super_admin') {
      return {
        success: false,
        error: 'PERMISSION_DENIED: Only the School Principal or School Proprietor is authorized to assign or appoint the ICT Technician.'
      };
    }

    const hierarchy = this.getOrCreateHierarchy(instanceId);

    // Archive previous ICT technician
    if (hierarchy.ictTechnician) {
      hierarchy.appointmentHistory.push({
        role: 'ict_technician',
        name: hierarchy.ictTechnician.name,
        email: hierarchy.ictTechnician.email,
        phone: hierarchy.ictTechnician.phone,
        appointedByRole: callerRole as any,
        appointedByName: callerName,
        appointedAt: new Date().toISOString(),
        status: 'reassigned',
        notes: `Reassigned on ${new Date().toLocaleDateString()}`
      });
    }

    const isDual = Boolean(technicianData.isDualRoleWithPrincipal);

    hierarchy.ictTechnician = {
      name: technicianData.name,
      email: technicianData.email,
      phone: technicianData.phone,
      appointedBy: callerRole as any,
      appointedByName: callerName,
      appointedAt: new Date().toISOString(),
      isDualRoleWithPrincipal: isDual
    };

    if (hierarchy.principal) {
      hierarchy.principal.isAlsoIctTechnician = isDual;
    }

    hierarchy.appointmentHistory.unshift({
      role: 'ict_technician',
      name: technicianData.name,
      email: technicianData.email,
      phone: technicianData.phone,
      appointedByRole: callerRole as any,
      appointedByName: callerName,
      appointedAt: new Date().toISOString(),
      isAlsoIctTechnician: isDual,
      status: 'active',
      notes: technicianData.notes || `Appointed by ${callerRole === 'principal' ? 'School Principal' : 'School Proprietor'}`
    });

    this.hierarchies[instanceId] = hierarchy;
    this.savePersistence();

    TamperEvidentAuditService.logPlatformAction({
      actor: callerName,
      actorRole: callerRole,
      tenantId: `tenant_${instanceId}`,
      action: 'security_profile_applied',
      target: `instance:${instanceId}:ict_technician_appointed`,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `${callerRole.toUpperCase()} ${callerName} appointed ICT Technician ${technicianData.name} (${technicianData.email}). DualRole: ${isDual}`,
      ipAddress: '127.0.0.1'
    });

    return { success: true, hierarchy };
  }

  /**
   * Principal Toggles Dual-Role (Holding Principal & ICT Technician positions simultaneously)
   */
  public togglePrincipalDualRole(
    instanceId: string,
    callerRole: string,
    callerName: string,
    enableDualRole: boolean,
    separateTechnicianFallback?: { name: string; email: string; phone?: string }
  ): { success: boolean; hierarchy?: InstanceGovernanceHierarchy; error?: string } {
    if (callerRole !== 'principal' && callerRole !== 'proprietor' && callerRole !== 'super_admin') {
      return {
        success: false,
        error: 'PERMISSION_DENIED: Only the School Principal or School Proprietor can configure dual-role technical governance.'
      };
    }

    const hierarchy = this.getOrCreateHierarchy(instanceId);
    if (!hierarchy.principal) {
      return { success: false, error: 'Cannot toggle dual role: School Principal is not currently assigned.' };
    }

    hierarchy.principal.isAlsoIctTechnician = enableDualRole;

    if (enableDualRole) {
      hierarchy.ictTechnician = {
        name: hierarchy.principal.name,
        email: hierarchy.principal.email,
        phone: hierarchy.principal.phone,
        appointedBy: 'principal',
        appointedByName: hierarchy.principal.name,
        appointedAt: new Date().toISOString(),
        isDualRoleWithPrincipal: true
      };
    } else if (separateTechnicianFallback) {
      hierarchy.ictTechnician = {
        name: separateTechnicianFallback.name,
        email: separateTechnicianFallback.email,
        phone: separateTechnicianFallback.phone,
        appointedBy: 'principal',
        appointedByName: hierarchy.principal.name,
        appointedAt: new Date().toISOString(),
        isDualRoleWithPrincipal: false
      };
    }

    hierarchy.appointmentHistory.unshift({
      role: 'ict_technician',
      name: hierarchy.ictTechnician?.name || hierarchy.principal.name,
      email: hierarchy.ictTechnician?.email || hierarchy.principal.email,
      appointedByRole: 'principal',
      appointedByName: hierarchy.principal.name,
      appointedAt: new Date().toISOString(),
      isAlsoIctTechnician: enableDualRole,
      status: 'active',
      notes: enableDualRole 
        ? 'School Principal assumed dual responsibilities of Principal and ICT Technician' 
        : 'School Principal assigned separate dedicated ICT Technician'
    });

    this.hierarchies[instanceId] = hierarchy;
    this.savePersistence();

    return { success: true, hierarchy };
  }

  /**
   * Provisioning Gatekeeper: Strictly validates whether a user can initiate instance provisioning
   * Enforces: "ICT technician cannot single-handedly make a school instance provisioning."
   */
  public validateProvisioningPermission(role: string): { allowed: boolean; reason?: string } {
    if (role === 'ict_technician' || role === 'ict_system_admin') {
      return {
        allowed: false,
        reason: 'PERMISSION_DENIED: ICT technicians cannot single-handedly make a school instance provisioning. School instance provisioning must be requested by the School Proprietor or School Principal.'
      };
    }

    if (role === 'proprietor' || role === 'principal' || role === 'super_admin') {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `PERMISSION_DENIED: Role '${role}' is unauthorized to provision school instances. Only School Proprietors or School Principals can initiate provisioning.`
    };
  }
}

export const schoolGovernanceManager = SchoolGovernanceManager.getInstance();
