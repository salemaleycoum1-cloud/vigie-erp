export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';
import { peutEcrireEtablissement } from '../../../../../lib/acces';

// POST /api/etablissements/[id]/personnel — ajoute un membre du personnel
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const idNum = parseInt(params.id, 10);
  if (!(await peutEcrireEtablissement(idNum))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { nom, fonction } = body;

    if (!nom) {
      return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 });
    }

    const { rows } = await sql`
      INSERT INTO personnel (etablissement_id, nom, fonction)
      VALUES (${params.id}, ${nom}, ${fonction || null})
      RETURNING *
    `;
    return NextResponse.json({ personnel: rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'ajout du personnel" }, { status: 500 });
  }
}
