import React, { useState } from 'react';
import type {
  SchoolProvisioningConfirmation,
  SchoolProvisioningRequest
} from '../../packages/shared-types/src/apiContracts';
import { unifiedApiClient } from '../services/unifiedApiClient';

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

function getErrorDetails(error: unknown): { message: string; data?: SchoolProvisioningConfirmation } {
  const candidate = error as { error?: string; details?: SchoolProvisioningConfirmation };
  return {
    message: candidate?.error || 'School registration could not be completed.',
    data: candidate?.details
  };
}

export const SchoolRegistrationWizard: React.FC<SchoolRegistrationWizardProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [school, setSchool] = useState({
    name: '',
    displayName: '',
    schoolType: 'primary',
    country: 'Nigeria',
    stateProvince: '',
    city: '',
    physicalAddress: '',
    officialContactEmail: '',
    telephone: ''
  });
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
  const [platformEmail, setPlatformEmail] = useState('');
  const [securityKey, setSecurityKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SchoolProvisioningConfirmation | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  if (!isOpen) return null;

  const updateSchool = (key: keyof typeof school, value: string) => {
    setSchool(previous => ({ ...previous, [key]: value }));
    if (key === 'country') {
      const defaults = COUNTRY_DEFAULTS[value] || { timeZone: 'UTC', currency: 'USD', language: 'en' };
      setConfiguration(previous => ({ ...previous, ...defaults }));
    }
  };

  const payload: SchoolProvisioningRequest = {
    school,
    configuration,
    administrator,
    applicationId
  };

  const submitRegistration = async () => {
    setIsSubmitting(true);
    setError('');
    setResult(null);
    try {
      if (!unifiedApiClient.isAuthenticated('control_plane')) {
        const session = await unifiedApiClient.loginControlPlane(platformEmail, securityKey);
        unifiedApiClient.setControlPlaneToken(session.token);
        setSecurityKey('');
      }
      const confirmation = await unifiedApiClient.provisionSchool(payload, idempotencyKey);
      setResult(confirmation);
      setIdempotencyKey(newIdempotencyKey());
      setStep(5);
    } catch (requestError) {
      const details = getErrorDetails(requestError);
      setError(details.message);
      if (details.data) {
        setResult(details.data);
        setStep(5);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryInvitation = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const confirmation = await unifiedApiClient.provisionSchool(payload, idempotencyKey);
      setResult(confirmation);
      setIdempotencyKey(newIdempotencyKey());
      setError('');
    } catch (requestError) {
      const details = getErrorDetails(requestError);
      setError(details.message);
      if (details.data) setResult(details.data);
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
            <label className="block text-sm text-slate-300">
              <span className="mb-1.5 block">School type</span>
              <select value={school.schoolType} onChange={event => updateSchool('schoolType', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
                {['primary', 'secondary', 'combined', 'tertiary', 'other'].map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-1.5 block">Country</span>
              <input list="school-country-list" value={school.country} onChange={event => updateSchool('country', event.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5" />
              <datalist id="school-country-list">{Object.keys(COUNTRY_DEFAULTS).map(country => <option key={country} value={country} />)}</datalist>
            </label>
            <Field label="State / province" value={school.stateProvince} onChange={value => updateSchool('stateProvince', value)} />
            <Field label="City" value={school.city} onChange={value => updateSchool('city', value)} />
            <Field label="Official school email" type="email" value={school.officialContactEmail} onChange={value => updateSchool('officialContactEmail', value)} />
            <Field label="Telephone" type="tel" value={school.telephone} onChange={value => updateSchool('telephone', value)} />
            <div className="sm:col-span-2"><Field label="Physical address" value={school.physicalAddress} onChange={value => updateSchool('physicalAddress', value)} /></div>
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
              <span className="mb-1.5 block">Initial application</span>
              <select value={applicationId} onChange={event => setApplicationId(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
                <option value="app_curriculum_flow">Curriculum Flow</option>
              </select>
            </label>
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
              <h3 className="mb-2 mt-4 font-semibold text-white">First administrator</h3>
              <p>{administrator.fullName} · {administrator.email}</p>
              <p className="mt-3 text-slate-400">Application: {applicationId}. The Tests and Examinations capability will be enabled.</p>
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

        {step === 5 && result && (
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${result.administratorActivationStatus === 'delivery_pending' ? 'border-amber-700 bg-amber-950/30' : 'border-emerald-700 bg-emerald-950/30'}`}>
              <h3 className="text-lg font-semibold">{result.administratorActivationStatus === 'delivery_pending' ? 'School saved; invitation needs attention' : 'School registration saved'}</h3>
              <p className="mt-1 text-sm text-slate-300">
                {result.administratorActivationStatus === 'delivery_pending'
                  ? 'The school is not active. The administrator invitation was not delivered; retry after checking email delivery configuration.'
                  : 'The school instance is provisioning in the shared PostgreSQL database. It becomes active after the administrator accepts the email invitation.'}
              </p>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-400">School</dt><dd>{result.schoolName}</dd></div>
                <div><dt className="text-slate-400">Status</dt><dd>{result.instanceStatus}</dd></div>
                <div><dt className="text-slate-400">School ID</dt><dd className="break-all">{result.schoolId}</dd></div>
                <div><dt className="text-slate-400">Tenant ID</dt><dd className="break-all">{result.tenantId}</dd></div>
                <div><dt className="text-slate-400">Instance ID</dt><dd className="break-all">{result.instanceId}</dd></div>
                <div><dt className="text-slate-400">Administrator activation</dt><dd>{result.administratorActivationStatus}</dd></div>
              </dl>
            </div>
            {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
            <div className="flex justify-end gap-3">
              {result.administratorActivationStatus === 'delivery_pending' && (
                <button disabled={isSubmitting} onClick={retryInvitation} className="rounded-lg border border-amber-600 px-4 py-2.5 text-amber-100 disabled:opacity-60">
                  {isSubmitting ? 'Retrying…' : 'Retry invitation delivery'}
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
