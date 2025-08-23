import { NextResponse } from 'next/server';

export async function POST() {
  const url = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!url) return NextResponse.json({ ok: false, text: 'VERCEL_DEPLOY_HOOK_URL no configurada' }, { status: 400 });
  const r = await fetch(url, { method: 'POST' });
  const text = await r.text();
  return NextResponse.json({ ok: r.ok, text });
}
