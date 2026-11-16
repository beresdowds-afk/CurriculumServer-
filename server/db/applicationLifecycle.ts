import type { DatabaseClient } from './postgres';

// School registration, provisioning, administrator activation and application
// activation are distinct, strictly ordered operations. Administrator
// acceptance never implies application activation.
export const LIFECYCLE_STAGES = [
  'registration_approved',
  'provisioned',
  'template_verified',
  'admin_invited',
  'admin_activated',
  'membership_active',
  'configuration_completed',
  'application_activated'
] as const;

export type LifecycleStage = typeof LIFECYCLE_STAGES[number];

export class LifecycleTransitionError extends Error {
  constructor(public readonly from: string, public readonly to: string) {
    super(`LIFECYCLE_TRANSITION_INVALID:${from}->${to}`);
  }
}

export function isLifecycleStage(value: string): value is LifecycleStage {
  return (LIFECYCLE_STAGES as readonly string[]).includes(value);
}

/** Only the immediately following stage is a valid transition. */
export function assertLifecycleTransition(from: string, to: string): void {
  if (!isLifecycleStage(from) || !isLifecycleStage(to) ||
      LIFECYCLE_STAGES.indexOf(to) !== LIFECYCLE_STAGES.indexOf(from) + 1) {
    throw new LifecycleTransitionError(from, to);
  }
}

/**
 * Advances an application instance towards `target` one validated step at a
 * time, locking the row and recording an event per step. Already-reached
 * stages are a no-op, so retried operations are safe. Steps passed over
 * without their own trigger are flagged `implied` in the event evidence.
 */
export async function advanceLifecycle(
  client: DatabaseClient,
  tenantId: string,
  instanceId: string,
  target: LifecycleStage,
  actor: string,
  evidence: Record<string, unknown> = {}
): Promise<LifecycleStage> {
  const current = await client.query<{ lifecycle_stage: string }>(
    `SELECT lifecycle_stage FROM production.application_instances
     WHERE tenant_id = $1 AND id = $2 FOR UPDATE`,
    [tenantId, instanceId]
  );
  if (!current.rows[0]) throw new Error('APPLICATION_INSTANCE_NOT_FOUND');
  let stage = current.rows[0].lifecycle_stage;
  if (!isLifecycleStage(stage)) throw new LifecycleTransitionError(stage, target);
  const targetIndex = LIFECYCLE_STAGES.indexOf(target);
  while (LIFECYCLE_STAGES.indexOf(stage as LifecycleStage) < targetIndex) {
    const next = LIFECYCLE_STAGES[LIFECYCLE_STAGES.indexOf(stage as LifecycleStage) + 1];
    assertLifecycleTransition(stage, next);
    await client.query(
      `UPDATE production.application_instances
       SET lifecycle_stage = $3, updated_at = now()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, instanceId, next]
    );
    await client.query(
      `INSERT INTO production.application_lifecycle_events
         (tenant_id, application_instance_id, from_stage, to_stage, actor, evidence)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [tenantId, instanceId, stage, next, actor,
        JSON.stringify(next === target ? evidence : { ...evidence, implied: true })]
    );
    stage = next;
  }
  return stage as LifecycleStage;
}
