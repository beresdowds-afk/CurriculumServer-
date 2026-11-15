import { withTenantTransaction } from './pool';

export interface TenantInstance {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  status: 'requested' | 'approved' | 'provisioning' | 'active' | 'suspended' | 'failed' | 'decommissioned';
  createdAt: Date;
}

interface TenantInstanceRow {
  id: string;
  tenant_id: string;
  organization_id: string;
  instance_name: string;
  status: TenantInstance['status'];
  created_at: Date;
}

function mapInstance(row: TenantInstanceRow): TenantInstance {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    name: row.instance_name,
    status: row.status,
    createdAt: row.created_at
  };
}

export class TenantInstanceRepository {
  async list(tenantId: string): Promise<TenantInstance[]> {
    return withTenantTransaction(tenantId, async client => {
      const result = await client.query<TenantInstanceRow>(
        `SELECT id, tenant_id, organization_id, instance_name, status, created_at
         FROM production.instances`
      );
      return result.rows.map(mapInstance);
    });
  }

  async create(
    tenantId: string,
    instance: Pick<TenantInstance, 'organizationId' | 'name'>
  ): Promise<TenantInstance> {
    return withTenantTransaction(tenantId, async client => {
      const result = await client.query<TenantInstanceRow>(
        `INSERT INTO production.instances
           (tenant_id, organization_id, instance_name)
         VALUES ($1, $2, $3)
         RETURNING id, tenant_id, organization_id, instance_name, status, created_at`,
        [tenantId, instance.organizationId, instance.name]
      );
      return mapInstance(result.rows[0]);
    });
  }

  async updateStatus(
    tenantId: string,
    instanceId: string,
    status: TenantInstance['status']
  ): Promise<TenantInstance | undefined> {
    return withTenantTransaction(tenantId, async client => {
      const result = await client.query<TenantInstanceRow>(
        `UPDATE production.instances
         SET status = $3
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, tenant_id, organization_id, instance_name, status, created_at`,
        [tenantId, instanceId, status]
      );
      return result.rows[0] ? mapInstance(result.rows[0]) : undefined;
    });
  }

  async delete(tenantId: string, instanceId: string): Promise<boolean> {
    return withTenantTransaction(tenantId, async client => {
      const result = await client.query(
        'DELETE FROM production.instances WHERE tenant_id = $1 AND id = $2',
        [tenantId, instanceId]
      );
      return result.rowCount === 1;
    });
  }
}
