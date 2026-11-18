-- Central AI execution hardening: least-privilege school roles and exactly one
-- durable usage row per accepted request.

INSERT INTO production.roles (code, description)
VALUES
  ('teacher', 'School teacher with curriculum and classroom-assessment AI access'),
  ('examiner', 'School examiner with examination and CBT AI access')
ON CONFLICT (code) DO NOTHING;

-- General staff retain curriculum/tutoring access, but not exam or CBT execution.
DELETE FROM production.role_permissions
WHERE role_code = 'staff'
  AND permission_code IN ('ai.assessments.generate', 'ai.cbt.generate');

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'teacher', code
FROM production.permissions
WHERE code IN (
  'ai.gateway.read',
  'ai.curriculum.generate',
  'ai.assessments.generate',
  'ai.tutor.use',
  'question_bank.read',
  'question_bank.manage'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'examiner', code
FROM production.permissions
WHERE code IN (
  'ai.gateway.read',
  'ai.assessments.generate',
  'ai.cbt.generate',
  'question_bank.read',
  'question_bank.manage',
  'question_bank.review',
  'assessments.read',
  'assessments.manage'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM production.ai_gateway_usage_metrics
    GROUP BY request_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce one AI usage record per request: duplicate request_id values already exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS production_ai_gateway_usage_request_uq
  ON production.ai_gateway_usage_metrics (request_id);
