export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { exigerAdmin } from '../../../../lib/auth';
import { peutLireEtablissement, raisonRefusEcriture } from '../../../../lib/acces';

// GET /api/etablissements/[id] — détail d'un établissement avec ses équipements et échéances
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const idNum = parseInt(params.id, 10);
  if (!(await peutLireEtablissement(idNum))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const { rows: etabRows } = await sql`
      SELECT * FROM etablissements WHERE id = ${params.id}
    `;
    if (etabRows.length === 0) {
      return NextResponse.json({ error: 'Établissement introuvable' }, { status: 404 });
    }

    const { rows: equipements } = await sql`
      SELECT * FROM equipements WHERE etablissement_id = ${parseInt(params.id, 10)} ORDER BY type_equipement
    `;

    const { rows: echeances } = await sql`
      SELECT * FROM echeances WHERE etablissement_id = ${params.id} ORDER BY prochaine_echeance ASC
    `;

    return NextResponse.json({
      etablissement: etabRows[0],
      equipements,
      echeances,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la récupération de l\'établissement' }, { status: 500 });
  }
}

// DELETE /api/etablissements/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!exigerAdmin()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    await sql`DELETE FROM etablissements WHERE id = ${params.id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}

// PATCH /api/etablissements/[id] — met à jour le contact client (pour les alertes)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const idNum0 = parseInt(params.id, 10);
  const raison = await raisonRefusEcriture(idNum0);
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
    const champsAutorises = [
      'nom',
      'type_erp',
      'categorie',
      'capacite_accueil',
      'adresse',
      'contact_email',
      'contact_nom',
      'effectif_total',
      'effectif_forme_sst',
      'date_dernier_recyclage_sst',
      'effectif_forme_incendie',
      'date_dernier_recyclage_incendie',
      'cadence_incendie_mois',
    ];

    // Ne met à jour que les champs explicitement présents dans la requête,
    // pour que plusieurs formulaires différents (identité / contact / couverture
    // formation) puissent modifier le même établissement sans s'écraser mutuellement.
    const champsPresents = champsAutorises.filter((c) => c in body);
    if (champsPresents.length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    if ('nom' in body && !String(body.nom || '').trim()) {
      return NextResponse.json({ error: 'Le nom ne peut pas être vide' }, { status: 400 });
    }
    if ('categorie' in body && ![4, 5].includes(Number(body.categorie))) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 });
    }

    const setClause = champsPresents.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const valeurs = champsPresents.map((c) => body[c] ?? null);
    const idNum = parseInt(params.id, 10);

    const { rows } = await sql.query(
      `UPDATE etablissements SET ${setClause} WHERE id = $${champsPresents.length + 1} RETURNING *`,
      [...valeurs, idNum]
    );
    return NextResponse.json({ etablissement: rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}
