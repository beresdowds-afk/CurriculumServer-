import { SchoolBrandProfile, BrandPresetTheme } from '../types';

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

export interface BrandColorPreset {
  key: BrandPresetTheme;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  gradient: string;
  description: string;
}

export const BRAND_COLOR_PRESETS: BrandColorPreset[] = [
  {
    key: 'emerald_prestige',
    name: 'Emerald Prestige (National Standard)',
    primary: '#059669', // emerald-600
    secondary: '#0f766e', // teal-700
    accent: '#f59e0b', // amber-500
    badgeBg: 'bg-emerald-950/80',
    badgeText: 'text-emerald-300',
    gradient: 'from-emerald-600 via-teal-700 to-emerald-900',
    description: 'Statutory national academic green with regal gold and teal accents.'
  },
  {
    key: 'royal_sapphire',
    name: 'Royal Sapphire & Gold',
    primary: '#2563eb', // blue-600
    secondary: '#1e1b4b', // indigo-950
    accent: '#fbbf24', // amber-400
    badgeBg: 'bg-indigo-950/80',
    badgeText: 'text-indigo-300',
    gradient: 'from-blue-600 via-indigo-800 to-slate-900',
    description: 'Distinguished Ivy League navy sapphire with radiant academic gold.'
  },
  {
    key: 'crimson_ruby',
    name: 'Crimson Ruby & Platinum',
    primary: '#dc2626', // red-600
    secondary: '#881337', // rose-900
    accent: '#f3f4f6', // slate-100
    badgeBg: 'bg-rose-950/80',
    badgeText: 'text-rose-300',
    gradient: 'from-rose-600 via-red-800 to-rose-950',
    description: 'Vibrant collegiate crimson symbolizing courage, excellence, and legacy.'
  },
  {
    key: 'amber_gold',
    name: 'Imperial Amber & Bronze',
    primary: '#d97706', // amber-600
    secondary: '#78350f', // amber-900
    accent: '#10b981', // emerald-500
    badgeBg: 'bg-amber-950/80',
    badgeText: 'text-amber-300',
    gradient: 'from-amber-500 via-amber-700 to-amber-950',
    description: 'Regal golden bronze representing honor, scholarship, and distinction.'
  },
  {
    key: 'slate_cyber',
    name: 'Cyber Slate & Neon Cyan',
    primary: '#0284c7', // sky-600
    secondary: '#0f172a', // slate-900
    accent: '#38bdf8', // sky-400
    badgeBg: 'bg-slate-950',
    badgeText: 'text-sky-300',
    gradient: 'from-slate-800 via-slate-900 to-sky-950',
    description: 'Futuristic STEM & Technology academy palette with high-contrast cyan.'
  }
];

