export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';
import { etablissementIdDepuisEquipement, peutLireEtablissement, peutEcrireEtablissement } from '../../../../../lib/acces';

// GET /api/equipements/[id]/controles — types de contrôle applicables + historique
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const idNum = parseInt(params.id, 10);
  const etablissementId = await etablissementIdDepuisEquipement(idNum);
  if (etablissementId === null || !(await peutLireEtablissement(etablissementId))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const { rows: equipRows } = await sql`SELECT * FROM equipements WHERE id = ${params.id}`;
    if (equipRows.length === 0) {
      return NextResponse.json({ error: 'Équipement introuvable' }, { status: 404 });
    }
    const equipement = equipRows[0];

    const { rows: typesControle } = await sql`
      SELECT * FROM types_controle WHERE equipement_type = ${equipement.type_equipement}
    `;

    const { rows: historique } = await sql`
      SELECT cr.*, tc.nom_controle, tc.periodicite_mois
      FROM controles_realises cr
      JOIN types_controle tc ON cr.type_controle_id = tc.id
      WHERE cr.equipement_id = ${params.id}
      ORDER BY cr.date_realisation DESC
    `;

    return NextResponse.json({ equipement, types_controle: typesControle, historique });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 });
  }
}

// POST /api/equipements/[id]/controles — enregistre un contrôle réalisé
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const idNum2 = parseInt(params.id, 10);
  const etablissementId2 = await etablissementIdDepuisEquipement(idNum2);
  if (etablissementId2 === null || !(await peutEcrireEtablissement(etablissementId2))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { type_controle_id, date_realisation, organisme_agree, document_pdf_url } = body;

    if (!type_controle_id || !date_realisation) {
      return NextResponse.json(
        { error: 'type_controle_id et date_realisation sont obligatoires' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      INSERT INTO controles_realises (equipement_id, type_controle_id, date_realisation, organisme_agree, document_pdf_url)
      VALUES (${params.id}, ${type_controle_id}, ${date_realisation}, ${organisme_agree || null}, ${document_pdf_url || null})
      RETURNING *
    `;
    return NextResponse.json({ controle: rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement du contrôle' }, { status: 500 });
  }
}
