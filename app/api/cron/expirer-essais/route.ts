export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

const DUREE_ESSAI_JOURS = 14;

// GET /api/cron/expirer-essais — appelée quotidiennement par Vercel Cron (voir vercel.json)
// Bascule en statut 'expire' tout compte encore en 'essai' dont la période de 14 jours
// est dépassée. C'est la seule chose qui fait réellement expirer un essai : sans ce cron,
// un compte en 'essai' reste en accès complet indéfiniment.
export async function GET(req: NextRequest) {
  // Sécurité : si CRON_SECRET est configuré, exige l'en-tête Authorization correspondant
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  try {
    const dateLimite = new Date(Date.now() - DUREE_ESSAI_JOURS * 24 * 60 * 60 * 1000).toISOString();
    const { rows } = await sql`
      UPDATE comptes
      SET statut = 'expire'
      WHERE statut = 'essai'
        AND date_debut_essai IS NOT NULL
        AND date_debut_essai < ${dateLimite}
      RETURNING id, email
    `;
    return NextResponse.json({ success: true, comptesExpires: rows.length, comptes: rows.map((r) => r.email) });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
