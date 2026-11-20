-- Candidate models only: no manufacturer-specific adapter or firmware is verified.
-- Modalities are indicative and must be confirmed for the exact SKU before use.
INSERT INTO attendance.device_catalogue
  (manufacturer, model, category, modalities, integration_method,
   verification_status, operational_limitations)
VALUES
  ('ZKTeco', 'SpeedFace-V5L', 'combined', ARRAY['facial', 'fingerprint', 'rfid'], 'unknown',
   'planned', ARRAY['Exact SKU, card module, firmware, protocol and authentication require verification.']),
  ('ZKTeco', 'uFace800 Plus', 'combined', ARRAY['facial', 'fingerprint', 'rfid'], 'unknown',
   'planned', ARRAY['Exact SKU, card module, firmware, protocol and authentication require verification.']),
  ('Hikvision', 'DS-K1T342MFWX-E1', 'combined', ARRAY['facial', 'fingerprint', 'rfid'], 'unknown',
   'planned', ARRAY['Firmware, integration mode and authentication require verification.']),
  ('Hikvision', 'DS-K1T671MF-L', 'combined', ARRAY['facial', 'fingerprint', 'rfid'], 'unknown',
   'planned', ARRAY['Exact SKU, firmware, integration mode and authentication require verification.']),
  ('Anviz', 'FaceDeep 5', 'combined', ARRAY['facial', 'rfid'], 'unknown',
   'planned', ARRAY['Card module and external reader compatibility require verification; fingerprint is not claimed.']),
  ('Anviz', 'W2 Pro', 'combined', ARRAY['fingerprint', 'rfid'], 'unknown',
   'planned', ARRAY['Exact SKU, card module, firmware, API and authentication require verification.']),
  ('Suprema', 'BioStation 3', 'combined', ARRAY['facial', 'rfid'], 'unknown',
   'planned', ARRAY['Exact SKU, card module, firmware, API and authentication require verification.']),
  ('Suprema', 'BioStation 2a', 'combined', ARRAY['fingerprint', 'rfid'], 'unknown',
   'planned', ARRAY['Exact SKU, card module, firmware, API and authentication require verification.'])
ON CONFLICT (manufacturer, model) DO NOTHING;
