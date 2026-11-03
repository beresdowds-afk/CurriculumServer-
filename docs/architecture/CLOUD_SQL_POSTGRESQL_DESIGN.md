# Cloud SQL PostgreSQL Design (`curriculum_platform`)

## 1. Database Specifications
- **Database Name**: `curriculum_platform`
- **Database Engine**: PostgreSQL 15+ (Cloud SQL for PostgreSQL)
- **Schemas**:
  - `control_plane`: Stores SaaS platform metadata, customers, organisations, instances, application registry, feature registry, IIAPE profiles, provisioning jobs, domain records, and PIAM audit trails.
  - `curriculum_flow`: Stores institutional operational data (students, teachers, classes, subjects, assessment records, attendance logs, bursary invoices).

## 2. Logical Schema Structure (`control_plane`)
- `customers`: ID, name, email, billing address, created_at.
- `organisations`: ID, customer_id, org_name, region, created_at.
- `instances`: ID, org_id, instance_name, tenant_slug, tier, status, architecture_profile_id.
- `instance_architecture_profiles`: ID, instance_id, version, profile_json, approved_by, approved_at.
- `provisioning_jobs`: ID, instance_id, job_type, status, idempotency_key, payload_json, error_message, created_at.
- `domains`: ID, instance_id, hostname, registrar, verification_status, ssl_status, created_at.
- `audit_logs`: ID, actor_email, action, target_resource, ip_address, timestamp, metadata_json.

## 3. Logical Schema Structure (`curriculum_flow`)
- `users`: ID, instance_id, email, password_hash, role, full_name, created_at.
- `students`: ID, instance_id, admission_number, first_name, last_name, class_id.
- `academic_records`: ID, student_id, term, subject_id, ca_score, exam_score, total, grade.
- `attendance_logs`: ID, student_id, swipe_timestamp, status, gate_location.
- `bursary_invoices`: ID, student_id, fee_head, amount_due, amount_paid, status, gateway_ref.
