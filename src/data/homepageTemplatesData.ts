import { 
  HomepageTemplateDefinition, 
  HomepageTemplateId, 
  InstitutionPresetType, 
  HomepageConfiguration, 
  InstanceBrandingConfig, 
  InstanceHeroConfig, 
  InstanceAuthPresentationConfig, 
  InstanceContactInfo, 
  HomepageSectionConfig 
} from '../types/homepageEngine';

export const HOMEPAGE_TEMPLATES: HomepageTemplateDefinition[] = [
  {
    id: 'modern_minimalist',
    name: 'Modern Minimalist',
    category: 'Modern',
    description: 'Clean typographic layout with generous spatial breathing room, refined hairline borders, and focus on essential institutional identity.',
    previewColorPrimary: '#0f172a',
    previewColorSecondary: '#475569',
    recommendedPresets: ['secondary_school', 'custom_org', 'vocational'],
    typographySuggestion: 'Plus Jakarta Sans',
    defaultBorderRadius: 'md'
  },
  {
    id: 'premium_academic',
    name: 'Premium Academic',
    category: 'Academic',
    description: 'Distinguished collegiate aesthetic with traditional academic prestige, regal crest emphasis, and editorial serif headline pairings.',
    previewColorPrimary: '#064e3b',
    previewColorSecondary: '#0f766e',
    recommendedPresets: ['secondary_school', 'college', 'university'],
    typographySuggestion: 'Playfair Display',
    defaultBorderRadius: 'lg'
  },
  {
    id: 'contemporary_corporate',
    name: 'Contemporary Corporate',
    category: 'Corporate',
    description: 'Structured enterprise grid with confident technology accents, high-level institutional metrics, and verified governance highlights.',
    previewColorPrimary: '#1e1b4b',
    previewColorSecondary: '#3b82f6',
    recommendedPresets: ['examination_org', 'vocational', 'custom_org'],
    typographySuggestion: 'DM Sans',
    defaultBorderRadius: 'md'
  },
  {
    id: 'vibrant_community',
    name: 'Vibrant School Community',
    category: 'Community',
    description: 'Warm, approachable, and engaging design prioritizing student achievements, club activities, upcoming sporting events, and parent collaboration.',
    previewColorPrimary: '#c2410c',
    previewColorSecondary: '#f59e0b',
    recommendedPresets: ['primary_school', 'secondary_school'],
    typographySuggestion: 'Outfit',
    defaultBorderRadius: 'xl'
  },
  {
    id: 'university_institutional',
    name: 'University Institutional',
    category: 'Academic',
    description: 'Collegiate hierarchy suited for multi-faculty universities, polytechnics, and research institutes with academic governance cards.',
    previewColorPrimary: '#172554',
    previewColorSecondary: '#1d4ed8',
    recommendedPresets: ['university', 'college'],
    typographySuggestion: 'Cinzel',
    defaultBorderRadius: 'sm'
  },
  {
    id: 'tech_driven',
    name: 'Technology-Driven Education',
    category: 'Modern',
    description: 'Cutting-edge digital education aesthetic designed for STEM academies, computer testing centers, and modern vocational institutes.',
    previewColorPrimary: '#0284c7',
    previewColorSecondary: '#0369a1',
    recommendedPresets: ['examination_org', 'vocational', 'custom_org'],
    typographySuggestion: 'Manrope',
    defaultBorderRadius: 'lg'
  },
  {
    id: 'editorial_magazine',
    name: 'Editorial & Magazine Style',
    category: 'Editorial',
    description: 'Narrative storytelling with rich campus journal layout, featured thought leadership, and prominent photographic storytelling.',
    previewColorPrimary: '#334155',
    previewColorSecondary: '#64748b',
    recommendedPresets: ['university', 'college', 'secondary_school'],
    typographySuggestion: 'Playfair Display',
    defaultBorderRadius: 'none'
  }
];

