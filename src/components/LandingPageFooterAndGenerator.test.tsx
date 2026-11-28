import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingFooter } from './LandingFooter';
import { EditFooterModal } from './EditFooterModal';
import { CurriculumServerPublicHome } from './CurriculumServerPublicHome';
import { CurriculumFlowPublicHome } from './CurriculumFlowPublicHome';
import { CurriculumServerLandingPage } from './CurriculumServerLandingPage';
import { SchoolPublicPortal } from './SchoolPublicPortal';
import { InstanceBrandedHomepage } from './InstanceBrandedHomepage';
import { LandingPageGeneratorPanel } from './LandingPageGeneratorPanel';
import { createDefaultLandingFooter, createDefaultPresetConfiguration } from '../data/homepageTemplatesData';
import { INITIAL_PROVISIONED_TENANTS, INITIAL_SAAS_METRICS } from '../mockCurriculumServerData';

test('LandingFooter renders live copyright, institutional address, email, phone, and Edit Footer trigger for Server and Flow', () => {
  const serverHtml = renderToStaticMarkup(
    <LandingFooter
      variant="curriculum_server"
      footer={{
        copyrightText: '© 2027 Sovereign Cloud Ltd.',
        institutionalAddress: '77 Admiralty Way, Lekki Phase 1, Lagos',
        email: 'cloud@curriculumserver.ng',
        phoneNumber: '+234 802 100 2000'
      }}
      onEditFooter={() => {}}
      canEditFooter={true}
    />
  );

  assert.match(serverHtml, /© 2027 Sovereign Cloud Ltd\./);
  assert.match(serverHtml, /77 Admiralty Way, Lekki Phase 1, Lagos/);
  assert.match(serverHtml, /cloud@curriculumserver\.ng/);
  assert.match(serverHtml, /\+234 802 100 2000/);
  assert.match(serverHtml, /Edit Footer/);

  const flowHtml = renderToStaticMarkup(
    <LandingFooter
      variant="curriculum_flow"
      footer={{
        copyrightText: '© 2027 Curriculum Flow OS.',
        institutionalAddress: '9 Maitama Boulevard, Abuja',
        email: 'hello@curriculumflow.ng',
        phoneNumber: '+234 809 300 4000'
      }}
      onEditFooter={() => {}}
      canEditFooter={true}
    />
  );

  assert.match(flowHtml, /© 2027 Curriculum Flow OS\./);
  assert.match(flowHtml, /9 Maitama Boulevard, Abuja/);
  assert.match(flowHtml, /hello@curriculumflow\.ng/);
  assert.match(flowHtml, /\+234 809 300 4000/);
  assert.match(flowHtml, /Edit Footer/);
});

test('CurriculumServerPublicHome, CurriculumFlowPublicHome, CurriculumServerLandingPage, and SchoolPublicPortal render live edited footer fields', () => {
  const serverFooter = {
    ...createDefaultLandingFooter('curriculum_server'),
    copyrightText: '© 2027 Custom Server Footer Copyright',
    institutionalAddress: 'Plot 55 Independence Layout, Enugu',
    email: 'custom-server@curriculumserver.ng',
    phoneNumber: '+234 700 888 1212'
  };
  const serverHomeHtml = renderToStaticMarkup(
    <CurriculumServerPublicHome
      onGetStarted={() => {}}
      onExploreFlow={() => {}}
      onOpenControlPlaneLogin={() => {}}
      initialFooter={serverFooter}
    />
  );
  assert.match(serverHomeHtml, /© 2027 Custom Server Footer Copyright/);
  assert.match(serverHomeHtml, /Plot 55 Independence Layout, Enugu/);
  assert.match(serverHomeHtml, /custom-server@curriculumserver\.ng/);
  assert.match(serverHomeHtml, /\+234 700 888 1212/);
  assert.match(serverHomeHtml, /Edit Footer/);

  const serverLegacyHtml = renderToStaticMarkup(
    <CurriculumServerLandingPage
      tenants={INITIAL_PROVISIONED_TENANTS}
      metrics={INITIAL_SAAS_METRICS}
      onLaunchTenant={() => {}}
      onOpenConnectModal={() => {}}
      onNavigateToMasterConsole={() => {}}
      initialFooter={serverFooter}
    />
  );
  assert.match(serverLegacyHtml, /© 2027 Custom Server Footer Copyright/);
  assert.match(serverLegacyHtml, /Plot 55 Independence Layout, Enugu/);
  assert.match(serverLegacyHtml, /Edit Footer/);

  const flowFooter = {
    ...createDefaultLandingFooter('curriculum_flow'),
    copyrightText: '© 2027 Custom Flow Footer Copyright',
    institutionalAddress: '14 Ahmadu Bello Way, Kaduna',
    email: 'custom-flow@curriculumflow.ng',
    phoneNumber: '+234 818 222 3344'
  };
  const flowHomeHtml = renderToStaticMarkup(
    <CurriculumFlowPublicHome
      onEnterSchoolWorkspace={() => {}}
      onSelectRoleLogin={() => {}}
      onSwitchToServer={() => {}}
      initialFooter={flowFooter}
    />
  );
  assert.match(flowHomeHtml, /© 2027 Custom Flow Footer Copyright/);
  assert.match(flowHomeHtml, /14 Ahmadu Bello Way, Kaduna/);
  assert.match(flowHomeHtml, /custom-flow@curriculumflow\.ng/);
  assert.match(flowHomeHtml, /\+234 818 222 3344/);
  assert.match(flowHomeHtml, /Edit Footer/);

  const tenant = INITIAL_PROVISIONED_TENANTS[0];
  const portalHtml = renderToStaticMarkup(
    <SchoolPublicPortal
      tenant={tenant}
      onOpenAuthModal={() => {}}
      onNavigateToTab={() => {}}
      initialFooter={{
        copyrightText: '© 2027 Greenfield Portal Live Copyright',
        institutionalAddress: 'Plot 99 Victoria Island Annex, Lagos',
        email: 'portal-live@greenfield.edu.ng',
        phoneNumber: '+234 806 555 6677'
      }}
    />
  );
  assert.match(portalHtml, /© 2027 Greenfield Portal Live Copyright/);
  assert.match(portalHtml, /Plot 99 Victoria Island Annex, Lagos/);
  assert.match(portalHtml, /portal-live@greenfield\.edu\.ng/);
  assert.match(portalHtml, /\+234 806 555 6677/);
  assert.match(portalHtml, /Edit Footer/);
});

