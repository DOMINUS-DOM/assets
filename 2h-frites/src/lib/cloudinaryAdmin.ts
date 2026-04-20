// Server-only Cloudinary admin helpers — destroy assets when the matching
// DB row is deleted so we don't accumulate orphan images. Best-effort: if
// the destroy call fails (asset already gone, network hiccup), we log and
// move on rather than blocking the DB delete.
import { v2 as cloudinary } from 'cloudinary';
import { env } from '@/lib/env';

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;
  const cloudName = env.CLOUDINARY_CLOUD_NAME || 'dnutqg4yv';
  if (!apiKey || !apiSecret) return false;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  configured = true;
  return true;
}

/**
 * Delete an asset by its stored value (either `public_id` or a full URL
 * legacy rows might still carry). No-op if falsy or if creds missing.
 */
export async function destroyCloudinaryAsset(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return;
  if (!ensureConfigured()) return;
  const publicId = extractPublicId(imageUrl);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (e: any) {
    console.warn('Cloudinary destroy failed for', publicId, e?.message);
  }
}

/** Accepts a raw public_id or a full Cloudinary URL and returns the public_id. */
function extractPublicId(imageUrl: string): string | null {
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return imageUrl; // already a public_id
  }
  // URL shape: https://res.cloudinary.com/<cloud>/image/upload/<transforms?>/<public_id>.<ext>
  const match = imageUrl.match(/\/upload\/(?:[^/]+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
  return match?.[1] || null;
}
