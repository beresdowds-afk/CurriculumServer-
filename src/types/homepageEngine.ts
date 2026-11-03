export type HomepageTemplateId = 
  | 'modern_minimalist'
  | 'premium_academic'
  | 'contemporary_corporate'
  | 'vibrant_community'
  | 'university_institutional'
  | 'tech_driven'
  | 'editorial_magazine';

export type InstitutionPresetType = 
  | 'primary_school'
  | 'secondary_school'
  | 'university'
  | 'college'
  | 'vocational'
  | 'examination_org'
  | 'custom_org';

export type HomepageSectionType = 
  | 'hero'
  | 'about'
  | 'academics'
  | 'features'
  | 'admissions'
  | 'statistics'
  | 'announcements'
  | 'events'
  | 'faculty'
  | 'student_life'
  | 'portal_access'
  | 'contact'
  | 'footer'
  | 'gallery'
  | 'video_hero';

export interface HomepageSectionConfig {
  id: string;
  type: HomepageSectionType;
  title: string;
  subtitle?: string;
  enabled: boolean;
  order: number;
  content: {
    description?: string;
    bulletPoints?: string[];
    items?: Array<{
      title: string;
      description?: string;
      iconName?: string;
      imageUrl?: string;
      date?: string;
      badge?: string;
      statValue?: string;
      statLabel?: string;
      linkUrl?: string;
    }>;
  };
  requiredFeatureKey?: string; // Optional feature entitlement requirement
}

export type TypographyFace = 
  | 'Plus Jakarta Sans'
  | 'Outfit'
  | 'DM Sans'
  | 'Playfair Display'
  | 'Cinzel'
  | 'Manrope';

export interface InstanceBrandingConfig {
  institutionName: string;
  shortName: string;
  tagline: string;
  logoUrl?: string;
  crestBadgePreset?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  typographyFace: TypographyFace;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  headerStyle: 'floating_blur' | 'solid_border' | 'minimal_transparent';
  footerStyle: 'full_featured' | 'compact_centered' | 'academic_columns';
}

export interface InstanceHeroConfig {
  headline: string;
  subheadline: string;
  ctaPrimaryText: string;
  ctaPrimaryLink: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  backgroundType: 'gradient' | 'image' | 'pattern' | 'mesh';
  backgroundImageUrl?: string;
  layoutAlignment: 'left' | 'center' | 'split';
  imagePlacement?: 'right' | 'card_cluster' | 'floating_mockup' | 'none';
  badgeText?: string;
  showQuickAuthBox: boolean;
}

export interface InstanceAuthPresentationConfig {
  enabledUserGroups: Array<'admin' | 'teacher' | 'staff' | 'student' | 'parent'>;
  displayStyle: 'modal' | 'embedded' | 'split_card';
  defaultGroup: 'admin' | 'teacher' | 'staff' | 'student' | 'parent';
  welcomeHeading: string;
  welcomeSubtext: string;
  showMfaNotice: boolean;
  customHelpText?: string;
}

export interface InstanceContactInfo {
  addressText: string;
  city: string;
  state: string;
  country: string;
  primaryEmail: string;
  admissionsEmail?: string;
  primaryPhone: string;
  alternatePhone?: string;
  whatsappSupport?: string;
  socialLinks?: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    youtube?: string;
  };
  copyrightText?: string;
}

export interface HomepageConfiguration {
  id: string;
  instanceId: string;
  tenantId: string;
  schoolSlug: string;
  domain?: string;
  templateId: HomepageTemplateId;
  presetType: InstitutionPresetType;
  branding: InstanceBrandingConfig;
  hero: InstanceHeroConfig;
  sections: HomepageSectionConfig[];
  authPresentation: InstanceAuthPresentationConfig;
  contact: InstanceContactInfo;
  status: 'draft' | 'published';
  versionNumber: number;
  publishedAt?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface HomepageVersionRecord {
  versionId: string;
  instanceId: string;
  versionNumber: number;
  configurationSnapshot: HomepageConfiguration;
  publishedBy: string;
  publishedAt: string;
  changelog: string;
}

export interface HomepageTemplateDefinition {
  id: HomepageTemplateId;
  name: string;
  category: 'Modern' | 'Academic' | 'Corporate' | 'Community' | 'Editorial';
  description: string;
  previewColorPrimary: string;
  previewColorSecondary: string;
  recommendedPresets: InstitutionPresetType[];
  typographySuggestion: TypographyFace;
  defaultBorderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export interface HomepageAuditRecord {
  id: string;
  instanceId: string;
  action: 'draft_updated' | 'published' | 'rolled_back' | 'template_switched' | 'preset_applied';
  actorEmail: string;
  actorRole: string;
  timestamp: string;
  versionNumber: number;
  notes: string;
  correlationId?: string;
}
