export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { exigerAdmin } from '../../../lib/auth';

// GET /api/etablissements — liste tous les établissements (avec compte d'échéances en retard)
export async function GET() {
  if (!exigerAdmin()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const { rows } = await sql`
      SELECT
        e.*,
        COUNT(ech.controle_realise_id) FILTER (WHERE ech.prochaine_echeance < CURRENT_DATE) AS echeances_en_retard,
        COUNT(ech.controle_realise_id) FILTER (
          WHERE ech.prochaine_echeance >= CURRENT_DATE
          AND ech.prochaine_echeance <= CURRENT_DATE + INTERVAL '30 days'
        ) AS echeances_a_venir
      FROM etablissements e
      LEFT JOIN echeances ech ON ech.etablissement_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;
    return NextResponse.json({ etablissements: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des établissements' }, { status: 500 });
  }
}

// POST /api/etablissements — crée un nouvel établissement
export async function POST(req: NextRequest) {
  if (!exigerAdmin()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { client_id, nom, type_erp, categorie, capacite_accueil, adresse, contact_email, contact_nom } = body;

    if (!nom || !type_erp || !categorie) {
      return NextResponse.json(
        { error: 'Les champs nom, type_erp et categorie sont obligatoires' },
        { status: 400 }
      );
    }
    const typesErpValides = [
      'J', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y',
      'PA', 'CTS', 'SG', 'PS', 'GA', 'OA', 'EF', 'REF',
    ];
    if (!typesErpValides.includes(type_erp)) {
      return NextResponse.json({ error: 'type_erp invalide' }, { status: 400 });
    }
    if (![4, 5].includes(Number(categorie))) {
      return NextResponse.json({ error: 'categorie doit être 4 ou 5' }, { status: 400 });
    }

    const { rows } = await sql`
      INSERT INTO etablissements (client_id, nom, type_erp, categorie, capacite_accueil, adresse, contact_email, contact_nom)
      VALUES (${client_id}, ${nom}, ${type_erp}, ${categorie}, ${capacite_accueil || null}, ${adresse || null}, ${contact_email || null}, ${contact_nom || null})
      RETURNING *
    `;
    return NextResponse.json({ etablissement: rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la création de l\'établissement' }, { status: 500 });
  }
}
