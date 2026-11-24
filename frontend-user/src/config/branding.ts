/**
 * Parameterized portal branding configuration for GE AI Hub.
 * Supports environment variable overrides (VITE_BRAND_*) as well as component props.
 */

export interface BrandingConfig {
  /** Top portal name displayed in Header and LoginScreen (default: "GE AI Hub") */
  brandName: string;
  /** Organization / Partner brand label (default: "Tech Mahindra") */
  orgName: string;
  /** Parameterized logo image URL (default: Tech Mahindra RGB logo) */
  logoUrl: string;
  /** Accessible alt text for the brand logo */
  logoAlt: string;
  /** Subtitle displayed beneath the top portal name */
  subtitle: string;
}

export const TECH_MAHINDRA_LOGO_URL =
  'https://www.mahindra.com/sites/default/files/social-thumbnail/TM_Logo_Color_Pos_RGB.webp';

const metaEnv =
  (import.meta as { env?: Record<string, string | undefined> }).env || {};

export const DEFAULT_BRANDING: BrandingConfig = {
  brandName: metaEnv.VITE_BRAND_NAME || 'GE AI Hub',
  orgName: metaEnv.VITE_BRAND_ORG_NAME || 'Tech Mahindra',
  logoUrl: metaEnv.VITE_BRAND_LOGO_URL || TECH_MAHINDRA_LOGO_URL,
  logoAlt: metaEnv.VITE_BRAND_LOGO_ALT || 'Tech Mahindra Logo',
  subtitle:
    metaEnv.VITE_BRAND_SUBTITLE ||
    'Enterprise AI Control Plane & Discovery Portal',
};
