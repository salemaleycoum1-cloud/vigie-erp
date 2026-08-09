export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { verifierMotDePasse, creerJetonSession, SESSION_COOKIE_NOM } from '../../../../lib/auth';

// POST /api/auth/connexion — connecte un compte (admin ou client) et pose
// un cookie de session signé, httpOnly.
export async function POST(req: NextRequest) {
  try {
    const { email, mot_de_passe } = await req.json();
    if (!email || !mot_de_passe) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const { rows } = await sql`
      SELECT id, mot_de_passe_hash, role, client_id
      FROM comptes
      WHERE email = ${email}
      LIMIT 1
    `;
    if (rows.length === 0 || !verifierMotDePasse(mot_de_passe, rows[0].mot_de_passe_hash)) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
    }

    const compte = rows[0];
    const jeton = creerJetonSession({
      compteId: compte.id,
      role: compte.role,
      clientId: compte.client_id,
    });

    const reponse = NextResponse.json({ success: true, role: compte.role });
    reponse.cookies.set(SESSION_COOKIE_NOM, jeton, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return reponse;
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
