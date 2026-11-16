import React, { useEffect, useState } from 'react';
import type {
  SchoolProvisioningOperationResponse,
  SchoolProvisioningConfirmation,
  SchoolProvisioningRequest
} from '../../packages/shared-types/src/apiContracts';
import { unifiedApiClient } from '../services/unifiedApiClient';
import { INITIAL_REGISTERED_APPLICATIONS, INITIAL_REGISTERED_FEATURES } from '../data/applicationRegistryData';

interface SchoolRegistrationWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const COUNTRY_DEFAULTS: Record<string, { timeZone: string; currency: string; language: string }> = {
  Nigeria: { timeZone: 'Africa/Lagos', currency: 'NGN', language: 'en' },
  'United States': { timeZone: 'America/New_York', currency: 'USD', language: 'en' },
  'United Kingdom': { timeZone: 'Europe/London', currency: 'GBP', language: 'en' },
  India: { timeZone: 'Asia/Kolkata', currency: 'INR', language: 'en' },
  Kenya: { timeZone: 'Africa/Nairobi', currency: 'KES', language: 'en' },
  Ghana: { timeZone: 'Africa/Accra', currency: 'GHS', language: 'en' },
  Canada: { timeZone: 'America/Toronto', currency: 'CAD', language: 'en' },
  Australia: { timeZone: 'Australia/Sydney', currency: 'AUD', language: 'en' }
};

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

function getErrorDetails(error: unknown): {
  message: string;
  provisioning?: SchoolProvisioningConfirmation;
  operation?: SchoolProvisioningOperationResponse;
} {
  const candidate = error as {
    error?: string;
    details?: SchoolProvisioningConfirmation | SchoolProvisioningOperationResponse;
  };
  const details = candidate?.details;
  const isOperation = Boolean(details && 'status' in details && 'attemptCount' in details);
  return {
    message: candidate?.error || 'School registration could not be completed.',
    ...(isOperation
      ? {
          operation: details as SchoolProvisioningOperationResponse,
          provisioning: (details as SchoolProvisioningOperationResponse).provisioning
        }
      : { provisioning: details as SchoolProvisioningConfirmation | undefined })
  };
}