export const INITIAL_SCHOOL_BRAND: SchoolBrandProfile = {
  id: 'brand-cfa-main',
  schoolName: 'CurriculumFlow Academy',
  shortName: 'CFA',
  motto: 'Excellence in Knowledge, Character & Digital Innovation',
  establishedYear: 2014,
  schoolType: 'Private Day & Boarding Model College (JSS 1 - SS 3)',
  accreditationNumber: 'NERDC/WAEC/LAG/2024/0988-ACAD',
  examCentreNumbers: {
    waec: 'WAEC/CTR/4029104',
    neco: 'NECO/SCH/0091823',
    bece: 'BECE/LAG/88129',
    jambCbt: 'JAMB/CBT/LAG-0442'
  },
  crestLogoUrl: '', // uses SVG vector badge by default or custom uploaded image
  logoShape: 'shield',
  logoIconType: 'school',
  crestBadgePreset: 'emerald_prestige',
  principalSignatureUrl: '', // generated vector signature or uploaded image
  principalName: 'Dr. (Mrs.) Margaret Adebayo',
  principalTitle: 'Principal & Executive Academic Director, Ph.D (Ed. Admin), TRCN Certified',
  stampSealUrl: '',
  watermarkText: 'CURRICULUMFLOW ACADEMY • OFFICIAL DOCUMENT',
  brandTheme: {
    primaryColor: '#059669',
    secondaryColor: '#0f766e',
    accentColor: '#f59e0b',
    presetKey: 'emerald_prestige'
  },
  contact: {
    primaryEmail: 'info@curriculumflow.edu.ng',
    admissionsEmail: 'admissions@curriculumflow.edu.ng',
    bursaryEmail: 'bursary@curriculumflow.edu.ng',
    principalEmail: 'principal.office@curriculumflow.edu.ng',
    primaryPhone: '+234 803 456 7890',
    alternatePhone: '+234 812 987 6543',
    whatsappSupport: '+234 803 456 7890',
    emergencyHelpline: '+234 700-SCH-CARE (0700-724-2273)',
    officialWebsite: 'https://curriculumflow.edu.ng',
    studentPortalUrl: 'https://portal.curriculumflow.edu.ng/student',
    parentPortalUrl: 'https://portal.curriculumflow.edu.ng/parent',
    lmsUrl: 'https://lms.curriculumflow.edu.ng'
  },
  address: {
    streetAddress: 'Plot 12, Academic Boulevard',
    areaDistrict: 'Victoria Island Extension / Lekki Phase 1 Corridor',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    postalCode: '101241',
    campusName: 'Apex Hill Main Campus',
    landmarks: 'Adjacent Eko Innovation Hub, Opposite Admiralty Way Junction',
    geoCoordinates: {
      latitude: 6.4281,
      longitude: 3.4219,
      googleMapsUrl: 'https://maps.google.com/?q=6.4281,3.4219'
    }
  },
  socialMedia: {
    facebookUrl: 'https://facebook.com/curriculumflowacademy',
    twitterXUrl: 'https://x.com/curriculumflow_ng',
    instagramUrl: 'https://instagram.com/curriculumflow_edu',
    linkedinUrl: 'https://linkedin.com/company/curriculumflow-academy',
    youtubeUrl: 'https://youtube.com/@curriculumflowschool',
    tiktokUrl: 'https://tiktok.com/@curriculumflow_official',
    telegramChannel: 'https://t.me/curriculumflow_announcements',
    whatsappChannel: 'https://whatsapp.com/channel/0029VaCurriculumFlow'
  },
  academicAffiliation: 'Federal Ministry of Education (FME) • Lagos State Ministry of Basic & Secondary Education • NERDC National Standard',
  status: 'published',
  publishedAt: '2026-08-10T14:30:00Z',
  publishedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal Admin)',
  version: 3,
  lastSavedAt: '2026-08-10T14:30:00Z',
  lastSavedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal Admin)',
  publishAuditHistory: [
    {
      version: 3,
      publishedAt: '2026-08-10 14:30:00',
      publishedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
      summaryNotes: 'Updated official WhatsApp channel, emergency 24/7 hotline, and JAMB CBT Centre accreditation number for 2025/2026 session.',
      changesHighlight: [
        'Added WhatsApp official broadcast channel',
        'Updated Emergency Helpline to toll-free number',
        'Refined Victoria Island Extension campus landmark directions',
        'Synchronized Exam Centre codes for WAEC & NECO portals'
      ]
    },
    {
      version: 2,
      publishedAt: '2026-01-15 09:15:00',
      publishedBy: 'Dr. (Mrs.) Margaret Adebayo (Principal)',
      summaryNotes: 'Refreshed digital branding colors to Emerald Prestige theme and updated Bursary helpdesk email.',
      changesHighlight: [
        'Published Emerald Prestige statutory color palette',
        'Added dedicated Bursary & Billing desk contact lines',
        'Configured new Student & Parent portal domain redirects'
      ]
    },
    {
      version: 1,
      publishedAt: '2025-09-01 10:00:00',
      publishedBy: 'System Administrator',
      summaryNotes: 'Initial institutional brand profile provisioning on CurriculumFlow Academic OS.',
      changesHighlight: [
        'Initial setup of school name, motto, and accreditation credentials',
        'Configured main campus address and official social media handles'
      ]
    }
  ]
};
