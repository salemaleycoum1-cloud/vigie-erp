export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';
import { raisonRefusEcriture } from '../../../../../lib/acces';

// POST /api/etablissements/[id]/equipements — ajoute un équipement à un établissement
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const idNum = parseInt(params.id, 10);
  const raison = await raisonRefusEcriture(idNum);
  if (raison === 'essai_expire') {
    return NextResponse.json(
      { error: 'Votre période d\'essai est terminée. Abonnez-vous pour continuer à modifier vos données.', code: 'ESSAI_EXPIRE' },
      { status: 403 }
    );
  }
  if (raison === 'interdit') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { type_equipement, libelle, sous_type } = body;

    const typesValides = [
      'extincteur', 'ssi', 'desenfumage', 'ria', 'sprinkler', 'installation_technique',
      'alarme', 'eclairage_securite', 'porte_coupe_feu', 'installation_electrique',
    ];
    if (!typesValides.includes(type_equipement)) {
      return NextResponse.json({ error: 'type_equipement invalide' }, { status: 400 });
    }

    const sousTypesParType: Record<string, string[]> = {
      extincteur: ['co2', 'eau_additif', 'poudre'],
      ssi: ['A', 'B', 'C', 'D', 'E'],
      alarme: ['type_1', 'type_2a', 'type_2b', 'type_3', 'type_4'],
    };
    if (sous_type) {
      const valides = sousTypesParType[type_equipement] || [];
      if (!valides.includes(sous_type)) {
        return NextResponse.json({ error: "sous_type invalide pour ce type d'équipement" }, { status: 400 });
      }
    }

    const { rows } = await sql`
      INSERT INTO equipements (etablissement_id, type_equipement, libelle, sous_type)
      VALUES (${params.id}, ${type_equipement}, ${libelle || null}, ${sous_type || null})
      RETURNING *
    `;
    return NextResponse.json({ equipement: rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de l\'ajout de l\'équipement' }, { status: 500 });
  }
}
