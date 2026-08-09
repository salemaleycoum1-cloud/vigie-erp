export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';
import { etablissementIdDepuisPersonnel, peutEcrireEtablissement } from '../../../../../lib/acces';

// POST /api/personnel/[id]/formations — enregistre une formation réalisée
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const idNum = parseInt(params.id, 10);
  const etablissementId = await etablissementIdDepuisPersonnel(idNum);
  if (etablissementId === null || !(await peutEcrireEtablissement(etablissementId))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { type_formation_id, date_realisation, organisme_agree, document_pdf_url } = body;

    if (!type_formation_id || !date_realisation) {
      return NextResponse.json(
        { error: 'type_formation_id et date_realisation sont obligatoires' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      INSERT INTO formations_realisees (personnel_id, type_formation_id, date_realisation, organisme_agree, document_pdf_url)
      VALUES (${params.id}, ${type_formation_id}, ${date_realisation}, ${organisme_agree || null}, ${document_pdf_url || null})
      RETURNING *
    `;
    return NextResponse.json({ formation: rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement de la formation" }, { status: 500 });
  }
}
