export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';
import { getRequiredOrgId, ADMIN_ROLES, forbidden, unauthorized } from '@/lib/auth';
import { tenantFolder } from '@/lib/cloudinaryUrl';
import { env } from '@/lib/env';

/**
 * POST /api/uploads/sign
 * Returns a signed Cloudinary upload payload scoped to the caller's tenant.
 *
 * Body: { kind: 'products' | 'categories' }
 *
 * Client flow:
 *   1. POST here → receives { signature, timestamp, apiKey, cloudName, folder, publicIdPrefix }
 *   2. Uploads file directly to Cloudinary with those params
 *   3. On success, PATCH the product/category with the returned public_id
 *
 * The signature includes `folder` so the client CANNOT upload outside the
 * tenant's namespace even if they tamper with the form params.
 */
export async function POST(req: NextRequest) {
  const orgResult = getRequiredOrgId(req);
  if (!orgResult) return unauthorized();
  const { auth, orgId } = orgResult;
  // Only tenant admins can upload menu photos. Super admins can too.
  if (!ADMIN_ROLES.includes(auth.role) && auth.role !== 'platform_super_admin') {
    return forbidden();
  }

  const body = await req.json().catch(() => ({}));
  const kind = body?.kind;
  if (kind !== 'products' && kind !== 'categories') {
    return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { slug: true },
  });
  if (!org?.slug) return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 });

  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;
  const cloudName = env.CLOUDINARY_CLOUD_NAME || 'dnutqg4yv';
  if (!apiKey || !apiSecret) {
    console.error('Cloudinary credentials missing');
    return NextResponse.json({ error: 'storage_misconfigured' }, { status: 500 });
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const folder = tenantFolder(org.slug, kind);
  const timestamp = Math.floor(Date.now() / 1000);
  // Keep params tight. Overwrite:true means re-uploads with the same public_id
  // replace the previous asset (used when the user hits "Remplacer").
  const paramsToSign = {
    folder,
    timestamp,
    overwrite: true,
  };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
    overwrite: true,
  });
}
