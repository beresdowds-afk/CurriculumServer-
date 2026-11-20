# Attendance device ingestion: implementation status

The legacy `/api/v1/flow/school/:tenantId/attendance` handlers and their
JSON-backed `ServerSchoolManager` records have been removed. The prior `BiometricAttendanceTab` imported fabricated hardware, scan,
attendance, and delivery examples from `biometricAttendanceData.ts`. That
fixture module has been removed; those values were not production evidence.

Migration 031 defines tenant-scoped device, credential, immutable raw event,
canonical attendance, adjustment, notification-intent, and replay-nonce
tables. Migration 032 adds platform catalogue/adapter metadata, school
capability state, allocation, health, provisioning request/step, and audit
tables. Migration 033 registers eight candidate device models as planned;
their modalities are indicative, and exact SKUs and firmware still require
verification. Empty supported-event/protocol fields and false capability flags
indicate no verified integration, not proof the hardware lacks those features.
The generic gateway adapter validates a normalized event and provides
timestamped HMAC request signing primitives. It is not a vendor protocol or a
verified hardware adapter.

The `feat_biometric_attendance` template can record a school request in the
canonical versioned application configuration. School provisioning persists
`not_requested` or `requested` in `attendance.school_capabilities`; a request
does not enable the attendance capability or activate a device. Provisioning
state-transition and activation-readiness rules plus a PostgreSQL repository
exist. Platform administrator catalogue and provisioning request create/read
handlers are mounted behind the existing capability gate. They cannot execute
or activate a workflow. School management, ingestion and vendor-adapter
execution handlers are not implemented. Both provisioning and ingestion capabilities remain
`not_started`, so the production gate blocks their routes.

Central IAM is not production-ready according to
`CENTRAL_IAM_STAGE1_BASELINE.md`; authorization and user identity cannot be
treated as production verified. Verified guardian links and notification
receipts are not currently exposed as an attendance integration. The
notification service/outbox in migration 027 is the intended delivery
mechanism, but no attendance message is claimed queued or delivered.

Candidate models: ZKTeco SpeedFace-V5L and uFace800 Plus; Hikvision
DS-K1T342MFWX-E1 and DS-K1T671MF-L; Anviz FaceDeep 5 and W2 Pro; Suprema
BioStation 3 and BioStation 2a. Manufacturer references include
[SpeedFace-V5L](https://s3.zktecoip.com/files/20260717/SpeedFace-V5L%20Series_Datasheet_20260717.pdf),
[uFace800 Plus](https://www.zkteco-ea.com/wp-content/uploads/2023/04/uFace800-Plus-1.pdf),
[DS-K1T342MFWX-E1](https://www.hikvision.com/content/dam/hikvision/products/S000000001/S000000080/S000000103/S000000107/OFR000141/M000111055/Data_Sheet/DS-K1T342MFWX-E1-Face-Recognition-Terminal_Datasheet_V1.0_20230803.pdf),
[DS-K1T671MF-L](https://www.hikvision.com/content/dam/hikvision/products/S000000001/S000000080/S000000103/S000000105/OFR000135/M000061576/Data_Sheet/DS-K1T671MF-L.pdf),
[FaceDeep 5](https://www.anviz.com/product/135.html),
[W2 Pro](https://www.anviz.com/file/download/3252/Anviz_W2Pro(Special).pdf),
and [BioStation 2a](https://docs.supremainc.com/en/device/biostation_2a/product-specifications).
These documents do not establish end-to-end integration or secure device
authentication. ADMS serial numbers alone are not authentication; do not
expose an unauthenticated vendor push endpoint.

No verified adapters are seeded. Real hardware adapter work, key
provisioning and rotation validation, device-to-backend integration tests,
school-scoped ingestion RLS, schedule configuration, and notification
operational evidence remain outstanding. Do not enable these capabilities
until those dependencies pass acceptance checks.
