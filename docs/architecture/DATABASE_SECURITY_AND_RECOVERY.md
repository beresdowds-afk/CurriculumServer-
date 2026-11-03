# Database Security and Recovery Architecture

## 1. Runtime Identities & Permissions
- **Application Runtime Role (`cs_app_user`)**: Restricted permissions to execute DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on operational tables. No DDL privileges (`DROP`, `ALTER`).
- **Migration Role (`cs_migration_user`)**: Granted schema migration privileges (`CREATE`, `ALTER`) used exclusively during CI/CD deployment pipelines.
- **Superuser Prohibition**: PostgreSQL superuser credentials (`postgres`) are strictly restricted from runtime application connections.

## 2. Multi-Tenant Isolation & Row-Level Security (RLS)
- Tenant isolation is enforced at the application service layer via parameterized queries requiring `instance_id` or `tenant_id`.
- PostgreSQL Row-Level Security (RLS) policies are prepared on operational tables in `curriculum_flow` using session variables (`app.current_tenant_id`) to prevent cross-tenant data leaks.

## 3. Backup and Recovery Expectations
- **Automated Backups**: Daily automated snapshots with point-in-time recovery (PITR) enabled for up to 30 days.
- **High Availability**: Regional HA configuration with synchronous standby replication for production instances.
- **Deletion Protection**: Enabled on all production Cloud SQL instances to prevent accidental termination.
