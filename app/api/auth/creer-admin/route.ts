export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { hacherMotDePasse } from '../../../../lib/auth';

// GET /api/auth/creer-admin?secret=...&email=...&mot_de_passe=... — crée ou
// réinitialise le mot de passe du compte admin. Protégée par INIT_SECRET
// (même mécanisme que /api/init) pour ne jamais rester ouverte par défaut.
export async function GET(req: NextRequest) {
  const secretAttendu = process.env.INIT_SECRET;
  if (!secretAttendu) {
    return NextResponse.json(
      { success: false, error: 'INIT_SECRET non configuré — route désactivée par sécurité.' },
      { status: 503 }
    );
  }
  const params = req.nextUrl.searchParams;
  const secretFourni = params.get('secret');
  if (secretFourni !== secretAttendu) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const email = params.get('email');
    const motDePasse = params.get('mot_de_passe');
    if (!email || !motDePasse) {
      return NextResponse.json({ error: 'email et mot_de_passe requis' }, { status: 400 });
    }
    const hachage = hacherMotDePasse(motDePasse);

    await sql`
      INSERT INTO comptes (email, mot_de_passe_hash, role, client_id, statut)
      VALUES (${email}, ${hachage}, 'admin', NULL, 'actif')
      ON CONFLICT (email) DO UPDATE SET mot_de_passe_hash = ${hachage}, role = 'admin'
    `;

    return NextResponse.json({ success: true, message: 'Compte admin créé/mis à jour.' });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
