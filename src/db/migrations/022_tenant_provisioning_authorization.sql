-- Tenant principals may inspect their own provisioning records, but only a
-- verified control-plane context may create or change them.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'production.tenant_provisioning_approvals',
    'production.tenant_provisioning_operations',
    'production.tenant_database_resources',
    'production.tenant_storage_configurations',
    'production.tenant_provisioning_attempts',
    'production.tenant_provisioning_verification_evidence'
  ] LOOP
    EXECUTE format('DROP POLICY tenant_or_control_plane_isolation ON %s', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_provisioning_read ON %s FOR SELECT
       USING (tenant_id::text = production.current_tenant_id()
              OR production.is_verified_control_plane_context())', table_name
    );
    EXECUTE format(
      'CREATE POLICY tenant_provisioning_write ON %s FOR ALL
       USING (production.is_verified_control_plane_context())
       WITH CHECK (production.is_verified_control_plane_context())', table_name
    );
  END LOOP;
END $$;
