export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { sendEmailBrevo } from '../../../../lib/brevo';

function joursRestants(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function seuilActif(jours: number): 'j30' | 'j7' | 'depasse' | null {
  if (jours < 0) return 'depasse';
  if (jours <= 7) return 'j7';
  if (jours <= 30) return 'j30';
  return null;
}

// GET /api/cron/alertes — appelée quotidiennement par Vercel Cron (voir vercel.json)
export async function GET(req: NextRequest) {
  // Sécurité : si CRON_SECRET est configuré, exige l'en-tête Authorization correspondant
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  let alertesEnvoyees = 0;
  const erreurs: string[] = [];

  try {
    // --- Échéances équipements ---
    const { rows: echeancesEquip } = await sql`
      SELECT ech.*, e.nom AS etab_nom, e.contact_email, e.contact_nom
      FROM echeances ech
      JOIN etablissements e ON e.id = ech.etablissement_id
    `;

    for (const ech of echeancesEquip) {
      const jours = joursRestants(ech.prochaine_echeance);
      const seuil = seuilActif(jours);
      if (!seuil) continue;

      const { rows: existant } = await sql`
        SELECT id FROM alertes_envoyees_equipement
        WHERE equipement_id = ${ech.equipement_id}
          AND type_controle_id = ${ech.type_controle_id}
          AND prochaine_echeance = ${ech.prochaine_echeance}
          AND seuil = ${seuil}
      `;
      if (existant.length > 0) continue;

      const destinataires: { email: string; name?: string }[] = [];
      if (adminEmail) destinataires.push({ email: adminEmail });
      if (ech.contact_email) {
        destinataires.push({ email: ech.contact_email, name: ech.contact_nom || undefined });
      }
      if (destinataires.length === 0) continue;

      const sujet =
        seuil === 'depasse'
          ? `⚠️ Échéance dépassée — ${ech.etab_nom}`
          : `Rappel — échéance dans ${jours} jour(s) — ${ech.etab_nom}`;
      const html = `
        <p>Établissement : <strong>${ech.etab_nom}</strong></p>
        <p>Contrôle : <strong>${ech.nom_controle}</strong>${ech.equipement_libelle ? ` — ${ech.equipement_libelle}` : ''}</p>
        <p>Échéance : ${new Date(ech.prochaine_echeance).toLocaleDateString('fr-FR')}
          ${seuil === 'depasse' ? ` (en retard de ${Math.abs(jours)} jour(s))` : ` (dans ${jours} jour(s))`}
        </p>
      `;

      const resultat = await sendEmailBrevo({ to: destinataires, subject: sujet, htmlContent: html });
      if (resultat.success) {
        await sql`
          INSERT INTO alertes_envoyees_equipement (equipement_id, type_controle_id, prochaine_echeance, seuil)
          VALUES (${ech.equipement_id}, ${ech.type_controle_id}, ${ech.prochaine_echeance}, ${seuil})
        `;
        alertesEnvoyees++;
      } else {
        erreurs.push(`equipement ${ech.equipement_id}: ${resultat.error}`);
      }
    }

    // --- Échéances formations ---
    const { rows: echeancesForm } = await sql`
      SELECT ech.*, e.nom AS etab_nom, e.contact_email, e.contact_nom
      FROM echeances_personnel ech
      JOIN etablissements e ON e.id = ech.etablissement_id
    `;

    for (const ech of echeancesForm) {
      const jours = joursRestants(ech.prochaine_echeance);
      const seuil = seuilActif(jours);
      if (!seuil) continue;

      const { rows: existant } = await sql`
        SELECT id FROM alertes_envoyees_personnel
        WHERE personnel_id = ${ech.personnel_id}
          AND type_formation_id = ${ech.type_formation_id}
          AND prochaine_echeance = ${ech.prochaine_echeance}
          AND seuil = ${seuil}
      `;
      if (existant.length > 0) continue;

      const destinataires: { email: string; name?: string }[] = [];
      if (adminEmail) destinataires.push({ email: adminEmail });
      if (ech.contact_email) {
        destinataires.push({ email: ech.contact_email, name: ech.contact_nom || undefined });
      }
      if (destinataires.length === 0) continue;

      const sujet =
        seuil === 'depasse'
          ? `⚠️ Formation en retard — ${ech.etab_nom}`
          : `Rappel formation — dans ${jours} jour(s) — ${ech.etab_nom}`;
      const html = `
        <p>Établissement : <strong>${ech.etab_nom}</strong></p>
        <p>Formation : <strong>${ech.nom_formation}</strong> — ${ech.personnel_nom}${ech.fonction ? ` (${ech.fonction})` : ''}</p>
        <p>Échéance : ${new Date(ech.prochaine_echeance).toLocaleDateString('fr-FR')}
          ${seuil === 'depasse' ? ` (en retard de ${Math.abs(jours)} jour(s))` : ` (dans ${jours} jour(s))`}
        </p>
      `;

      const resultat = await sendEmailBrevo({ to: destinataires, subject: sujet, htmlContent: html });
      if (resultat.success) {
        await sql`
          INSERT INTO alertes_envoyees_personnel (personnel_id, type_formation_id, prochaine_echeance, seuil)
          VALUES (${ech.personnel_id}, ${ech.type_formation_id}, ${ech.prochaine_echeance}, ${seuil})
        `;
        alertesEnvoyees++;
      } else {
        erreurs.push(`personnel ${ech.personnel_id}: ${resultat.error}`);
      }
    }

    return NextResponse.json({ success: true, alertesEnvoyees, erreurs });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
