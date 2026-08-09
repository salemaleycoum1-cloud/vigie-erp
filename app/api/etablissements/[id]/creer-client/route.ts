export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';
import { exigerAdmin } from '../../../../../lib/auth';
import { hacherMotDePasse } from '../../../../../lib/auth';

// POST /api/etablissements/[id]/creer-client — crée (ou réutilise) un client
// et son compte de connexion, puis lie l'établissement à ce client. Réservé à l'admin.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!exigerAdmin()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { email, nom, mot_de_passe } = body;
    if (!email || !nom || !mot_de_passe) {
      return NextResponse.json({ error: 'email, nom et mot_de_passe sont obligatoires' }, { status: 400 });
    }

    const etablissementId = parseInt(params.id, 10);

    // Trouve ou crée le client
    const { rows: clientExistant } = await sql`SELECT id FROM clients WHERE email = ${email} LIMIT 1`;
    let clientId: number;
    if (clientExistant.length > 0) {
      clientId = clientExistant[0].id;
    } else {
      const { rows } = await sql`
        INSERT INTO clients (nom, email) VALUES (${nom}, ${email}) RETURNING id
      `;
      clientId = rows[0].id;
    }

    // Lie l'établissement à ce client
    await sql`UPDATE etablissements SET client_id = ${clientId} WHERE id = ${etablissementId}`;

    // Crée ou met à jour le compte de connexion
    const hachage = hacherMotDePasse(mot_de_passe);
    await sql`
      INSERT INTO comptes (email, mot_de_passe_hash, role, client_id, statut, date_debut_essai)
      VALUES (${email}, ${hachage}, 'client', ${clientId}, 'essai', NOW())
      ON CONFLICT (email) DO UPDATE SET mot_de_passe_hash = ${hachage}, client_id = ${clientId}
    `;

    return NextResponse.json({ success: true, clientId });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
