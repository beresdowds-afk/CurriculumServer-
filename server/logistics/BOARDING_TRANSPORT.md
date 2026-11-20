# Boarding and transport workflows

These repository workflows are exposed through tenant-authenticated API routes and registered
with the production capability gate. The capability remains unavailable until its readiness
evidence is complete; route registration does not activate the feature. All methods require an
active, ready school instance with the relevant feature and logistics capability enabled.
Mutations with `idempotencyKey` bind the key to the actor, operation and payload within the
school; retries return the same ID and conflicting reuse is rejected. Existing `assignTrip`
and `startTrip` are state-idempotent.

- Hostel: `assignHostelStaff`, `revokeHostelStaff`, `recordBoardingRegister`,
  `listBoardingRegister`. Assignment changes require hostel management permission and
  principal or tenant administrator role. Register access is scoped to the caller's assigned
  building unless they are principal or tenant administrator. The register lists current
  allocations; missing entries are `unaccounted` with a null record ID. Evening and curfew
  are independent registers.
- Dining: `scheduleMeal`, `authorizeDietaryRestriction`, `revokeDietaryRestriction`,
  `listDietaryRestrictions`, and the extended `recordDiningAttendance`.
  Dietary read, manage and exception permissions are deliberately separate and are not
  automatically granted to existing roles. Attendance requires explicit fulfillment or an
  authorized, reasoned dietary exception when an active restriction applies. Audit records
  do not include restriction text or exception reasons.
- Transport: `createTransportRoute`, `listTransportRoutes`, `registerTransportDriver`,
  `registerTransportVehicle`, `scheduleVehicleMaintenance`, `completeVehicleMaintenance`,
  `listTransportDrivers`, `listTransportVehicles`, `updateTransportDriverQualification`,
  `updateTransportVehicleCompliance`,
  `listVehicleMaintenance`, `subscribeStudentRoute`, `endStudentRoute`, `listStudentRoutes`,
  `scheduleTrip`, `listTransportTrips`, `assignTrip`, `startTrip`, `completeTrip`,
  `recordTripPassengerEvent`, `recordTransportIncident`, `listTransportIncidents`.
  Route stops may be supplied as names or as objects with coordinates and a geofence
  radius (25–2000 meters); GPS activation requires a verified Traccar device and an
  active route with at least two coordinate-backed stops.
  New vehicles require inspection and insurance dates; legacy vehicles without an insurance
  date retain their previous behavior until their records are updated. Pending maintenance
  due on or before the trip date blocks assignment and start. Assignments conservatively
  reserve a driver and vehicle for the entire trip date. Subscriptions are checked against
  assigned vehicle capacities and cannot overlap for one student.

The register and transport list methods are school-scoped. Transport lists return at most
100 rows; routes include ordered stop IDs. Dietary information is exposed only through the
dedicated read permission. GPS telemetry is implemented separately and requires verified
provider/device readiness; notifications and library storage are separate integrations.
