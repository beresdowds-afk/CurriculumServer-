import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { SchoolProvisioningRequest } from '../packages/shared-types/src/apiContracts';
import { validateProvisionableFeatures } from '../src/data/applicationRegistryData';
import { INITIAL_REGISTERED_APPLICATIONS } from '../src/data/applicationRegistryData';

const scryptAsync = promisify(scrypt);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(email);
}

export function validateSchoolProvisioningRequest(value: unknown): SchoolProvisioningRequest {
  if (!value || typeof value !== 'object') throw new Error('A registration request is required.');
  const request = value as SchoolProvisioningRequest;
  const requiredText: Array<[string, unknown, number]> = [
    ['school.name', request.school?.name, 255],
    ['school.displayName', request.school?.displayName, 255],
    ['school.shortName', request.school?.shortName, 100],
    ['school.slug', request.school?.slug, 63],
    ['school.schoolType', request.school?.schoolType, 100],
    ['school.country', request.school?.country, 100],
    ['school.stateProvince', request.school?.stateProvince, 100],
    ['school.city', request.school?.city, 100],
    ['school.physicalAddress', request.school?.physicalAddress, 1000],
    ['school.officialContactEmail', request.school?.officialContactEmail, 254],
    ['school.telephone', request.school?.telephone, 50],
    ['configuration.timeZone', request.configuration?.timeZone, 100],
    ['configuration.currency', request.configuration?.currency, 3],
    ['configuration.language', request.configuration?.language, 20],
    ['configuration.academicSession', request.configuration?.academicSession, 40],
    ['administrator.fullName', request.administrator?.fullName, 255],
    ['administrator.email', request.administrator?.email, 254],
    ['applicationId', request.applicationId, 64],
    ['templateId', request.templateId, 100],
    ['templateVersion', request.templateVersion, 40],
    ['commercial.planReference', request.commercial?.planReference, 100],
    ['commercial.priceReference', request.commercial?.priceReference, 100]
  ];
  for (const [field, candidate, maxLength] of requiredText) {
    if (typeof candidate !== 'string' || !candidate.trim() || candidate.trim().length > maxLength) {
      throw new Error(`${field} is required and must be at most ${maxLength} characters.`);
    }
  }
  const slug = request.school.slug.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    throw new Error('School slug must contain lowercase letters, numbers, and interior hyphens only.');
  }
  const schoolType = request.school.schoolType.trim();
  if (!isValidEmail(request.school.officialContactEmail) || !isValidEmail(request.administrator.email)) {
    throw new Error('Enter valid official school and administrator email addresses.');
  }
  for (const email of [request.school.principalEmail, request.school.ictAdministratorEmail]) {
    if (email && !isValidEmail(email)) {
      throw new Error('Enter valid principal and ICT administrator email addresses.');
    }
  }
  if (!/^[A-Z]{3}$/i.test(request.configuration.currency)) {
    throw new Error('Currency must be a three-letter ISO code.');
  }
  if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i.test(request.configuration.language)) {
    throw new Error('Enter a valid language code.');
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: request.configuration.timeZone });
  } catch {
    throw new Error('Enter a valid IANA time zone.');
  }
  const applicationId = request.applicationId.trim();
  const application = INITIAL_REGISTERED_APPLICATIONS.find(item => item.appId === applicationId);
  if (!application || application.lifecycleStatus !== 'published') {
    throw new Error('Choose a published application from the registry.');
  }
  if (request.architecture !== 'shared_database') {
    throw new Error('Only the shared PostgreSQL architecture is currently provisionable.');
  }
  if (!Array.isArray(request.enabledFeatures) || request.enabledFeatures.length === 0) {
    throw new Error('Select at least one production-approved application feature.');
  }
  const featureValidation = validateProvisionableFeatures(applicationId, request.enabledFeatures);
  if (!featureValidation.valid) throw new Error(featureValidation.errors.join(' '));
  if (!request.enabledFeatures.includes('feat_school_administration_identity')) {
    throw new Error('School Administration & Identity is required for a school instance.');
  }
  if (!request.commercial || !['monthly', 'annual', 'lease_to_own'].includes(request.commercial.commercialModel) ||
      !['month', 'year', 'lease'].includes(request.commercial.billingInterval)) {
    throw new Error('Choose a supported commercial model and billing interval.');
  }
  if (request.commercial.currency.toUpperCase() !== request.configuration.currency.toUpperCase()) {
    throw new Error('Commercial currency must match the school configuration currency.');
  }
  if (request.commercial.agreedAmountMinor !== undefined &&
      (!Number.isSafeInteger(request.commercial.agreedAmountMinor) || request.commercial.agreedAmountMinor < 0)) {
    throw new Error('Agreed amount must be a non-negative integer in minor currency units.');
  }
  for (const color of [request.school.primaryBrandColor, request.school.accentBrandColor]) {
    if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
      throw new Error('Brand colors must be six-digit hexadecimal colors.');
    }
  }
  for (const optionalUrl of [request.school.website, request.school.logoUrl, request.deployment?.applicationUrl]) {
    if (!optionalUrl) continue;
    try {
      const url = new URL(optionalUrl);
      if (!['https:', ...(process.env.NODE_ENV === 'production' ? [] : ['http:'])].includes(url.protocol)) {
        throw new Error();
      }
    } catch {
      throw new Error('Website, logo, and application URLs must be valid HTTP(S) URLs.');
    }
  }
  if (request.deployment?.requestedSubdomain &&
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(request.deployment.requestedSubdomain.toLowerCase())) {
    throw new Error('Requested subdomain has an invalid format.');
  }
  if (request.deployment?.requestedCustomDomain &&
      !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(request.deployment.requestedCustomDomain)) {
    throw new Error('Requested custom domain has an invalid format.');
  }
  if (!Array.isArray(request.configuration.academicTermStructure) ||
      request.configuration.academicTermStructure.length === 0 ||
      request.configuration.academicTermStructure.length > 12) {
    throw new Error('Configure between one and twelve academic terms.');
  }
  const termNames = new Set<string>();
  for (const term of request.configuration.academicTermStructure) {
    if (!term || typeof term.name !== 'string' || !term.name.trim() || term.name.length > 80) {
      throw new Error('Each academic term must have a valid name.');
    }
    if (termNames.has(term.name.trim().toLowerCase())) {
      throw new Error('Academic term names must be unique.');
    }
    termNames.add(term.name.trim().toLowerCase());
    for (const month of [term.startMonth, term.endMonth]) {
      if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
        throw new Error('Academic term months must be between 1 and 12.');
      }
    }
  }
  if (!Array.isArray(request.configuration.educationLevels) ||
      request.configuration.educationLevels.length > 20 ||
      request.configuration.educationLevels.some(level => typeof level !== 'string' || !level.trim() || level.length > 80)) {
    throw new Error('Education levels must be a list of up to twenty valid names.');
  }
  if (request.configuration.gradingConfiguration !== undefined &&
      (!request.configuration.gradingConfiguration ||
       typeof request.configuration.gradingConfiguration !== 'object' ||
       Array.isArray(request.configuration.gradingConfiguration))) {
    throw new Error('Grading configuration must be an object.');
  }
  return {
    ...request,
    school: {
      ...request.school,
      name: request.school.name.trim(),
      displayName: request.school.displayName.trim(),
      shortName: request.school.shortName.trim(),
      slug,
      schoolType,
      country: request.school.country.trim().replace(/\s+/g, ' '),
      stateProvince: request.school.stateProvince.trim().replace(/\s+/g, ' '),
      city: request.school.city.trim().replace(/\s+/g, ' '),
      officialContactEmail: normalizeEmail(request.school.officialContactEmail)
    },
    administrator: {
      ...request.administrator,
      fullName: request.administrator.fullName.trim(),
      email: normalizeEmail(request.administrator.email)
    },
    configuration: {
      ...request.configuration,
      timeZone: request.configuration.timeZone.trim(),
      currency: request.configuration.currency.toUpperCase(),
      language: request.configuration.language.toLowerCase(),
      academicSession: request.configuration.academicSession.trim()
    },
    applicationId,
    templateId: request.templateId.trim(),
    templateVersion: request.templateVersion.trim(),
    enabledFeatures: [...request.enabledFeatures].sort(),
    commercial: {
      ...request.commercial,
      currency: request.commercial.currency.toUpperCase()
    },
    deployment: {
      ...request.deployment,
      requestedSubdomain: request.deployment?.requestedSubdomain?.toLowerCase(),
      requestedCustomDomain: request.deployment?.requestedCustomDomain?.toLowerCase()
    }
  };
}

