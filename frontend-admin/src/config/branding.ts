/**
 * Parameterized portal branding configuration for Gemini AI Hub.
 * Supports environment variable overrides (VITE_BRAND_*) as well as component props.
 */

export interface BrandingConfig {
  /** Top portal name displayed in Header and LoginScreen (default: "Gemini AI Hub") */
  brandName: string;
  /** Organization / Partner brand label (default: "Tech Mahindra") */
  orgName: string;
  /** Parameterized logo image URL (default: Tech Mahindra vector wordmark aligned to techmahindra.com) */
  logoUrl: string;
  /** Accessible alt text for the brand logo */
  logoAlt: string;
  /** Subtitle displayed beneath the top portal name */
  subtitle: string;
}

const TECH_MAHINDRA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 54" fill="none">
  <text x="2" y="23" font-family="Inter, Arial, Helvetica, sans-serif" font-size="22" font-weight="800" letter-spacing="1.5" fill="#1E293B">TECH</text>
  <text x="2" y="47" font-family="Inter, Arial, Helvetica, sans-serif" font-size="28" font-weight="800" letter-spacing="0.4" fill="#E31837">mahindra</text>
  <path d="M174 16 C204 4, 242 4, 274 16 C244 10, 206 10, 174 16 Z" fill="#E31837"/>
</svg>`;

export const TECH_MAHINDRA_LOGO_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  TECH_MAHINDRA_SVG,
)}`;

const metaEnv =
  (import.meta as { env?: Record<string, string | undefined> }).env || {};

export const DEFAULT_BRANDING: BrandingConfig = {
  brandName: metaEnv.VITE_BRAND_NAME || 'Gemini AI Hub',
  orgName: metaEnv.VITE_BRAND_ORG_NAME || 'Tech Mahindra',
  logoUrl: metaEnv.VITE_BRAND_LOGO_URL || TECH_MAHINDRA_LOGO_URL,
  logoAlt: metaEnv.VITE_BRAND_LOGO_ALT || 'Tech Mahindra',
  subtitle:
    metaEnv.VITE_BRAND_SUBTITLE ||
    'Enterprise AI Control Plane & Discovery Portal',
};
