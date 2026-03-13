export interface Project {
  id: string;
  name: string;
  slug: string;
  city: string;
  city_slug: string;
  description: string | null;
  status: ProjectStatus;
  is_active: boolean;
  hero_title: string | null;
  hero_subtitle: string | null;
  features: ProjectFeatures | null;
  webhook_url: string | null;
  tenant_id: string | null;
  // New fields
  property_type: PropertyType | null;
  bedrooms: number | null;
  suites: number | null;
  parking_spots: number | null;
  area_m2: number | null;
  price_range: string | null;
  ideal_buyer: string | null;
  amenities: string[] | null;
  differentials: string | null;
  main_image_url: string | null;
  gallery_images: GalleryImage[] | null;
  video_url: string | null;
  map_embed_url: string | null;
  address: string | null;
  landing_page_data: LandingPageData | null;
  landing_page_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus =
  | 'pre_launch'
  | 'launch'
  | 'selling'
  | 'sold_out'
  | 'renting';

export type PropertyType =
  | 'apartment'
  | 'house'
  | 'land'
  | 'lot'
  | 'commercial'
  | 'office'
  | 'penthouse'
  | 'studio';

export interface ProjectFeatures {
  lots_count?: number;
  min_lot_size?: number;
  amenities?: string[];
  highlights?: string[];
}

export interface GalleryImage {
  url: string;
  caption?: string;
}

// ─── Landing Page Data ────────────────────────────────────────────────────────

export interface LandingPageTheme {
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  fontFamily: string;
  heroStyle: 'dark-overlay' | 'light-overlay' | 'gradient';
}

export interface LandingPageHero {
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  ctaText: string;
}

export interface LandingPageLocation {
  title: string;
  description: string;
  highlights: string[];
}

export interface LandingPageFeatureItem {
  icon: string;
  label: string;
  value: string;
}

export interface LandingPageAudienceCard {
  title: string;
  description: string;
}

export interface LandingPageUrgency {
  type: 'urgency' | 'opportunity' | 'availability';
  title: string;
  description: string;
  highlight: string;
}

export interface LandingPageBenefitCard {
  icon: string;
  title: string;
  description: string;
}

export interface LandingPageCta {
  title: string;
  subtitle: string;
  buttonText: string;
}

export interface LandingPageForm {
  title: string;
  subtitle: string;
  buttonText: string;
  thankYouTitle: string;
  thankYouMessage: string;
}

export interface LandingPageFooter {
  disclaimer: string;
}

export interface LandingPageData {
  theme: LandingPageTheme;
  hero: LandingPageHero;
  location: LandingPageLocation;
  features: LandingPageFeatureItem[];
  audience: LandingPageAudienceCard[];
  urgency: LandingPageUrgency;
  benefits: LandingPageBenefitCard[];
  cta: LandingPageCta;
  form: LandingPageForm;
  floatingButtonText: string;
  footer: LandingPageFooter;
}

// ─── Status Config ────────────────────────────────────────────────────────────

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  pre_launch: {
    label: 'Pré-Lançamento',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
  },
  launch: {
    label: 'Lançamento',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  },
  selling: {
    label: 'Em Vendas',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  },
  sold_out: {
    label: 'Esgotado',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-700',
  },
  renting: {
    label: 'Para Locação',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
  },
};

export const PROPERTY_TYPE_CONFIG: Record<PropertyType, { label: string; icon: string }> = {
  apartment: { label: 'Apartamento', icon: '🏢' },
  house: { label: 'Casa', icon: '🏠' },
  land: { label: 'Terreno', icon: '🌄' },
  lot: { label: 'Loteamento', icon: '🗺️' },
  commercial: { label: 'Comercial', icon: '🏗️' },
  office: { label: 'Sala Comercial', icon: '🏛️' },
  penthouse: { label: 'Cobertura', icon: '🌇' },
  studio: { label: 'Studio', icon: '🏙️' },
};

export interface BrokerProject {
  id: string;
  broker_id: string;
  project_id: string;
  is_active: boolean;
  tenant_id: string | null;
  created_at: string;
  broker?: {
    id: string;
    name: string;
    slug: string;
  };
  project?: Project;
}