export function validateSchoolConfiguration(
  value: unknown
): SchoolProvisioningRequest['configuration'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('School configuration must be an object.');
  }
  const configuration = value as SchoolProvisioningRequest['configuration'];
  if (typeof configuration.timeZone !== 'string' ||
      typeof configuration.currency !== 'string' ||
      typeof configuration.language !== 'string' ||
      typeof configuration.academicSession !== 'string' ||
      !configuration.timeZone.trim() || !configuration.academicSession.trim()) {
    throw new Error('Time zone, currency, language, and academic session are required.');
  }
  if (!/^[A-Z]{3}$/i.test(configuration.currency)) throw new Error('Currency must be a three-letter ISO code.');
  if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i.test(configuration.language)) {
    throw new Error('Enter a valid language code.');
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: configuration.timeZone });
  } catch {
    throw new Error('Enter a valid IANA time zone.');
  }
  if (configuration.academicSession.length > 40 ||
      !Array.isArray(configuration.academicTermStructure) ||
      configuration.academicTermStructure.length === 0 ||
      configuration.academicTermStructure.length > 12) {
    throw new Error('Configure an academic session and between one and twelve academic terms.');
  }
  const names = new Set<string>();
  for (const term of configuration.academicTermStructure) {
    if (!term || typeof term.name !== 'string' || !term.name.trim() || term.name.length > 80) {
      throw new Error('Each academic term must have a valid name.');
    }
    const name = term.name.trim().toLowerCase();
    if (names.has(name)) throw new Error('Academic term names must be unique.');
    names.add(name);
    for (const month of [term.startMonth, term.endMonth]) {
      if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
        throw new Error('Academic term months must be between 1 and 12.');
      }
    }
  }
  if (!Array.isArray(configuration.educationLevels) ||
      configuration.educationLevels.length > 20 ||
      configuration.educationLevels.some(level =>
        typeof level !== 'string' || !level.trim() || level.length > 80
      )) {
    throw new Error('Education levels must be a list of up to twenty valid names.');
  }
  if (configuration.gradingConfiguration !== undefined &&
      (!configuration.gradingConfiguration ||
       typeof configuration.gradingConfiguration !== 'object' ||
       Array.isArray(configuration.gradingConfiguration))) {
    throw new Error('Grading configuration must be an object.');
  }
  return {
    ...configuration,
    timeZone: configuration.timeZone.trim(),
    currency: configuration.currency.toUpperCase(),
    language: configuration.language.toLowerCase(),
    academicSession: configuration.academicSession.trim(),
    academicTermStructure: configuration.academicTermStructure.map(term => ({
      ...term,
      name: term.name.trim()
    })),
    educationLevels: configuration.educationLevels.map(level => level.trim())
  };
}

