# Storage and database record evidence

This is a classification aid, not a migration. Source records and tamper-evident audit entries are retained unchanged unless specifically noted below.

| Source | Classification | Meaning |
| --- | --- | --- |
| `server/storageAndDatabaseManager.ts` initial database and storage arrays | Unverified fixture data | Historical labels, resource identifiers, health values, and provisioning values are retained as reported values. Runtime status is now `unknown`/`unverified`; no provider operation established that these resources exist. Placeholder credential material was removed. |
| `data/universal_instances.json` | Historical unverified records | Requests remain stored with provisioning blocked and provider checks unknown. Strategy/provider selections are requests, not evidence that resources were created. |
| `data/governed_instances.json` and `data/architecture_migrations.json` | Historical unverified records | Preserve their original telemetry and migration claims, including test-runner history. They have not been independently checked against providers in this pass. |
| `data/backups/metadata/snapshots.json` | Unverified test fixtures | The entries identify `tenant-dr-fixture` and a disposable test college; their existing values and corrupted status are preserved. |
| `src/services/backupRestoreService.ts` initial snapshots | Unverified fixture data | Local sample snapshots are labeled as fixtures; browser-only backup creation and restoration cannot report success. |
| `data/audit_ledger/ledger.jsonl` | Historical audit evidence; provider state unverified | Entries are preserved byte-for-byte. A historical `SUCCESS` assertion is not independent proof of a provider operation. |

No real database, storage resource, backup, or migration was verified in this pass. There is no bulk data migration, and this classification does not authorize changing or deleting records.

## Credential vault configuration

The server vault reads `STORAGE_VAULT_KEYS` as a JSON object mapping key identifiers to canonical Base64-encoded 32-byte keys, and `STORAGE_VAULT_ACTIVE_KEY_ID` as the identifier used for new ciphertext. Supply both through an external secret configuration; do not commit values to the repository. During rotation, retain old key identifiers in the map until ciphertext encrypted under them has been re-encrypted or retired. Missing, malformed, or unavailable key material causes encryption/decryption to fail closed.
