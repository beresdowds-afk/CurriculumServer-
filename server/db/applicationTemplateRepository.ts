import type { ApplicationTemplateRecord } from '../../packages/shared-types/src/apiContracts';
import type { DatabaseClient, DatabasePool } from './postgres';
import { inTransaction } from './postgres';
import {
  withControlPlaneTransaction,
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from './tenantContext';

interface TemplateRow {
  template_id: string;
  template_version: string;
  display_name: string;
  description: string;
  category: string;
  status: 'draft' | 'active' | 'deprecated';
  provisionable: boolean;
  capabilities: string[];
  default_features: string[];
  configuration_schema: Record<string, unknown>;
  default_configuration: Record<string, unknown>;
  upgrade_compatibility: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

function mapTemplateRow(row: TemplateRow): ApplicationTemplateRecord {
  return {
    templateId: row.template_id,
    templateVersion: row.template_version,
    displayName: row.display_name,
    description: row.description,
    category: row.category,
    status: row.status,
    provisionable: row.provisionable,
    capabilities: Array.isArray(row.capabilities) ? row.capabilities : [],
    defaultFeatures: Array.isArray(row.default_features) ? row.default_features : [],
    configurationSchema: row.configuration_schema ?? {},
    defaultConfiguration: row.default_configuration ?? {},
    upgradeCompatibility: row.upgrade_compatibility ?? {},
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
  };
}

export class ApplicationTemplateRepository {
  constructor(private readonly pool: DatabasePool) {}

  private async runQuery<T>(
    principal: VerifiedTenantPrincipal | undefined,
    fn: (client: DatabaseClient) => Promise<T>
  ): Promise<T> {
    if (principal?.role === 'super_admin') {
      return withControlPlaneTransaction(this.pool, principal, fn);
    }
    if (principal) {
      return withTenantTransaction(this.pool, principal, fn);
    }
    return inTransaction(this.pool, fn);
  }

  async listTemplates(
    options: { provisionableOnly?: boolean; category?: string } = {},
    principal?: VerifiedTenantPrincipal
  ): Promise<ApplicationTemplateRecord[]> {
    return this.runQuery(principal, async client => {
      const values: unknown[] = [];
      const clauses: string[] = [];
      if (options.provisionableOnly) {
        clauses.push(`provisionable = true AND status = 'active'`);
      }
      if (options.category?.trim()) {
        values.push(options.category.trim());
        clauses.push(`category = $${values.length}`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const result = await client.query<TemplateRow>(
        `SELECT template_id, template_version, display_name, description, category,
                status, provisionable, capabilities, default_features,
                configuration_schema, default_configuration, upgrade_compatibility,
                created_at, updated_at
         FROM production.application_templates
         ${where}
         ORDER BY template_id ASC, template_version DESC`,
        values
      );
      return result.rows.map(mapTemplateRow);
    });
  }

  async getTemplate(
    templateId: string,
    templateVersion: string,
    principal?: VerifiedTenantPrincipal
  ): Promise<ApplicationTemplateRecord | null> {
    return this.runQuery(principal, async client => {
      const result = await client.query<TemplateRow>(
        `SELECT template_id, template_version, display_name, description, category,
                status, provisionable, capabilities, default_features,
                configuration_schema, default_configuration, upgrade_compatibility,
                created_at, updated_at
         FROM production.application_templates
         WHERE template_id = $1 AND template_version = $2`,
        [templateId, templateVersion]
      );
      return result.rows[0] ? mapTemplateRow(result.rows[0]) : null;
    });
  }
}