export function createInvitationToken(): { token: string; tokenHash: Buffer } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: createHash('sha256').update(token).digest() };
}

export function hashProvisioningRequest(request: SchoolProvisioningRequest): string {
  return createHash('sha256').update(stableJson(request)).digest('hex');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashInvitationToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export function createIdempotencyKey(): string {
  return randomBytes(24).toString('base64url');
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw new Error('Password must be between 12 and 256 characters.');
  }
  const salt = randomBytes(16);
  const result = await scryptAsync(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString('base64url')}$${result.toString('base64url')}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const parts = encodedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  try {
    const salt = Buffer.from(parts[1], 'base64url');
    const expected = Buffer.from(parts[2], 'base64url');
    if (salt.length !== 16 || expected.length !== 64) return false;
    const actual = await scryptAsync(password, salt, expected.length) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function platformCredentialsAreValid(email: string, securityKey: string): boolean {
  const expectedKey = getPlatformAdminKeys()[normalizeEmail(email)] || '';
  const supplied = Buffer.from(typeof securityKey === 'string' ? securityKey : '');
  const expected = Buffer.from(expectedKey);
  const keyMatches = expectedKey.length >= 32 && supplied.length === expected.length &&
    timingSafeEqual(supplied, expected);
  return hasSecureControlPlaneSecret() && keyMatches;
}

export function isPlatformAdminEmail(email: string): boolean {
  return Boolean(getPlatformAdminKeys()[normalizeEmail(email)]);
}

export function hasConfiguredPlatformAdminAccounts(): boolean {
  return Object.values(getPlatformAdminKeys()).some(key => key.length >= 32);
}

function getPlatformAdminKeys(): Record<string, string> {
  try {
    const parsed = JSON.parse(process.env.PLATFORM_ADMIN_CREDENTIALS_JSON || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([email, key]) => isValidEmail(email) && typeof key === 'string' && key.length >= 32)
        .map(([email, key]) => [normalizeEmail(email), key as string])
    );
  } catch {
    return {};
  }
}

export function hasSecureControlPlaneSecret(): boolean {
  const secret = process.env.CONTROL_PLANE_SECRET || '';
  return secret.length >= 32 &&
    secret !== 'default_insecure_secret' &&
    secret !== 'dev_insecure_fallback_secret_curriculum_server_2026_secure';
}

export function hasInvitationEmailConfiguration(): boolean {
  const apiKey = process.env.INVITATION_EMAIL_API_KEY;
  const from = process.env.INVITATION_EMAIL_FROM;
  const appUrl = process.env.APP_URL;
  if (!apiKey || !from || !appUrl) return false;
  try {
    const url = new URL(appUrl);
    return ['https:', ...(process.env.NODE_ENV === 'production' ? [] : ['http:'])].includes(url.protocol) &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function sendSchoolAdministratorInvitation(
  email: string,
  fullName: string,
  schoolName: string,
  token: string
): Promise<{ providerMessageId?: string }> {
  if (!hasInvitationEmailConfiguration()) throw new Error('Administrator invitation email is not configured.');
  const apiKey = process.env.INVITATION_EMAIL_API_KEY!;
  const from = process.env.INVITATION_EMAIL_FROM!;
  const baseUrl = new URL(process.env.APP_URL!);
  const activationUrl = new URL('/', baseUrl);
  activationUrl.searchParams.set('school_activation', token);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Activate your ${schoolName} administrator account`,
      text: `Hello ${fullName},\n\nUse this secure link to activate your administrator account for ${schoolName}:\n${activationUrl}\n\nThe link expires in 24 hours. If you did not expect this invitation, you can ignore this message.`,
      html: `<p>Hello ${escapeHtml(fullName)},</p><p>Use this secure link to activate your administrator account for <strong>${escapeHtml(schoolName)}</strong>.</p><p><a href="${escapeHtml(activationUrl.toString())}">Activate administrator account</a></p><p>The link expires in 24 hours. If you did not expect this invitation, you can ignore this message.</p>`
    }),
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) {
    throw new Error('Administrator invitation email could not be delivered.');
  }
  try {
    const body = await response.json() as { id?: unknown };
    return typeof body.id === 'string' && body.id.length <= 255
      ? { providerMessageId: body.id }
      : {};
  } catch {
    return {};
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]!);
}
