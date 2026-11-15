import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GCPProvisioningOrchestrationEngine } from './gcpProvisioningEngine';

describe('GCP provisioning fail-closed behavior', () => {
  it('does not execute without a trusted server-side adapter', async () => {
    await assert.rejects(
      GCPProvisioningOrchestrationEngine.executeProvisioningOrchestration(
        'instance-test',
        1,
        ['gcp_project'],
        'customer-test'
      ),
      /PROVISIONING_EXECUTION_UNAVAILABLE/
    );
  });

  it('does not report undurable job or resource inventory', () => {
    assert.throws(() => GCPProvisioningOrchestrationEngine.getJobs(), /PROVISIONING_PERSISTENCE_UNAVAILABLE/);
    assert.throws(() => GCPProvisioningOrchestrationEngine.getResources(), /PROVISIONING_PERSISTENCE_UNAVAILABLE/);
  });

  it('does not decommission resources using an approval token', () => {
    assert.throws(
      () => GCPProvisioningOrchestrationEngine.decommissionResource('resource-test'),
      /DECOMMISSION_UNAVAILABLE/
    );
  });
});
