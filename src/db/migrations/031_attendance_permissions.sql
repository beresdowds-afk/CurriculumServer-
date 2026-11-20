-- Declarations only: no role grants are made before attendance authorization
-- and resource-scope enforcement are implemented and verified.
INSERT INTO production.permissions (code, description) VALUES
  ('attendance.configuration.read', 'Read attendance configuration'),
  ('attendance.configuration.manage', 'Manage attendance configuration'),
  ('attendance.sessions.read', 'Read attendance sessions'),
  ('attendance.sessions.manage', 'Manage attendance sessions'),
  ('attendance.students.read', 'Read student attendance within authorized scope'),
  ('attendance.students.override', 'Correct student attendance within authorized scope'),
  ('attendance.staff.read', 'Read staff attendance within authorized scope'),
  ('attendance.staff.self.read', 'Read own staff attendance'),
  ('attendance.staff.override', 'Correct staff attendance within authorized scope'),
  ('attendance.devices.read', 'Read attendance device information'),
  ('attendance.devices.manage', 'Manage attendance devices'),
  ('attendance.devices.enroll', 'Enroll attendance devices'),
  ('attendance.devices.revoke', 'Revoke attendance devices'),
  ('attendance.biometric.enroll', 'Enroll biometric verification references'),
  ('attendance.biometric.manage', 'Manage biometric verification references'),
  ('attendance.reports.read', 'Read attendance reports within authorized scope'),
  ('attendance.reports.export', 'Export attendance reports within authorized scope'),
  ('attendance.notifications.read', 'Read attendance notification status'),
  ('attendance.notifications.manage', 'Manage attendance notification settings'),
  ('attendance.exceptions.review', 'Review attendance exceptions within authorized scope')
ON CONFLICT (code) DO NOTHING;
