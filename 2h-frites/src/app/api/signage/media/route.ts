export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cloudinary } from '@/lib/cloudinary';
import { getAuthUser, ADMIN_ROLES, forbidden, unauthorized } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const locationId = req.nextUrl.searchParams.get('locationId');
  const where = locationId ? { locationId } : {};
  const media = await prisma.signageMedia.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(media);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const contentType = req.headers.get('content-type') || '';

  // Handle JSON actions (delete)
  if (contentType.includes('application/json')) {
    const body = await req.json();

    if (body.action === 'delete') {
      const media = await prisma.signageMedia.findUnique({ where: { id: body.id } });
      if (!media) return NextResponse.json({ error: 'not_found' }, { status: 404 });

      // Delete from Cloudinary
      try {
        const resourceType = media.type === 'video' ? 'video' : 'image';
        await cloudinary.uploader.destroy(media.publicId, { resource_type: resourceType });
      } catch (e) {
        console.error('[signage/media] Cloudinary delete error:', e);
      }

      await prisma.signageMedia.delete({ where: { id: body.id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  }

  // Handle multipart upload
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const locationId = formData.get('locationId') as string | null;
      const name = (formData.get('name') as string) || file?.name || 'Sans nom';
      const folder = (formData.get('folder') as string) || '';

      if (!file || !locationId) {
        return NextResponse.json({ error: 'file and locationId required' }, { status: 400 });
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Determine resource type
      const isVideo = file.type.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: `signage/${locationId}`,
            transformation: isVideo ? undefined : [{ quality: 'auto', fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      // Generate thumbnail for videos
      let thumbnailUrl: string | null = null;
      if (isVideo && result.public_id) {
        thumbnailUrl = cloudinary.url(result.public_id, {
          resource_type: 'video',
          transformation: [
            { width: 400, height: 300, crop: 'fill' },
            { format: 'jpg' },
          ],
        });
      }

      // Save to DB
      const media = await prisma.signageMedia.create({
        data: {
          locationId,
          name,
          type: isVideo ? 'video' : 'image',
          url: result.secure_url,
          thumbnailUrl,
          publicId: result.public_id,
          format: result.format || file.type.split('/')[1] || 'unknown',
          width: result.width || null,
          height: result.height || null,
          bytes: result.bytes || file.size,
          duration: result.duration || null,
          folder,
        },
      });

      return NextResponse.json(media);
    } catch (error) {
      console.error('[signage/media] Upload error:', error);
      return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'unsupported content type' }, { status: 400 });
}
