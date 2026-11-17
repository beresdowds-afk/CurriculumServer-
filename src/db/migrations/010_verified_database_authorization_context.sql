-- Replace caller-settable PostgreSQL settings as authorization evidence with
-- short-lived, server-signed assertions verified by RLS helper functions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE control_plane.authorization_context_keys (
  key_name TEXT PRIMARY KEY CHECK (key_name = 'authorization_context'),
  key_value BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON control_plane.authorization_context_keys FROM PUBLIC;

CREATE OR REPLACE FUNCTION production.verified_authorization_context_kind()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, production, control_plane
AS $$
DECLARE
  payload TEXT;
  supplied_signature TEXT;
  secret BYTEA;
  context JSONB;
  tenant_id TEXT;
  issued_at BIGINT;
  expires_at BIGINT;
  context_kind TEXT;
BEGIN
  payload := nullif(current_setting('app.authorization_context', true), '');
  supplied_signature := nullif(current_setting('app.authorization_context_signature', true), '');
  IF payload IS NULL OR supplied_signature !~ '^[0-9a-f]{64}$' THEN
    RETURN NULL;
  END IF;

  context := payload::jsonb;
  IF context->>'version' IS DISTINCT FROM '1' THEN RETURN NULL; END IF;
  secret := (
    SELECT key_value FROM control_plane.authorization_context_keys
    WHERE key_name = 'authorization_context'
  );
  IF secret IS NULL OR
     public.hmac(convert_to(payload, 'UTF8'), secret, 'sha256') <> decode(supplied_signature, 'hex') THEN
    RETURN NULL;
  END IF;

  issued_at := (context->>'issuedAt')::bigint;
  expires_at := (context->>'expiresAt')::bigint;
  IF issued_at > floor(extract(epoch FROM clock_timestamp()))::bigint + 5 OR
     expires_at <= floor(extract(epoch FROM clock_timestamp()))::bigint OR
     expires_at <= issued_at OR expires_at - issued_at > 120 THEN
    RETURN NULL;
  END IF;

  context_kind := context->>'kind';
  IF context_kind NOT IN ('tenant', 'control_plane', 'login', 'invitation') THEN
    RETURN NULL;
  END IF;
  IF context_kind = 'control_plane' AND context->>'role' <> 'super_admin' THEN
    RETURN NULL;
  END IF;
  IF context_kind = 'login' AND context->>'role' <> 'login' THEN
    RETURN NULL;
  END IF;
  IF context_kind = 'invitation' AND context->>'role' <> 'invitation' THEN
    RETURN NULL;
  END IF;
  IF context_kind = 'tenant' AND context->>'role' IN ('', 'super_admin', 'login', 'invitation') THEN
    RETURN NULL;
  END IF;

  tenant_id := nullif(context->>'tenantId', '');
  IF tenant_id IS DISTINCT FROM nullif(current_setting('app.tenant_id', true), '') THEN
    RETURN NULL;
  END IF;
  RETURN context_kind;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION production.current_tenant_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, production, control_plane
AS $$
DECLARE
  context JSONB;
  context_kind TEXT;
BEGIN
  context_kind := production.verified_authorization_context_kind();
  IF context_kind IS NULL OR context_kind NOT IN ('tenant', 'login', 'invitation') THEN RETURN NULL; END IF;
  context := nullif(current_setting('app.authorization_context', true), '')::jsonb;
  RETURN nullif(context->>'tenantId', '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION production.current_login_tenant_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, production, control_plane
AS $$
DECLARE
  context JSONB;
BEGIN
  IF production.verified_authorization_context_kind() IS DISTINCT FROM 'login' THEN RETURN NULL; END IF;
  context := nullif(current_setting('app.authorization_context', true), '')::jsonb;
  RETURN nullif(context->>'tenantId', '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION production.is_verified_control_plane_context()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, production, control_plane
AS $$
  SELECT coalesce(
    production.verified_authorization_context_kind() = 'control_plane',
    false
  )
$$;

CREATE OR REPLACE FUNCTION production.current_invitation_token_hash()
RETURNS BYTEA
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, production, control_plane
AS $$
DECLARE
  payload TEXT;
  supplied_signature TEXT;
  secret BYTEA;
  context JSONB;
  issued_at BIGINT;
  expires_at BIGINT;
BEGIN
  payload := nullif(current_setting('app.invitation_context', true), '');
  supplied_signature := nullif(current_setting('app.invitation_context_signature', true), '');
  IF payload IS NULL OR supplied_signature !~ '^[0-9a-f]{64}$' THEN RETURN NULL; END IF;
  context := payload::jsonb;
  IF context->>'version' IS DISTINCT FROM '1' THEN RETURN NULL; END IF;
  secret := (
    SELECT key_value FROM control_plane.authorization_context_keys
    WHERE key_name = 'authorization_context'
  );
  IF secret IS NULL OR
     public.hmac(convert_to(payload, 'UTF8'), secret, 'sha256') <> decode(supplied_signature, 'hex') THEN
    RETURN NULL;
  END IF;
  issued_at := (context->>'issuedAt')::bigint;
  expires_at := (context->>'expiresAt')::bigint;
  IF issued_at > floor(extract(epoch FROM clock_timestamp()))::bigint + 5 OR
     expires_at <= floor(extract(epoch FROM clock_timestamp()))::bigint OR
     expires_at <= issued_at OR expires_at - issued_at > 120 OR
     context->>'tokenHash' !~ '^[0-9a-f]{64}$' THEN
    RETURN NULL;
  END IF;
  RETURN decode(context->>'tokenHash', 'hex');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION production.authorization_context_key_configured()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, production, control_plane
AS $$
  SELECT EXISTS (
    SELECT 1 FROM control_plane.authorization_context_keys
    WHERE key_name = 'authorization_context' AND octet_length(key_value) >= 32
  )
$$;

REVOKE ALL ON FUNCTION production.verified_authorization_context_kind() FROM PUBLIC;
REVOKE ALL ON FUNCTION production.current_tenant_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION production.current_login_tenant_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION production.is_verified_control_plane_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION production.current_invitation_token_hash() FROM PUBLIC;
REVOKE ALL ON FUNCTION production.authorization_context_key_configured() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION production.verified_authorization_context_kind() TO PUBLIC;
GRANT EXECUTE ON FUNCTION production.current_tenant_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION production.current_login_tenant_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION production.is_verified_control_plane_context() TO PUBLIC;
GRANT EXECUTE ON FUNCTION production.current_invitation_token_hash() TO PUBLIC;
GRANT EXECUTE ON FUNCTION production.authorization_context_key_configured() TO PUBLIC;

-- Rebuild every tenant/control-plane policy that referenced the old caller-set
-- settings. Table privileges are unchanged; only the row predicate changes.
DO $$
DECLARE
  policy_record RECORD;
  tenant_column TEXT;
  predicate TEXT;
  role_list TEXT;
  command_name TEXT;
  policy_mode TEXT;
  policy_sql TEXT;
BEGIN
  FOR policy_record IN
    SELECT policy.schemaname, policy.tablename, policy.policyname,
           policy.cmd, policy.permissive, policy.roles,
           coalesce(policy.qual, '') || coalesce(policy.with_check, '') AS expressions
    FROM pg_policies policy
    WHERE (coalesce(policy.qual, '') || coalesce(policy.with_check, '')) ~
      'app\.(tenant_id|control_plane_admin)'
      AND NOT (policy.schemaname = 'production' AND policy.tablename = 'users')
  LOOP
    SELECT column_info.column_name INTO tenant_column
    FROM information_schema.columns column_info
    WHERE column_info.table_schema = policy_record.schemaname
      AND column_info.table_name = policy_record.tablename
      AND column_info.column_name IN ('tenant_id', 'id')
    ORDER BY CASE column_info.column_name WHEN 'tenant_id' THEN 0 ELSE 1 END
    LIMIT 1;

    IF tenant_column IS NULL THEN
      IF policy_record.expressions !~ 'app\.control_plane_admin' THEN
        RAISE EXCEPTION 'Cannot secure tenant policy %.% without a tenant key',
          policy_record.schemaname, policy_record.tablename;
      END IF;
      predicate := 'production.is_verified_control_plane_context()';
    ELSE
      predicate := format(
        '(%I::text = production.current_tenant_id()::text OR production.is_verified_control_plane_context())',
        tenant_column
      );
    END IF;

    SELECT string_agg(
      CASE WHEN role_name = 'public' THEN 'PUBLIC' ELSE format('%I', role_name) END,
      ', '
    ) INTO role_list
    FROM unnest(policy_record.roles) AS role_name;

    command_name := CASE policy_record.cmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      ELSE 'ALL'
    END;
    policy_mode := CASE policy_record.permissive
      WHEN 'PERMISSIVE' THEN 'PERMISSIVE'
      ELSE 'RESTRICTIVE'
    END;
    EXECUTE format('DROP POLICY %I ON %I.%I',
      policy_record.policyname, policy_record.schemaname, policy_record.tablename);

    policy_sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      policy_record.policyname, policy_record.schemaname, policy_record.tablename,
      policy_mode, command_name, coalesce(role_list, 'PUBLIC')
    );
    IF command_name IN ('SELECT', 'UPDATE', 'DELETE', 'ALL') THEN
      policy_sql := policy_sql || format(' USING (%s)', predicate);
    END IF;
    IF command_name IN ('INSERT', 'UPDATE', 'ALL') THEN
      policy_sql := policy_sql || format(' WITH CHECK (%s)', predicate);
    END IF;
    EXECUTE policy_sql;
  END LOOP;

  DROP POLICY IF EXISTS tenant_user_login_access ON production.users;
  CREATE POLICY tenant_user_login_access ON production.users
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM production.memberships membership
        WHERE membership.user_id = production.users.id
          AND membership.tenant_id::text = coalesce(
            production.current_tenant_id(), production.current_login_tenant_id()
          )
      )
    );

  DROP POLICY IF EXISTS control_plane_user_access ON production.users;
  CREATE POLICY control_plane_user_access ON production.users
    USING (production.is_verified_control_plane_context())
    WITH CHECK (production.is_verified_control_plane_context());

  DROP POLICY IF EXISTS invitation_token_user_access ON production.users;
  CREATE POLICY invitation_token_user_access ON production.users
    USING (
      lower(email) = (
        SELECT lower(invitation.administrator_email)
        FROM production.school_admin_invitations invitation
        WHERE invitation.token_hash = production.current_invitation_token_hash()
          AND invitation.status = 'pending'
          AND invitation.expires_at > now()
        LIMIT 1
      )
    )
    WITH CHECK (
      lower(email) = (
        SELECT lower(invitation.administrator_email)
        FROM production.school_admin_invitations invitation
        WHERE invitation.token_hash = production.current_invitation_token_hash()
          AND invitation.status = 'pending'
          AND invitation.expires_at > now()
        LIMIT 1
      )
    );

  DROP POLICY IF EXISTS invitation_token_lookup ON production.school_admin_invitations;
  CREATE POLICY invitation_token_lookup ON production.school_admin_invitations
    FOR SELECT
    USING (token_hash = production.current_invitation_token_hash());

  DROP POLICY IF EXISTS membership_login_lookup ON production.memberships;
  CREATE POLICY membership_login_lookup ON production.memberships
    FOR SELECT
    USING (tenant_id::text = production.current_login_tenant_id());
END $$;
