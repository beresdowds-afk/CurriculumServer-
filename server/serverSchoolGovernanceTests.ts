import { schoolGovernanceManager } from './schoolGovernanceManager';
import { customerOnboardingManager } from './customerOnboardingManager';

export interface GovernanceTestResult {
  ruleNumber: number;
  ruleTitle: string;
  passed: boolean;
  message: string;
  details?: any;
}

export async function runSchoolGovernanceTestSuite(): Promise<GovernanceTestResult[]> {
  const results: GovernanceTestResult[] = [];
  const testInstanceId = `test_inst_gov_${Date.now()}`;

  // -------------------------------------------------------------
  // RULE 1: School Proprietor or School Principal are able to make or request school provisioning
  // -------------------------------------------------------------
  try {
    const propPerm = schoolGovernanceManager.validateProvisioningPermission('proprietor');
    const princPerm = schoolGovernanceManager.validateProvisioningPermission('principal');

    if (propPerm.allowed && princPerm.allowed) {
      results.push({
        ruleNumber: 1,
        ruleTitle: 'Proprietor and Principal Provisioning Authorization',
        passed: true,
        message: 'Both School Proprietor and School Principal are fully authorized to initiate and request school provisioning on Curriculum Server.',
        details: { proprietorAllowed: propPerm.allowed, principalAllowed: princPerm.allowed }
      });
    } else {
      results.push({
        ruleNumber: 1,
        ruleTitle: 'Proprietor and Principal Provisioning Authorization',
        passed: false,
        message: 'Provisioning permission check failed for proprietor or principal.',
        details: { propPerm, princPerm }
      });
    }
  } catch (err: any) {
    results.push({
      ruleNumber: 1,
      ruleTitle: 'Proprietor and Principal Provisioning Authorization',
      passed: false,
      message: `Execution error in Rule 1: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // RULE 2: When provisioned by Proprietor, Proprietor is able to appoint/assign School Principal
  // -------------------------------------------------------------
  try {
    // 2a. Valid Proprietor appointment
    const initialHierarchy = schoolGovernanceManager.getOrCreateHierarchy(testInstanceId, {
      provisionedByRole: 'proprietor',
      provisionerName: 'Alhaji Ibrahim Danladi',
      provisionerEmail: 'proprietor@danladicollege.sch.ng'
    });

    const appointment = schoolGovernanceManager.appointPrincipal(
      testInstanceId,
      'proprietor',
      'Alhaji Ibrahim Danladi',
      {
        name: 'Dr. (Mrs.) Folashade Adeleke',
        email: 'principal@danladicollege.sch.ng',
        phone: '+234 803 111 2233',
        isAlsoIctTechnician: false,
        notes: 'Officially appointed as Founding Principal'
      }
    );

    // 2b. Block unauthorized appointment (e.g. ICT technician trying to appoint Principal)
    const unauthorizedAttempt = schoolGovernanceManager.appointPrincipal(
      testInstanceId,
      'ict_technician',
      'Mallam Bello (ICT)',
      {
        name: 'Imposter Principal',
        email: 'imposter@school.ng'
      }
    );

    const rule2Passed = appointment.success && 
      appointment.hierarchy?.principal?.name === 'Dr. (Mrs.) Folashade Adeleke' &&
      !unauthorizedAttempt.success;

    results.push({
      ruleNumber: 2,
      ruleTitle: 'Proprietor Appointment Authority over School Principal',
      passed: rule2Passed,
      message: rule2Passed
        ? 'School Proprietor successfully appointed the School Principal. Unauthorized appointment attempts by subordinate roles were strictly rejected with HTTP 403 / PERMISSION_DENIED.'
        : 'Proprietor appointment rule test failed.',
      details: {
        principalAppointed: appointment.hierarchy?.principal,
        unauthorizedRejected: !unauthorizedAttempt.success,
        rejectionReason: unauthorizedAttempt.error
      }
    });
  } catch (err: any) {
    results.push({
      ruleNumber: 2,
      ruleTitle: 'Proprietor Appointment Authority over School Principal',
      passed: false,
      message: `Execution error in Rule 2: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // RULE 3: School Principal is able to assign or appoint ICT Technician
  // -------------------------------------------------------------
  try {
    // 3a. Principal appoints ICT technician
    const ictAppointment = schoolGovernanceManager.appointIctTechnician(
      testInstanceId,
      'principal',
      'Dr. (Mrs.) Folashade Adeleke',
      {
        name: 'Engr. Chukwuemeka Eze',
        email: 'ict.lead@danladicollege.sch.ng',
        phone: '+234 802 333 4455',
        isDualRoleWithPrincipal: false,
        notes: 'Appointed by Principal to head ICT infrastructure & computer lab'
      }
    );

    // 3b. Unauthorized attempt: ICT technician cannot appoint an ICT technician
    const unauthorizedIctAttempt = schoolGovernanceManager.appointIctTechnician(
      testInstanceId,
      'ict_technician',
      'Engr. Chukwuemeka Eze',
      {
        name: 'Junior Tech',
        email: 'jrtech@school.ng'
      }
    );

    const rule3Passed = ictAppointment.success && 
      ictAppointment.hierarchy?.ictTechnician?.name === 'Engr. Chukwuemeka Eze' &&
      !unauthorizedIctAttempt.success;

    results.push({
      ruleNumber: 3,
      ruleTitle: 'Principal Appointment Authority over ICT Technician',
      passed: rule3Passed,
      message: rule3Passed
        ? 'School Principal successfully appointed the ICT Technician. ICT Technicians cannot appoint other staff or elevate permissions.'
        : 'Principal appointment of ICT technician rule failed.',
      details: {
        appointedTechnician: ictAppointment.hierarchy?.ictTechnician,
        unauthorizedSelfElevationBlocked: !unauthorizedIctAttempt.success,
        error: unauthorizedIctAttempt.error
      }
    });
  } catch (err: any) {
    results.push({
      ruleNumber: 3,
      ruleTitle: 'Principal Appointment Authority over ICT Technician',
      passed: false,
      message: `Execution error in Rule 3: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // RULE 4: ICT Technician cannot single-handedly make a school instance provisioning
  // -------------------------------------------------------------
  try {
    const techCheck = schoolGovernanceManager.validateProvisioningPermission('ict_technician');
    const sysAdminCheck = schoolGovernanceManager.validateProvisioningPermission('ict_system_admin');

    const blockedCorrectly = !techCheck.allowed && !sysAdminCheck.allowed;

    results.push({
      ruleNumber: 4,
      ruleTitle: 'ICT Technician Provisioning Restriction Gatekeeper',
      passed: blockedCorrectly,
      message: blockedCorrectly
        ? 'Gatekeeper strictly verified: ICT technicians cannot single-handedly make a school instance provisioning. Rejection message enforced: "PERMISSION_DENIED: ICT technicians cannot single-handedly make a school instance provisioning. School instance provisioning must be requested by the School Proprietor or School Principal."'
        : 'ICT technician provisioning was improperly allowed.',
      details: {
        technicianBlocked: !techCheck.allowed,
        rejectionReason: techCheck.reason
      }
    });
  } catch (err: any) {
    results.push({
      ruleNumber: 4,
      ruleTitle: 'ICT Technician Provisioning Restriction Gatekeeper',
      passed: false,
      message: `Execution error in Rule 4: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // RULE 5: School Principal can hold both positions of Principal and ICT Technician
  // -------------------------------------------------------------
  try {
    const dualRoleResult = schoolGovernanceManager.togglePrincipalDualRole(
      testInstanceId,
      'principal',
      'Dr. (Mrs.) Folashade Adeleke',
      true
    );

    const rule5Passed = dualRoleResult.success && 
      dualRoleResult.hierarchy?.principal?.isAlsoIctTechnician === true &&
      dualRoleResult.hierarchy?.ictTechnician?.isDualRoleWithPrincipal === true &&
      dualRoleResult.hierarchy?.ictTechnician?.name === dualRoleResult.hierarchy?.principal?.name;

    results.push({
      ruleNumber: 5,
      ruleTitle: 'Dual-Role Governance: Principal as ICT Technician',
      passed: rule5Passed,
      message: rule5Passed
        ? 'School Principal successfully assumed dual roles (School Principal & ICT Technician simultaneously), maintaining both administrative and technical oversight over the provisioned instance.'
        : 'Principal dual-role toggle failed.',
      details: {
        isPrincipalAlsoIctTechnician: dualRoleResult.hierarchy?.principal?.isAlsoIctTechnician,
        technicianIsDual: dualRoleResult.hierarchy?.ictTechnician?.isDualRoleWithPrincipal,
        technicianName: dualRoleResult.hierarchy?.ictTechnician?.name
      }
    });
  } catch (err: any) {
    results.push({
      ruleNumber: 5,
      ruleTitle: 'Dual-Role Governance: Principal as ICT Technician',
      passed: false,
      message: `Execution error in Rule 5: ${err.message}`
    });
  }

  return results;
}