export function createDefaultPresetConfiguration(
  instanceId: string,
  tenantId: string,
  schoolSlug: string,
  institutionName: string,
  presetType: InstitutionPresetType,
  templateId: HomepageTemplateId = 'premium_academic',
  domain?: string
): HomepageConfiguration {
  const isUniversity = presetType === 'university' || presetType === 'college';
  const isPrimary = presetType === 'primary_school';
  const isExamOrg = presetType === 'examination_org';

  let primaryColor = '#065f46'; // Emerald
  let secondaryColor = '#047857';
  let accentColor = '#f59e0b';
  let typography: any = 'Plus Jakarta Sans';
  let borderRadius: any = 'lg';

  if (templateId === 'premium_academic') {
    primaryColor = '#064e3b';
    secondaryColor = '#047857';
    accentColor = '#f59e0b';
    typography = 'Playfair Display';
  } else if (templateId === 'contemporary_corporate') {
    primaryColor = '#1e1b4b';
    secondaryColor = '#2563eb';
    accentColor = '#38bdf8';
    typography = 'DM Sans';
  } else if (templateId === 'vibrant_community') {
    primaryColor = '#b45309';
    secondaryColor = '#d97706';
    accentColor = '#10b981';
    typography = 'Outfit';
    borderRadius = 'xl';
  } else if (templateId === 'university_institutional') {
    primaryColor = '#172554';
    secondaryColor = '#1d4ed8';
    accentColor = '#fbbf24';
    typography = 'Cinzel';
  } else if (templateId === 'tech_driven') {
    primaryColor = '#0284c7';
    secondaryColor = '#0369a1';
    accentColor = '#38bdf8';
    typography = 'Manrope';
  }

  const branding: InstanceBrandingConfig = {
    institutionName,
    shortName: schoolSlug.toUpperCase().substring(0, 6),
    tagline: isExamOrg 
      ? 'Rigorous Assessment, Uncompromised Standard & Secure Certification'
      : isUniversity 
      ? 'Advancing Scholarly Research, Leadership & Academic Distinction'
      : 'Excellence in Academics, Character, Digital Innovation & Leadership',
    crestBadgePreset: 'emerald_prestige',
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor: '#0a0e17',
    surfaceColor: '#111827',
    textColor: '#f8fafc',
    typographyFace: typography,
    borderRadius,
    headerStyle: 'floating_blur',
    footerStyle: 'full_featured'
  };

  const hero: InstanceHeroConfig = {
    headline: isExamOrg
      ? `National Assessment & Secure Testing Portal`
      : isUniversity
      ? `Cultivating Global Scholars & Pioneering Research`
      : `Shaping Tomorrow's Leaders Through Academic Excellence`,
    subheadline: isExamOrg
      ? `Official sovereign testing infrastructure providing secure computer-based testing, immediate result tabulation, and candidate verification.`
      : isUniversity
      ? `Welcome to ${institutionName}. A vibrant community committed to academic rigor, pioneering research, and transformative higher education.`
      : `Welcome to ${institutionName}. Fostering holistic student development, curriculum mastery, character building, and digital literacy.`,
    ctaPrimaryText: isExamOrg ? 'Candidate Portal' : 'Student & Staff Portal',
    ctaPrimaryLink: '#portal-login',
    ctaSecondaryText: isExamOrg ? 'Verify Examination Results' : 'Admissions & Enrolment',
    ctaSecondaryLink: '#admissions',
    backgroundType: 'gradient',
    layoutAlignment: 'left',
    imagePlacement: 'card_cluster',
    badgeText: isExamOrg ? 'Accredited Sovereign Testing Authority' : 'NERDC 2026 Aligned & Fully Accredited',
    showQuickAuthBox: true
  };

  const authPresentation: InstanceAuthPresentationConfig = {
    enabledUserGroups: isExamOrg 
      ? ['admin', 'staff', 'student'] 
      : ['admin', 'teacher', 'staff', 'student', 'parent'],
    displayStyle: 'embedded',
    defaultGroup: isExamOrg ? 'student' : 'student',
    welcomeHeading: `Access ${institutionName} Institutional Portal`,
    welcomeSubtext: 'Sign in with your verified institutional identity to access your academic records, course notes, assessments, and fee management.',
    showMfaNotice: true,
    customHelpText: 'For institutional credential recovery or enrollment support, contact the ICT Academic Helpdesk.'
  };

  const contact: InstanceContactInfo = {
    addressText: 'Km 12, Academic Boulevard, Victoria Island',
    city: 'Lagos',
    state: 'Lagos State',
    country: 'Nigeria',
    primaryEmail: `info@${schoolSlug}.sch.ng`,
    admissionsEmail: `admissions@${schoolSlug}.sch.ng`,
    primaryPhone: '+234 803 555 0192',
    alternatePhone: '+234 802 333 4488',
    whatsappSupport: '+234 803 555 0192',
    copyrightText: `© ${new Date().getFullYear()} ${institutionName}. All rights reserved. Powered by Curriculum Server.`
  };

  const sections: HomepageSectionConfig[] = [
    {
      id: 'sec_about',
      type: 'about',
      title: 'About Our Institution',
      subtitle: 'A Legacy of Excellence & Innovation',
      enabled: true,
      order: 1,
      content: {
        description: `${institutionName} is dedicated to fostering an intellectually stimulating, disciplined, and nurturing environment where every learner thrives.`,
        bulletPoints: [
          'Full statutory alignment with NERDC 2026 national curriculum frameworks',
          'Modern digital laboratory suites and interactive computer-based learning',
          'Holistic extracurricular programs in sports, debate, robotics, and creative arts'
        ]
      }
    },
    {
      id: 'sec_academics',
      type: 'academics',
      title: 'Academic Programs & Faculty',
      subtitle: 'Rigorous Curriculum Mastery',
      enabled: true,
      order: 2,
      content: {
        items: [
          {
            title: 'Junior Secondary School (JSS 1 - JSS 3)',
            description: 'Foundation courses in sciences, humanities, vocational entrepreneurship, and digital literacy with continuous NERDC-guided formative assessments.',
            badge: 'Basic Education'
          },
          {
            title: 'Senior Secondary School (SS 1 - SS 3)',
            description: 'Specialized departmental tracks in Science & Mathematics, Arts & Humanities, and Commercial Business Studies preparing scholars for WAEC, NECO, and JAMB.',
            badge: 'Senior Academy'
          },
          {
            title: 'STEM & Robotics Laboratory',
            description: 'Practical coding, artificial intelligence concepts, electronics prototyping, and computer-assisted science experiments.',
            badge: 'Innovation Suite'
          }
        ]
      }
    },
    {
      id: 'sec_video_hero',
      type: 'video_hero',
      title: 'Virtual Campus Showcase',
      subtitle: 'Experience Our World-Class Campus Life',
      enabled: true,
      order: 3,
      content: {
        description: 'Explore our state-of-the-art academic complexes, digital science laboratories, Olympic sports pavilion, and boarding residences.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        videoPosterUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80',
        videoAutoplay: false,
        videoMuted: true,
        videoLoop: true
      }
    },
    {
      id: 'sec_stats',
      type: 'statistics',
      title: 'Institutional Highlights',
      subtitle: 'Our Track Record in Numbers',
      enabled: true,
      order: 4,
      content: {
        items: [
          { title: 'Pass Rate', statValue: '99.4%', statLabel: 'WAEC / NECO Distinction Rate' },
          { title: 'Enrolled Scholars', statValue: '1,450+', statLabel: 'Active Learners Across Grades' },
          { title: 'Faculty Members', statValue: '85+', statLabel: 'Certified Specialist Teachers' },
          { title: 'Digital Labs', statValue: '100%', statLabel: 'CBT Kiosk & RFID Coverage' }
        ]
      }
    },
    {
      id: 'sec_admissions',
      type: 'admissions',
      title: 'Admissions & Enrolment',
      subtitle: 'Join Our Community of Achievers',
      enabled: true,
      order: 4,
      content: {
        description: 'Applications for the upcoming academic session are now open. Prospective students must register online and sit for the computer-based entrance examination.',
        items: [
          { title: '1. Online Application Form', description: 'Submit applicant biodata, previous academic transcripts, and birth certification via the digital portal.' },
          { title: '2. Entrance Assessment', description: 'Candidates sit for the computer-based entrance evaluation in Mathematics, English, and General Aptitude.' },
          { title: '3. Offer & Digital Clearance', description: 'Successful applicants receive an automated provisional admission letter and student clearance invoice.' }
        ]
      }
    },
    {
      id: 'sec_announcements',
      type: 'announcements',
      title: 'Notices & Bulletin',
      subtitle: 'Official Institutional Updates',
      enabled: true,
      order: 5,
      content: {
        items: [
          {
            title: '2026 Academic Session Resumption Date',
            description: 'All boarding students are expected to resume on Sunday, while day students commence classes on Monday 8:00 AM prompt.',
            date: 'September 14, 2026',
            badge: 'Academic Notice'
          },
          {
            title: 'Continuous Assessment Tests Schedule',
            description: 'First Mid-Term CAT will be conducted using the School Computer-Based Testing Kiosk from Wednesday through Friday.',
            date: 'October 21, 2026',
            badge: 'Examination Desk'
          }
        ]
      }
    },
    {
      id: 'sec_portal_access',
      type: 'portal_access',
      title: 'Digital Campus Access',
      subtitle: 'Secure Self-Service for All Institutional Stakeholders',
      enabled: true,
      order: 6,
      content: {
        items: [
          { title: 'Teacher Delivery Tracker', description: 'Lesson plan submission, attendance logging, and student progress reports.', iconName: 'GraduationCap' },
          { title: 'Student Terminal Results', description: 'Real-time terminal broadsheet review, e-report card downloads, and past CBT review.', iconName: 'FileText' },
          { title: 'Parent Fee Clearance', description: 'Instant school fee settlement via Paystack/OPay with tamper-evident digital receipts.', iconName: 'CreditCard' }
        ]
      }
    }
  ];

  return {
    id: `hp_${instanceId}`,
    instanceId,
    tenantId,
    schoolSlug,
    domain,
    templateId,
    presetType,
    branding,
    hero,
    sections,
    authPresentation,
    contact,
    status: 'published',
    versionNumber: 1,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_auto_bootstrap'
  };
}
