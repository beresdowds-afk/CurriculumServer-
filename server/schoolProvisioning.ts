import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { SchoolProvisioningRequest } from '../packages/shared-types/src/apiContracts';

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
    ['applicationId', request.applicationId, 64]
  ];
  for (const [field, candidate, maxLength] of requiredText) {
    if (typeof candidate !== 'string' || !candidate.trim() || candidate.trim().length > maxLength) {
      throw new Error(`${field} is required and must be at most ${maxLength} characters.`);
    }
    if (!['primary', 'secondary', 'combined', 'tertiary', 'other'].includes(request.school.schoolType.toLowerCase())) {
      throw new Error('Choose a supported school type.');
    }
  }
  if (!isValidEmail(request.school.officialContactEmail) || !isValidEmail(request.administrator.email)) {
    throw new Error('Enter valid official school and administrator email addresses.');
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
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(request.applicationId)) {
    throw new Error('Application identifier has an invalid format.');
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
    applicationId: request.applicationId.trim()
  };
}

export function createInvitationToken(): { token: string; tokenHash: Buffer } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: createHash('sha256').update(token).digest() };
}

export function hashProvisioningRequest(request: SchoolProvisioningRequest): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
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
): Promise<void> {
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
