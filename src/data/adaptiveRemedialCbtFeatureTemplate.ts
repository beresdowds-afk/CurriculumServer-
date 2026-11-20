export const ADAPTIVE_REMEDIAL_CBT_FEATURE_TEMPLATE = {
  templateId: 'adaptive-remedial-secure-cbt',
  templateVersion: '0.1.0',
  featureId: 'feat_exam_management',
  applicationId: 'app_curriculum_flow',
  status: 'draft',
  provisionable: false,
  provisioningRequirements: [
    'tenant_isolated_evidence_based_learning_gaps_and_teacher_approved_interventions',
    'central_ai_gateway_authorization_metering_and_audit',
    'approved_question_bank_and_teacher_authorized_taught_scope',
    'encrypted_exam_vault_and_authorized_dual_release',
    'durable_server_timed_candidate_sessions_and_concurrent_submission_protection',
    'authorized_proctoring_events_and_managed_kiosk_integration',
    'authorized_marking_moderation_and_result_publication',
    'academic_records_integration_and_end_to_end_acceptance'
  ]
} as const;
