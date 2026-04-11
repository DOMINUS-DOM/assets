export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, ADMIN_ROLES, forbidden } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const body = await req.json();
  const { imageUrl } = body;

  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl_required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'gemini_api_key_not_configured' }, { status: 500 });
  }

  try {
    // Fetch image from Cloudinary URL and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'failed_to_fetch_image' }, { status: 400 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64ImageData = Buffer.from(imageBuffer).toString('base64');

    // Determine MIME type from URL or response
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.startsWith('image/') ? contentType : 'image/jpeg';

    // Call Google Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Extract all data from this invoice image. Return ONLY valid JSON with: { supplierName, invoiceNumber, invoiceDate (YYYY-MM-DD), lines: [{ description, quantity, unitPrice, vatRate, total }], subtotal, totalVat, grandTotal }. Numbers as floats. If you cannot determine a value, use null. VAT rates should be decimal (e.g. 0.06 for 6%). Ensure the JSON is valid and complete."
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64ImageData,
                }
              }
            ]
          }]
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[extract] Gemini API error:', errorText);
      return NextResponse.json({ error: 'gemini_api_error', details: errorText }, { status: 500 });
    }

    const geminiData = await geminiResponse.json();

    // Extract text from Gemini response
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from the response text (may be wrapped in markdown code blocks)
    let extractedData: any = null;
    try {
      // Try direct parse
      extractedData = JSON.parse(rawText);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[1].trim());
        } catch {
          // Try finding JSON object pattern
          const objMatch = rawText.match(/\{[\s\S]*\}/);
          if (objMatch) {
            try {
              extractedData = JSON.parse(objMatch[0]);
            } catch {
              return NextResponse.json({
                error: 'parse_error',
                rawText,
                message: 'Could not parse JSON from Gemini response',
              }, { status: 422 });
            }
          }
        }
      } else {
        // Last attempt: find raw JSON object
        const objMatch = rawText.match(/\{[\s\S]*\}/);
        if (objMatch) {
          try {
            extractedData = JSON.parse(objMatch[0]);
          } catch {
            return NextResponse.json({
              error: 'parse_error',
              rawText,
              message: 'Could not parse JSON from Gemini response',
            }, { status: 422 });
          }
        } else {
          return NextResponse.json({
            error: 'no_json_found',
            rawText,
            message: 'Gemini response did not contain parseable JSON',
          }, { status: 422 });
        }
      }
    }

    // Normalize and validate the extracted data
    const normalized = {
      supplierName: extractedData.supplierName || null,
      invoiceNumber: extractedData.invoiceNumber || null,
      invoiceDate: extractedData.invoiceDate || null,
      lines: Array.isArray(extractedData.lines)
        ? extractedData.lines.map((l: any) => ({
            description: l.description || '',
            quantity: parseFloat(l.quantity) || 0,
            unitPrice: parseFloat(l.unitPrice) || 0,
            vatRate: parseFloat(l.vatRate) || 0.06,
            total: parseFloat(l.total) || 0,
          }))
        : [],
      subtotal: parseFloat(extractedData.subtotal) || 0,
      totalVat: parseFloat(extractedData.totalVat) || 0,
      grandTotal: parseFloat(extractedData.grandTotal) || 0,
    };

    return NextResponse.json(normalized);
  } catch (error: any) {
    console.error('[extract] Unexpected error:', error);
    return NextResponse.json({ error: 'extraction_failed', message: error.message }, { status: 500 });
  }
}