export const SchoolRegistrationWizard: React.FC<SchoolRegistrationWizardProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [school, setSchool] = useState({
    name: '',
    displayName: '',
    shortName: '',
    slug: '',
    schoolType: 'primary',
    country: 'Nigeria',
    stateProvince: '',
    city: '',
    physicalAddress: '',
    officialContactEmail: '',
    telephone: '',
    website: '',
    motto: '',
    principalName: '',
    principalEmail: '',
    principalPhone: '',
    ictAdministratorName: '',
    ictAdministratorEmail: '',
    ictAdministratorPhone: '',
    logoUrl: '',
    primaryBrandColor: '#1d4ed8',
    accentBrandColor: '#0f766e'
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [configuration, setConfiguration] = useState({
    timeZone: COUNTRY_DEFAULTS.Nigeria.timeZone,
    currency: COUNTRY_DEFAULTS.Nigeria.currency,
    language: COUNTRY_DEFAULTS.Nigeria.language,
    academicSession: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    academicTermStructure: [{ name: 'Term 1' }],
    educationLevels: ['Primary'],
    gradingConfiguration: {}
  });
  const [administrator, setAdministrator] = useState({ fullName: '', email: '' });
  const [applicationId, setApplicationId] = useState('app_curriculum_flow');
  const [selectedFeatures, setSelectedFeatures] = useState(['feat_school_administration_identity']);
  const [commercialModel, setCommercialModel] = useState<'monthly' | 'annual' | 'lease_to_own'>('annual');
  const [planReference, setPlanReference] = useState('school-standard');
  const [priceReference, setPriceReference] = useState('manual-approval-required');
  const [agreedAmount, setAgreedAmount] = useState('');
  const [requestedSubdomain, setRequestedSubdomain] = useState('');
  const [requestedCustomDomain, setRequestedCustomDomain] = useState('');
  const [platformEmail, setPlatformEmail] = useState('');
  const [securityKey, setSecurityKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SchoolProvisioningConfirmation | null>(null);
  const [operation, setOperation] = useState<SchoolProvisioningOperationResponse | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  useEffect(() => {
    if (!isOpen || !unifiedApiClient.isAuthenticated('control_plane')) return;
    const operationId = new URLSearchParams(window.location.search).get('provisioning_operation');
    if (!operationId) return;
    setStep(5);
    setIsSubmitting(true);
    unifiedApiClient.getSchoolProvisioningOperation(operationId)
      .then(record => {
        setOperation(record);
        setResult(record.provisioning || null);
      })
      .catch(error => setError(getErrorDetails(error).message))
      .finally(() => setIsSubmitting(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const updateSchool = (key: keyof typeof school, value: string) => {
    setSchool(previous => ({
      ...previous,
      [key]: value,
      ...(key === 'name' && !slugEdited
        ? {
            shortName: value.trim().split(/\s+/).slice(0, 3).join(' '),
            slug: value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 63)
          }
        : {})
    }));
    if (key === 'country') {
      const defaults = COUNTRY_DEFAULTS[value] || { timeZone: 'UTC', currency: 'USD', language: 'en' };
      setConfiguration(previous => ({ ...previous, ...defaults }));
    }
  };

  const payload: SchoolProvisioningRequest = {
    school,
    configuration,
    administrator,
    applicationId,
    architecture: 'shared_database',
    templateId: 'school-standard',
    templateVersion: '1',
    enabledFeatures: selectedFeatures,
    commercial: {
      commercialModel,
      planReference,
      priceReference,
      currency: configuration.currency,
      billingInterval: commercialModel === 'monthly' ? 'month' :
        commercialModel === 'annual' ? 'year' : 'lease',
      ...(agreedAmount && Number.isSafeInteger(Number(agreedAmount))
        ? { agreedAmountMinor: Number(agreedAmount) }
        : {})
    },
    deployment: { requestedSubdomain, requestedCustomDomain }
  };

  const submitRegistration = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      if (!unifiedApiClient.isAuthenticated('control_plane')) {
        const session = await unifiedApiClient.loginControlPlane(platformEmail, securityKey);
        unifiedApiClient.setControlPlaneToken(session.token);
        setSecurityKey('');
      }
      const confirmation = await unifiedApiClient.provisionSchool(payload, idempotencyKey);
      setResult(confirmation);
      setStep(5);
      const url = new URL(window.location.href);
      url.searchParams.set('provisioning_operation', confirmation.operationId);
      window.history.replaceState(null, '', url);
      setIdempotencyKey(newIdempotencyKey());
      try {
        setOperation(await unifiedApiClient.getSchoolProvisioningOperation(confirmation.operationId));
      } catch {
        setError('School state was saved, but status refresh is temporarily unavailable.');
      }
    } catch (requestError) {
      const details = getErrorDetails(requestError);
      setError(details.message);
      if (details.operation) {
        setOperation(details.operation);
        const url = new URL(window.location.href);
        url.searchParams.set('provisioning_operation', details.operation.operationId);
        window.history.replaceState(null, '', url);
      }
      if (details.provisioning) {
        setResult(details.provisioning);
        const url = new URL(window.location.href);
        url.searchParams.set('provisioning_operation', details.provisioning.operationId);
        window.history.replaceState(null, '', url);
        setStep(5);
      } else if (details.operation) {
        setStep(5);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshProvisioning = async () => {
    const operationId = operation?.operationId || result?.operationId;
    if (!operationId) return;
    setIsSubmitting(true);
    setError('');
    try {
      const refreshed = await unifiedApiClient.getSchoolProvisioningOperation(operationId);
      setOperation(refreshed);
      setResult(refreshed.provisioning || null);
    } catch (requestError) {
      setError(getErrorDetails(requestError).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryProvisioning = async () => {
    const operationId = operation?.operationId || result?.operationId;
    if (!operationId) return;
    setIsSubmitting(true);
    setError('');
    try {
      const refreshed = await unifiedApiClient.retrySchoolProvisioning(operationId);
      setOperation(refreshed);
      setResult(refreshed.provisioning || null);
    } catch (requestError) {
      const details = getErrorDetails(requestError);
      setError(details.message);
      if (details.operation) setOperation(details.operation);
      if (details.provisioning) setResult(details.provisioning);
    } finally {
      setIsSubmitting(false);
    }
  };

  const Field = ({ label, value, onChange, type = 'text', required = true }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
  }) => (
    <label className="block text-sm text-slate-300">
      <span className="mb-1.5 block">{label}</span>
      <input
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-purple-400"
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        required={required}
        maxLength={type === 'email' ? 254 : undefined}
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-6">
      <section className="my-auto w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-purple-300">School instance registration</p>
            <h2 className="mt-1 text-2xl font-bold">Create a school environment</h2>
            {step < 5 && <p className="mt-2 text-sm text-slate-400">Step {step} of 4</p>}
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close registration">✕</button>
        </div>

        {step === 1 && (
          <form onSubmit={event => { event.preventDefault(); setStep(2); }} className="grid gap-4 sm:grid-cols-2">
            <Field label="School name" value={school.name} onChange={value => updateSchool('name', value)} />
            <Field label="Display name" value={school.displayName} onChange={value => updateSchool('displayName', value)} />
            <Field label="Short name" value={school.shortName} onChange={value => updateSchool('shortName', value)} />
            <Field label="Unique school slug" value={school.slug} onChange={value => { setSlugEdited(true); updateSchool('slug', value); }} />
            <Field label="School type" value={school.schoolType} onChange={value => updateSchool('schoolType', value)} />
            <label className="block text-sm text-slate-300">
              <span className="mb-1.5 block">Country</span>
              <input list="school-country-list" value={school.country} onChange={event => updateSchool('country', event.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5" />
              <datalist id="school-country-list">{Object.keys(COUNTRY_DEFAULTS).map(country => <option key={country} value={country} />)}</datalist>
            </label>
            <Field label="State / province" value={school.stateProvince} onChange={value => updateSchool('stateProvince', value)} />
            <Field label="City" value={school.city} onChange={value => updateSchool('city', value)} />
            <Field label="Official school email" type="email" value={school.officialContactEmail} onChange={value => updateSchool('officialContactEmail', value)} />
            <Field label="Telephone" type="tel" value={school.telephone} onChange={value => updateSchool('telephone', value)} />
            <Field label="School website" type="url" required={false} value={school.website} onChange={value => updateSchool('website', value)} />
            <Field label="School motto" required={false} value={school.motto} onChange={value => updateSchool('motto', value)} />
            <div className="sm:col-span-2"><Field label="Physical address" value={school.physicalAddress} onChange={value => updateSchool('physicalAddress', value)} /></div>
            <h3 className="sm:col-span-2 mt-2 font-semibold text-white">School leadership contacts</h3>
            <Field label="Principal / headteacher name" required={false} value={school.principalName} onChange={value => updateSchool('principalName', value)} />
            <Field label="Principal email" type="email" required={false} value={school.principalEmail} onChange={value => updateSchool('principalEmail', value)} />
            <Field label="Principal telephone" type="tel" required={false} value={school.principalPhone} onChange={value => updateSchool('principalPhone', value)} />
            <Field label="ICT administrator name" required={false} value={school.ictAdministratorName} onChange={value => updateSchool('ictAdministratorName', value)} />
            <Field label="ICT administrator email" type="email" required={false} value={school.ictAdministratorEmail} onChange={value => updateSchool('ictAdministratorEmail', value)} />
            <Field label="ICT administrator telephone" type="tel" required={false} value={school.ictAdministratorPhone} onChange={value => updateSchool('ictAdministratorPhone', value)} />
            <h3 className="sm:col-span-2 mt-2 font-semibold text-white">Branding</h3>
            <Field label="Logo URL (HTTPS)" type="url" required={false} value={school.logoUrl} onChange={value => updateSchool('logoUrl', value)} />
            <Field label="Primary brand color" type="color" value={school.primaryBrandColor} onChange={value => updateSchool('primaryBrandColor', value)} />
            <Field label="Accent brand color" type="color" value={school.accentBrandColor} onChange={value => updateSchool('accentBrandColor', value)} />
            <div className="sm:col-span-2 flex justify-end">
              <button className="rounded-lg bg-purple-600 px-5 py-2.5 font-semibold hover:bg-purple-500">Continue</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={event => { event.preventDefault(); setStep(3); }} className="grid gap-4 sm:grid-cols-2">
            <Field label="Time zone" value={configuration.timeZone} onChange={value => setConfiguration(previous => ({ ...previous, timeZone: value }))} />
            <Field label="Currency (ISO code)" value={configuration.currency} onChange={value => setConfiguration(previous => ({ ...previous, currency: value.toUpperCase() }))} />
            <Field label="Default language" value={configuration.language} onChange={value => setConfiguration(previous => ({ ...previous, language: value }))} />
            <Field label="Academic session" value={configuration.academicSession} onChange={value => setConfiguration(previous => ({ ...previous, academicSession: value }))} />
            <Field label="Academic terms (comma-separated)" value={configuration.academicTermStructure.map(term => term.name).join(', ')} onChange={value => setConfiguration(previous => ({ ...previous, academicTermStructure: value.split(',').map(name => ({ name: name.trim() })).filter(term => term.name) }))} />
            <Field label="Education levels (comma-separated)" value={configuration.educationLevels.join(', ')} onChange={value => setConfiguration(previous => ({ ...previous, educationLevels: value.split(',').map(level => level.trim()).filter(Boolean) }))} />
            <div className="sm:col-span-2 flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="rounded-lg border border-slate-700 px-5 py-2.5 text-slate-200">Back</button>
              <button className="rounded-lg bg-purple-600 px-5 py-2.5 font-semibold hover:bg-purple-500">Continue</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={event => { event.preventDefault(); setStep(4); }} className="space-y-4">
            <p className="text-sm text-slate-400">The administrator will receive a one-time email invitation and set a password after verifying access to the invited email address.</p>
            <Field label="First administrator full name" value={administrator.fullName} onChange={value => setAdministrator(previous => ({ ...previous, fullName: value }))} />
            <Field label="First administrator email" type="email" value={administrator.email} onChange={value => setAdministrator(previous => ({ ...previous, email: value }))} />
            <label className="block text-sm text-slate-300">
              <span className="mb-1.5 block">Application product</span>
              <select value={applicationId} onChange={event => setApplicationId(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
                {INITIAL_REGISTERED_APPLICATIONS.filter(app =>
                  app.lifecycleStatus === 'published' &&
                  INITIAL_REGISTERED_FEATURES.some(feature =>
                    feature.applicationAssociation === app.appId &&
                    feature.readiness?.includes('provisionable') &&
                    feature.readiness.includes('production_approved')
                  )
                ).map(app =>
                  <option key={app.appId} value={app.appId}>{app.name}</option>
                )}
              </select>
            </label>
            <div className="sm:col-span-2 rounded-xl border border-slate-700 p-4">
              <h3 className="font-semibold text-white">Production-approved features</h3>
              <p className="mb-3 mt-1 text-xs text-slate-400">
                Only registry capabilities marked provisionable and production-approved are selectable. The shared PostgreSQL architecture is used; no dedicated cloud resources are created.
              </p>
              <div className="space-y-2">
                {INITIAL_REGISTERED_FEATURES.filter(feature =>
                  feature.applicationAssociation === applicationId &&
                  feature.readiness?.includes('provisionable') &&
                  feature.readiness.includes('production_approved')
                ).map(feature => (
                  <label key={feature.featureId} className="flex items-start gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={selectedFeatures.includes(feature.featureId)}
                      onChange={event => setSelectedFeatures(previous =>
                        event.target.checked
                          ? [...new Set([...previous, feature.featureId])]
                          : previous.filter(id => id !== feature.featureId)
                      )}
                    />
                    <span>{feature.name}<span className="ml-2 font-mono text-xs text-slate-500">{feature.featureId}</span></span>
                  </label>
                ))}
              </div>
            </div>
            <h3 className="sm:col-span-2 mt-2 font-semibold text-white">Commercial configuration</h3>
            <label className="block text-sm text-slate-300">
              <span className="mb-1.5 block">Commercial model</span>
              <select value={commercialModel} onChange={event => setCommercialModel(event.target.value as typeof commercialModel)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
                <option value="monthly">Monthly subscription</option>
                <option value="annual">Annual subscription</option>
                <option value="lease_to_own">Lease-to-own (manual approval)</option>
              </select>
            </label>
            <Field label="Plan reference" value={planReference} onChange={setPlanReference} />
            <Field label="Pricing reference" value={priceReference} onChange={setPriceReference} />
            <Field label="Agreed amount (minor currency units)" required={false} value={agreedAmount} onChange={setAgreedAmount} />
            <p className="sm:col-span-2 text-xs text-amber-300">
              Payment remains pending unless a verified provider or authorized manual approval records evidence. This workflow does not verify or initiate a payment.
            </p>
            <h3 className="sm:col-span-2 mt-2 font-semibold text-white">Domain request (not a DNS/TLS deployment)</h3>
            <Field label="Requested subdomain" required={false} value={requestedSubdomain} onChange={setRequestedSubdomain} />
            <Field label="Requested custom domain" required={false} value={requestedCustomDomain} onChange={setRequestedCustomDomain} />
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(2)} className="rounded-lg border border-slate-700 px-5 py-2.5 text-slate-200">Back</button>
              <button className="rounded-lg bg-purple-600 px-5 py-2.5 font-semibold hover:bg-purple-500">Review registration</button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm">
              <h3 className="mb-2 font-semibold text-white">School</h3>
              <p>{school.displayName} · {school.schoolType}</p>
              <p className="text-slate-400">{school.city}, {school.stateProvince}, {school.country}</p>
              <p className="mt-3 text-slate-300">{configuration.timeZone} · {configuration.currency} · {configuration.language}</p>
              <p className="text-slate-400">{configuration.academicSession} · {configuration.academicTermStructure.map(term => term.name).join(', ')}</p>
              <p className="mt-2 text-slate-300">Slug: {school.slug} · Short name: {school.shortName}</p>
              <h3 className="mb-2 mt-4 font-semibold text-white">First administrator</h3>
              <p>{administrator.fullName} · {administrator.email}</p>
              <p className="mt-3 text-slate-400">
                Product: {applicationId} · Architecture: shared PostgreSQL · Features: {selectedFeatures.join(', ')}
              </p>
              <p className="text-slate-400">
                Commercial: {commercialModel} · {planReference} / {priceReference} · {configuration.currency}
              </p>
              <p className="text-slate-400">
                Domain requests: {requestedSubdomain || 'none'} {requestedCustomDomain ? `· ${requestedCustomDomain}` : ''}
              </p>
              <p className="mt-2 text-xs text-amber-300">
                No payment, DNS, TLS, dedicated database, or external deployment will be reported as verified by this request.
              </p>
            </div>
            {!unifiedApiClient.isAuthenticated('control_plane') && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Authorized platform administrator email" type="email" value={platformEmail} onChange={setPlatformEmail} />
                <Field label="Platform security key" type="password" value={securityKey} onChange={setSecurityKey} />
              </div>
            )}
            {error && <p role="alert" className="rounded-lg border border-rose-700/60 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="rounded-lg border border-slate-700 px-5 py-2.5 text-slate-200">Back</button>
              <button disabled={isSubmitting} onClick={submitRegistration} className="rounded-lg bg-purple-600 px-5 py-2.5 font-semibold disabled:cursor-wait disabled:opacity-60">
                {isSubmitting ? 'Saving school registration…' : 'Confirm and create school'}
              </button>
            </div>
          </div>
        )}

        {step === 5 && (result || operation) && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <h3 className="text-lg font-semibold">Persisted provisioning status</h3>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-400">Operation</dt><dd>{operation?.status || result?.provisioningStatus || 'not started'}</dd></div>
                <div><dt className="text-slate-400">Attempts</dt><dd>{operation?.attemptCount ?? '—'}</dd></div>
                <div><dt className="text-slate-400">Configuration readiness</dt><dd>{result?.configurationReadiness || 'pending'}</dd></div>
                <div><dt className="text-slate-400">Application runtime readiness</dt><dd>{result?.applicationReadiness || 'pending'}</dd></div>
                <div><dt className="text-slate-400">Instance lifecycle</dt><dd>{result?.instanceStatus || 'not created'}</dd></div>
                <div><dt className="text-slate-400">Administrator invitation delivery</dt><dd>{result?.invitationDeliveryStatus || 'pending'}</dd></div>
                <div><dt className="text-slate-400">Administrator activation</dt><dd>{result?.administratorActivationStatus || 'pending'}</dd></div>
                <div><dt className="text-slate-400">Deployment</dt><dd>{result?.deploymentStatus || 'not verified'}</dd></div>
                {result && <div><dt className="text-slate-400">School</dt><dd>{result.schoolName} · {result.schoolId}</dd></div>}
                {result && <div><dt className="text-slate-400">Tenant</dt><dd className="break-all">{result.tenantId}</dd></div>}
                {result && <div><dt className="text-slate-400">Application instance</dt><dd className="break-all">{result.instanceId}</dd></div>}
                <div><dt className="text-slate-400">Operation ID</dt><dd className="break-all">{operation?.operationId || result?.operationId}</dd></div>
              </dl>
              {result?.deploymentStatus === 'manual_action_required' && (
                <p className="mt-3 text-xs text-amber-300">Requested DNS/TLS configuration is recorded for manual follow-up; no external deployment is claimed.</p>
              )}
              {operation?.error && <p role="alert" className="mt-3 text-sm text-rose-300">{operation.error.code}: {operation.error.message}</p>}
            </div>
            {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
            <div className="flex justify-end gap-3">
              {(result || operation) && (
                <button disabled={isSubmitting} onClick={refreshProvisioning} className="rounded-lg border border-slate-600 px-4 py-2.5 text-slate-100 disabled:opacity-60">
                  {isSubmitting ? 'Refreshing…' : 'Refresh status'}
                </button>
              )}
              {(operation?.retryable ||
                result?.invitationDeliveryStatus === 'retryable_failure' ||
                result?.invitationDeliveryStatus === 'pending') && (
                <button disabled={isSubmitting} onClick={retryProvisioning} className="rounded-lg border border-amber-600 px-4 py-2.5 text-amber-100 disabled:opacity-60">
                  {isSubmitting ? 'Retrying…' : 'Retry provisioning / invitation'}
                </button>
              )}
              <button onClick={onClose} className="rounded-lg bg-purple-600 px-5 py-2.5 font-semibold">Close</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
