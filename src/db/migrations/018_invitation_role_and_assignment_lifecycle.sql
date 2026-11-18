-- School administrator invitations are explicitly bound to their tenant and
-- their sole supported role. Existing invitations retain that intended role.
ALTER TABLE production.school_admin_invitations
  ADD COLUMN intended_role_code TEXT NOT NULL DEFAULT 'tenant_admin'
    REFERENCES production.roles(code),
  ADD CONSTRAINT production_school_admin_invitation_role_check
    CHECK (intended_role_code = 'tenant_admin');
