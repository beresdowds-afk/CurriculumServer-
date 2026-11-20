import { DEFAULT_ASSESSMENT_COMPONENTS } from '../../packages/shared-types/src/academicRecords';

export const ACADEMIC_RECORDS_FEATURE_TEMPLATE = {
  templateId: 'academic-records-results',
  templateVersion: '0.1.0',
  featureId: 'feat_results_processing',
  applicationId: 'app_curriculum_flow',
  status: 'draft',
  provisionable: false,
  defaultAssessmentComponents: DEFAULT_ASSESSMENT_COMPONENTS,
  manualScorePolicy: {
    teacherAssignmentRequired: true,
    taughtOnlyAuthorizationRequired: true,
    principalOrSupervisorApprovalRequired: true
  },
  provisioningRequirements: [
    'tenant_scoped_historical_enrollment_and_assessment_records',
    'teacher_assignment_and_taught_scope_validation_on_the_server',
    'manual_score_capture_with_principal_or_supervisor_approval',
    'immutable_score_approval_and_publication_audit_history',
    'authoritative_broadsheet_report_transcript_and_verification',
    'configurable_promotion_policy_and_approval_history',
    'separate_promotional_mock_examinations',
    'authenticated_persistent_screen_integration',
    'tenant_isolation_and_end_to_end_acceptance'
  ]
} as const;
