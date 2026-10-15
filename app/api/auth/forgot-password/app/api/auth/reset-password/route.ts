export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { hacherMotDePasse } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { token, motDePasse } = await req.json();
    if (!token || !motDePasse) {
      return NextResponse.json(
        { error: 'Token et mot de passe requis' },
        { status: 400 }
      );
    }

    if (motDePasse.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      SELECT id FROM comptes
      WHERE reset_token = ${token}
      AND reset_token_expires > NOW()
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    const compte = rows[0];
    const hash = hacherMotDePasse(motDePasse);

    await sql`
      UPDATE comptes
      SET mot_de_passe_hash = ${hash},
          reset_token = NULL,
          reset_token_expires = NULL
      WHERE id = ${compte.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
