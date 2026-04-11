export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy for kiosk orders
// The KIOSK_API_KEY stays server-side (not NEXT_PUBLIC_)
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Forward to orders API with kiosk key added server-side
  const kioskKey = process.env.KIOSK_API_KEY || '';

  const baseUrl = req.nextUrl.origin;
  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kiosk-Key': kioskKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
