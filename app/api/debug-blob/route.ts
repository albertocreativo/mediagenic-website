import { list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  try {
    const { blobs } = await list({ prefix: slug ? `${slug}/` : undefined });
    return NextResponse.json({ ok: true, count: blobs.length, urls: blobs.map(b => ({ pathname: b.pathname, url: b.url })) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
