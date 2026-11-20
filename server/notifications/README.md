# Notification delivery foundation

Migration 027 creates tenant-scoped `production.notification_subscriptions`,
`notification_outbox`, and `notification_attempts`, with forced RLS. Subscription
details and outbox requests are encrypted using `ServerSecretVault`; configure
`STORAGE_VAULT_KEYS` and `STORAGE_VAULT_ACTIVE_KEY_ID` and retain old vault keys
for pending messages and subscriptions. Database authorization also requires the
existing signed context configuration (`CONTROL_PLANE_SECRET`).

`NotificationService(pool, verifiedTenantPrincipal)` exposes `subscribe`,
`revokeSubscription`, `enqueue`, `get`, `attempts`, and `dispatchOne`.
`subscribe` binds a subscription to the verified principal's `userId`; revocation
requires the same owner. `enqueue` takes a `NotificationRequest`, optionally
`{ maxAttempts }`. `dispatchOne` processes at most one due item for the principal's
tenant and returns null when none is due. Call it from a trusted scheduled worker,
using a verified tenant principal per tenant. It is not started automatically.
All methods require server-side authorization: tenant RLS is isolation, not a
permission check. Route wiring must authorize senders and notification readers,
verify a user's ownership of subscription IDs where appropriate, and never expose
the dispatcher as an unprivileged endpoint. Enqueue is not idempotent.

Outbox status is `queued`, `accepted` (provider accepted, **not delivered**), or
`failed`. Attempts are `pending`, `accepted`, or `failed`. Retries use 30 seconds
exponential backoff, capped at one hour, up to 5 attempts by default (1–10).
Workers claim with a 60-second lease and `SKIP LOCKED`; an expired lease becomes
a failed attempt and is eligible for recovery, subject to the attempt limit.
Transport timeouts, worker crashes and lease loss can occur after a provider has
accepted a message, so delivery is **at least once**, not exactly once. There is
no provider delivery receipt or webhook handling.

Provider readiness is exposed by `notificationProviderReadiness(env)` and
`NotificationProviders.readiness()`. Missing or malformed configuration fails
closed. Every channel also requires its opt-in flag to be exactly `true`:
`NOTIFICATION_EMAIL_ENABLED`, `NOTIFICATION_SMS_ENABLED`,
`NOTIFICATION_WHATSAPP_ENABLED`, or `NOTIFICATION_WEB_PUSH_ENABLED`. Configure:

* Resend: `INVITATION_EMAIL_API_KEY`, `INVITATION_EMAIL_FROM` (the same settings
  as school invitation email).
* Sendchamp: `SENDCHAMP_API_KEY`, plus `SENDCHAMP_SMS_SENDER_NAME` and
  `SENDCHAMP_SMS_ROUTE` (`dnd`, `non_dnd`, or `international`) for SMS, or
  `SENDCHAMP_WHATSAPP_SENDER` (approved international number) for WhatsApp.
  Phone recipients must be E.164; Sendchamp receives digit-only arrays.
* Web Push: `VAPID_SUBJECT` (a `mailto:` address or HTTPS URL),
  `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (matching unpadded base64url P-256
  keys). Provision the public key to the browser through a separately authorized
  integration; never expose the private key. Supported subscription endpoints
  are FCM, Mozilla, and Apple push service hosts; adding other push services
  requires reviewing the endpoint allowlist.

No routes, UI, workflow event integration, worker scheduling, production capability
enablement, credentials, or live-provider delivery verification are included.
