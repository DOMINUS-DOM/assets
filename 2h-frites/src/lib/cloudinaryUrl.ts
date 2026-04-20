// Cloudinary URL builder — pure, testable, no runtime deps.
// DB stores the `public_id` (e.g. "tenants/2h-frites/products/xxxxx"),
// the URL with transformations is composed here at render time so we can
// change delivery parameters globally without a DB migration.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnutqg4yv';

export type CloudinaryPreset =
  | 'menu-card'      // 80px card thumb in mobile menu (renders Retina via dpr)
  | 'menu-card-lg'   // 160px for tablet/desktop
  | 'category-pill'  // 32px round avatar on a sticky category pill
  | 'admin-preview'  // 120px in admin editor
  | 'pos-tile'       // 48px in the POS tile grid
  | 'kiosk-tile'     // 160px in kiosk product tiles
  | 'hero';          // 800×600 for product detail / hero use cases

// Base transformations shared across all presets:
//   c_fill,g_auto = smart crop (Cloudinary picks the subject)
//   q_auto,f_auto = adaptive quality + AVIF/WebP/JPEG per browser support
//   dpr_auto      = Retina / DPR-aware delivery
const BASE = 'c_fill,g_auto,q_auto,f_auto,dpr_auto';

const PRESET: Record<CloudinaryPreset, string> = {
  'menu-card':     `${BASE},w_160,h_160`,
  'menu-card-lg':  `${BASE},w_320,h_320`,
  'category-pill': `${BASE},w_128,h_128`,
  'admin-preview': `${BASE},w_240,h_240`,
  'pos-tile':      `${BASE},w_96,h_96`,
  'kiosk-tile':    `${BASE},w_320,h_320`,
  hero:            `${BASE},w_800,h_600`,
};

/**
 * Build a Cloudinary delivery URL for a stored public_id.
 * Returns null when `publicId` is empty — callers should fall back to the
 * no-image layout rather than rendering a broken image.
 */
export function getCloudinaryUrl(
  publicId: string | null | undefined,
  preset: CloudinaryPreset = 'menu-card',
): string | null {
  if (!publicId) return null;
  // Already a full URL? Pass through. Covers legacy rows that may have
  // stored the full `https://res.cloudinary.com/...` by mistake.
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) return publicId;
  const transforms = PRESET[preset];
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
}

/**
 * Folder path used when creating new assets. Used by the signed upload
 * endpoint to force the upload to land in the tenant's namespace.
 */
export function tenantFolder(tenantSlug: string, kind: 'products' | 'categories'): string {
  // Sanitize — slugs should already be safe, but belt + suspenders.
  const clean = tenantSlug.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  return `tenants/${clean}/${kind}`;
}