test('InstanceBrandedHomepage renders live footer fields cleanly without trailing commas', () => {
  const tenant = INITIAL_PROVISIONED_TENANTS[0];
  const config = createDefaultPresetConfiguration(
    tenant.id,
    tenant.id,
    tenant.schoolSlug,
    tenant.schoolName,
    'secondary_school',
    'premium_academic',
    tenant.subdomain
  );
  config.contact = {
    ...config.contact,
    addressText: '18 Bourdillon Road, Ikoyi, Lagos',
    city: '',
    state: '',
    primaryEmail: 'admin-live@greenfield.sch.ng',
    primaryPhone: '+234 803 999 1122',
    copyrightText: '© 2027 Greenfield Academy Branded Homepage.'
  };

  const html = renderToStaticMarkup(
    <InstanceBrandedHomepage
      config={config}
      onEnterWorkspace={() => {}}
      isAdminUser={true}
    />
  );

  assert.match(html, /© 2027 Greenfield Academy Branded Homepage\./);
  assert.match(html, /18 Bourdillon Road, Ikoyi, Lagos/);
  assert.doesNotMatch(html, /18 Bourdillon Road, Ikoyi, Lagos,\s*,/);
  assert.match(html, /admin-live@greenfield\.sch\.ng/);
  assert.match(html, /\+234 803 999 1122/);
  assert.match(html, /Edit Footer/);
});

test('LandingPageGeneratorPanel lists every provisioned instance with Landing Page Editor and Edit Footer controls', () => {
  const tenants = INITIAL_PROVISIONED_TENANTS;
  const html = renderToStaticMarkup(
    <LandingPageGeneratorPanel
      tenants={tenants}
      onPreviewInstance={() => {}}
      onEnterWorkspace={() => {}}
    />
  );

  const normalizedHtml = html.replace(/&#x27;/g, "'");
  assert.match(normalizedHtml, /Landing Page Generator/);
  for (const tenant of tenants) {
    assert.ok(normalizedHtml.includes(tenant.schoolName), `Expected generator to list ${tenant.schoolName}`);
  }
  assert.match(normalizedHtml, /Landing Page Editor/);
  assert.match(normalizedHtml, /Edit Footer/);
});

test('EditFooterModal exposes copyright, institutional address, email, and phone inputs plus live preview', () => {
  const modalHtml = renderToStaticMarkup(
    <EditFooterModal
      isOpen={true}
      initialValues={{
        copyrightText: '© 2027 Demo Copyright',
        institutionalAddress: '100 Academic Way',
        email: 'demo@school.ng',
        phoneNumber: '+234 800 111 2222'
      }}
      onSave={() => {}}
      onCancel={() => {}}
    />
  );

  assert.match(modalHtml, /Copyright Text/);
  assert.match(modalHtml, /Institutional Address/);
  assert.match(modalHtml, /Email/);
  assert.match(modalHtml, /Phone Number/);
  assert.match(modalHtml, /Live Footer Preview/);
  assert.match(modalHtml, /Save Footer/);
});
