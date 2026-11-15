-- Ensure tenant ownership agrees across every relational edge.

ALTER TABLE control_plane.customers
  ADD CONSTRAINT customers_id_tenant_uq UNIQUE (id, tenant_id);
ALTER TABLE control_plane.organisations
  ADD CONSTRAINT organisations_id_tenant_uq UNIQUE (id, tenant_id),
  ADD CONSTRAINT organisations_customer_tenant_fk
    FOREIGN KEY (customer_id, tenant_id)
    REFERENCES control_plane.customers (id, tenant_id) ON DELETE CASCADE;
ALTER TABLE control_plane.instances
  ADD CONSTRAINT instances_id_tenant_uq UNIQUE (id, tenant_id),
  ADD CONSTRAINT instances_organisation_tenant_fk
    FOREIGN KEY (org_id, tenant_id)
    REFERENCES control_plane.organisations (id, tenant_id) ON DELETE CASCADE;
ALTER TABLE control_plane.provisioning_jobs
  ADD CONSTRAINT provisioning_jobs_id_tenant_uq UNIQUE (id, tenant_id),
  ADD CONSTRAINT provisioning_jobs_instance_tenant_fk
    FOREIGN KEY (instance_id, tenant_id)
    REFERENCES control_plane.instances (id, tenant_id) ON DELETE CASCADE;
ALTER TABLE control_plane.architecture_profiles
  ADD CONSTRAINT architecture_profiles_id_tenant_uq UNIQUE (id, tenant_id);
ALTER TABLE control_plane.provisioning_requests
  ADD CONSTRAINT provisioning_requests_id_tenant_uq UNIQUE (id, tenant_id);
ALTER TABLE control_plane.provisioning_requests
  DROP CONSTRAINT provisioning_requests_architecture_profile_fk,
  ADD CONSTRAINT provisioning_requests_architecture_profile_tenant_fk
    FOREIGN KEY (architecture_profile_id, tenant_id)
    REFERENCES control_plane.architecture_profiles (id, tenant_id);
ALTER TABLE control_plane.provisioning_job_attempts
  ADD CONSTRAINT job_attempts_job_tenant_fk
    FOREIGN KEY (job_id, tenant_id)
    REFERENCES control_plane.provisioning_jobs (id, tenant_id) ON DELETE CASCADE;
ALTER TABLE control_plane.approval_records
  ADD CONSTRAINT approval_records_request_tenant_fk
    FOREIGN KEY (request_id, tenant_id)
    REFERENCES control_plane.provisioning_requests (id, tenant_id) ON DELETE CASCADE;
ALTER TABLE control_plane.piam_authorizations
  ADD CONSTRAINT piam_authorizations_request_tenant_fk
    FOREIGN KEY (request_id, tenant_id)
    REFERENCES control_plane.provisioning_requests (id, tenant_id) ON DELETE CASCADE;
ALTER TABLE control_plane.resource_configurations
  ADD CONSTRAINT resource_configurations_instance_tenant_fk
    FOREIGN KEY (instance_id, tenant_id)
    REFERENCES control_plane.instances (id, tenant_id) ON DELETE RESTRICT;
ALTER TABLE control_plane.resource_configurations
  ADD CONSTRAINT resource_configurations_id_tenant_uq UNIQUE (id, tenant_id);
ALTER TABLE control_plane.resource_verification_evidence
  ADD CONSTRAINT resource_evidence_configuration_tenant_fk
    FOREIGN KEY (resource_configuration_id, tenant_id)
    REFERENCES control_plane.resource_configurations (id, tenant_id) ON DELETE CASCADE;
