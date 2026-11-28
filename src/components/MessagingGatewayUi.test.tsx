import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { UserAuthAccount } from '../types';
import { AuthModal } from './AuthModal';
import { PlatformMessagingGatewayPortal } from './PlatformMessagingGatewayPortal';
import { ProvisionSchoolModal } from './ProvisionSchoolModal';
import { SchoolMessagingGatewayTab } from './SchoolMessagingGatewayTab';
import { SchoolRegistrationWizard } from './SchoolRegistrationWizard';

const mockAuthAccount: UserAuthAccount = {
  id: 'acc_test_1',
  userId: 'user_test_1',
  staffOrStudentId: 'STF-001',
  fullName: 'Adaeze Principal',
  email: 'principal@crestview.edu.ng',
  isEmailVerified: true,
  phone: '+2348031112233',
  isPhoneVerified: false,
  isGoogleLinked: false,
  avatar: 'AP',
  authProviders: ['email_password'],
  mfaEnabled: false,
  primaryRole: 'principal_admin',
  assignedAdminRoles: [],
  status: 'active',
  lastLoginAt: '2026-11-27T00:00:00.000Z',
  lastLoginIp: '127.0.0.1',
  lastLoginMethod: 'email_password',
  securityRiskLevel: 'low',
  passwordLastChanged: '2026-11-01T00:00:00.000Z'
};

test('PlatformMessagingGatewayPortal renders control-plane SMS/WhatsApp sections without raw secret leaks', () => {
  const html = renderToStaticMarkup(<PlatformMessagingGatewayPortal />);
  assert.match(html, /Central Messaging &amp; Authentication Gateway/);
  assert.match(html, /Platform Control-Plane Auth &amp; Recovery Channel Policy/);
  assert.match(html, /Registered Delivery Providers/);
  assert.match(html, /Configure Encrypted Provider Connection/);
  assert.match(html, /WhatsApp Template Approval Registry/);
  assert.match(html, /Send Platform Operational Alert/);
  assert.doesNotMatch(html, /SENDCHAMP_API_KEY|META_WHATSAPP_ACCESS_TOKEN|TERMII_API_KEY/);
});

test('SchoolMessagingGatewayTab renders tenant communications UI and never collects provider API keys', () => {
  const html = renderToStaticMarkup(<SchoolMessagingGatewayTab schoolName="Crestview Academy" />);
  assert.match(html, /SMS &amp; WhatsApp Communication Console/);
  assert.match(html, /Crestview Academy/);
  assert.match(html, /Targeted 1:1 Notification/);
  assert.match(html, /Group, Class, Role &amp; Emergency Broadcast/);
  assert.match(html, /Recipient Consent &amp; Opt-Out Preferences/);
  assert.doesNotMatch(html, /SENDCHAMP_API_KEY|META_WHATSAPP_ACCESS_TOKEN|TERMII_API_KEY|webhookSecret/i);
});

test('AuthModal renders real CMAG OTP controls without hardcoded Auto-fill OTP demo code', () => {
  const signInHtml = renderToStaticMarkup(
    <AuthModal
      isOpen={true}
      onClose={() => {}}
      currentAccount={mockAuthAccount}
      allAccounts={[mockAuthAccount]}
      onLoginSuccess={() => {}}
      onUpdateAccount={() => {}}
      initialMode="signin"
    />
  );
  assert.match(signInHtml, /Phone OTP/);
  assert.doesNotMatch(signInHtml, /Auto-fill OTP|948215/);

  const otpHtml = renderToStaticMarkup(
    <AuthModal
      isOpen={true}
      onClose={() => {}}
      currentAccount={mockAuthAccount}
      allAccounts={[mockAuthAccount]}
      onLoginSuccess={() => {}}
      onUpdateAccount={() => {}}
      initialMode="phone_verify"
    />
  );
  assert.match(otpHtml, /Mobile Phone Number Verification &amp; MFA/);
  assert.match(otpHtml, /Send 6-Digit SMS Verification Code/);
  assert.doesNotMatch(otpHtml, /Auto-fill OTP|948215/);
});

test('SchoolRegistrationWizard and ProvisionSchoolModal never collect provider secrets during school onboarding', () => {
  const regHtml = renderToStaticMarkup(
    <SchoolRegistrationWizard
      isOpen={true}
      onClose={() => {}}
    />
  );
  assert.match(regHtml, /Create a school environment/);
  assert.doesNotMatch(regHtml, /SENDCHAMP_API_KEY|META_WHATSAPP_ACCESS_TOKEN|TERMII_API_KEY/i);

  const provHtml = renderToStaticMarkup(
    <ProvisionSchoolModal
      isOpen={true}
      onClose={() => {}}
      onProvisionSuccess={() => {}}
    />
  );
  assert.match(provHtml, /Provision New School Instance/);
  assert.doesNotMatch(provHtml, /SENDCHAMP_API_KEY|META_WHATSAPP_ACCESS_TOKEN|TERMII_API_KEY/i);
});
