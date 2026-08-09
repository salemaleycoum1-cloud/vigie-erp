export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NOM } from '../../../../lib/auth';

export async function POST() {
  const reponse = NextResponse.json({ success: true });
  reponse.cookies.set(SESSION_COOKIE_NOM, '', { path: '/', maxAge: 0 });
  return reponse;
}
