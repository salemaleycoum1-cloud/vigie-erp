export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { exigerAdmin } from '../../../../lib/auth';

// GET /api/demo/reset — remet l'établissement de démo dans un état propre,
// avec des dates recalculées par rapport à aujourd'hui. À visiter avant
// chaque rendez-vous commercial. Ne touche jamais aux vrais établissements
// (identifiés par est_demo = false).

const NOM_DEMO = 'Le Bistrot Démo (DÉMO — à ne pas modifier hors rendez-vous)';

function isoMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

async function getTypeControleId(equipementType: string, nomControle: string): Promise<number> {
  const { rows } = await sql`
    SELECT id FROM types_controle
    WHERE equipement_type = ${equipementType} AND nom_controle = ${nomControle}
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error(`Type de contrôle introuvable : ${equipementType} / ${nomControle}`);
  return rows[0].id;
}

async function getTypeFormationId(nomFormation: string): Promise<number> {
  const { rows } = await sql`SELECT id FROM types_formation WHERE nom_formation = ${nomFormation} LIMIT 1`;
  if (rows.length === 0) throw new Error(`Type de formation introuvable : ${nomFormation}`);
  return rows[0].id;
}

export async function GET() {
  if (!exigerAdmin()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    // 1. Trouve ou crée l'établissement de démo
    const { rows: existant } = await sql`SELECT id FROM etablissements WHERE est_demo = true LIMIT 1`;

    let etablissementId: number;
    if (existant.length > 0) {
      etablissementId = existant[0].id;
      // Repart d'un état vide : les contrôles et formations sont supprimés
      // en cascade avec les équipements et le personnel.
      await sql`DELETE FROM equipements WHERE etablissement_id = ${etablissementId}`;
      await sql`DELETE FROM personnel WHERE etablissement_id = ${etablissementId}`;
      await sql`
        UPDATE etablissements
        SET nom = ${NOM_DEMO}, type_erp = 'N', categorie = 5, capacite_accueil = 40,
            adresse = '12 rue de la République, Arles', effectif_total = 6,
            contact_nom = NULL, contact_email = NULL
        WHERE id = ${etablissementId}
      `;
    } else {
      const { rows } = await sql`
        INSERT INTO etablissements (nom, type_erp, categorie, capacite_accueil, adresse, effectif_total, est_demo)
        VALUES (${NOM_DEMO}, 'N', 5, 40, '12 rue de la République, Arles', 6, true)
        RETURNING id
      `;
      etablissementId = rows[0].id;
    }

    // 2. Équipements + contrôles — tout est à jour, sauf un extincteur
    //    volontairement proche de l'échéance pour la démonstration en direct.
    const idVisuelExtincteur = await getTypeControleId('extincteur', 'Contrôle visuel (emplacement, pression, scellé, corrosion)');
    const idVerifCompleteExtincteur = await getTypeControleId('extincteur', 'Vérification complète NF S 61-919');
    const idAlarme = await getTypeControleId('alarme', "Essais fonctionnels du système d'alarme incendie");
    const idInstallTech = await getTypeControleId('installation_technique', 'Chauffage, ventilation, clapets coupe-feu, étanchéité réseaux');
    const idTestMensuelEclairage = await getTypeControleId('eclairage_securite', 'Test mensuel du bon fonctionnement (allumage, autonomie visuelle)');
    const idVerifSemestrielleEclairage = await getTypeControleId('eclairage_securite', "Vérification semestrielle de l'autonomie de la batterie");

    async function creerEquipement(type: string, libelle: string, sousType: string | null) {
      const { rows } = await sql`
        INSERT INTO equipements (etablissement_id, type_equipement, libelle, sous_type)
        VALUES (${etablissementId}, ${type}, ${libelle}, ${sousType})
        RETURNING id
      `;
      return rows[0].id as number;
    }

    async function enregistrerControle(equipementId: number, typeControleId: number, moisEcoules: number) {
      await sql`
        INSERT INTO controles_realises (equipement_id, type_controle_id, date_realisation, organisme_agree)
        VALUES (${equipementId}, ${typeControleId}, ${isoMonthsAgo(moisEcoules)}, 'APAVE')
      `;
    }

    // Extincteur "Salle principale" — le contrôle visuel est à jour ; la
    // vérification complète (12 mois) date de 10 mois : ~2 mois de marge,
    // à faire basculer en retard pendant le rendez-vous en changeant sa date.
    const extincteurSalle = await creerEquipement('extincteur', 'Salle principale', 'co2');
    await enregistrerControle(extincteurSalle, idVisuelExtincteur, 1);
    await enregistrerControle(extincteurSalle, idVerifCompleteExtincteur, 10);

    // Extincteur "Cuisine" — entièrement à jour.
    const extincteurCuisine = await creerEquipement('extincteur', 'Cuisine', 'poudre');
    await enregistrerControle(extincteurCuisine, idVisuelExtincteur, 1);
    await enregistrerControle(extincteurCuisine, idVerifCompleteExtincteur, 3);

    // Alarme incendie — à jour.
    const alarme = await creerEquipement('alarme', null as any, null);
    await enregistrerControle(alarme, idAlarme, 5);

    // Installation technique — à jour.
    const installTech = await creerEquipement('installation_technique', null as any, null);
    await enregistrerControle(installTech, idInstallTech, 4);

    // Éclairage de sécurité — à jour.
    const eclairage = await creerEquipement('eclairage_securite', 'Sortie de secours', null);
    await enregistrerControle(eclairage, idTestMensuelEclairage, 0);
    await enregistrerControle(eclairage, idVerifSemestrielleEclairage, 2);

    // 3. Personnel + formations — tous à jour, pour une démo propre.
    const idSST = await getTypeFormationId('SST');
    const idSSIAP1 = await getTypeFormationId('SSIAP 1');
    const idEquipier = await getTypeFormationId('Équipier 1ère intervention / évacuation');

    async function creerPersonnel(nom: string, fonction: string) {
      const { rows } = await sql`
        INSERT INTO personnel (etablissement_id, nom, fonction)
        VALUES (${etablissementId}, ${nom}, ${fonction})
        RETURNING id
      `;
      return rows[0].id as number;
    }

    async function enregistrerFormation(personnelId: number, typeFormationId: number, moisEcoules: number) {
      await sql`
        INSERT INTO formations_realisees (personnel_id, type_formation_id, date_realisation, organisme_agree)
        VALUES (${personnelId}, ${typeFormationId}, ${isoMonthsAgo(moisEcoules)}, 'CNPP')
      `;
    }

    const marie = await creerPersonnel('Marie Dupont', 'Gérante');
    await enregistrerFormation(marie, idSST, 6);

    const karim = await creerPersonnel('Karim Haddad', 'Cuisinier');
    await enregistrerFormation(karim, idEquipier, 8);

    const sophie = await creerPersonnel('Sophie Martin', 'Serveuse');
    await enregistrerFormation(sophie, idSST, 10);

    const julien = await creerPersonnel('Julien Petit', 'Agent SSIAP');
    await enregistrerFormation(julien, idSSIAP1, 12);

    const nadia = await creerPersonnel('Nadia Benali', 'Responsable salle');
    await enregistrerFormation(nadia, idSST, 4);
    await enregistrerFormation(nadia, idEquipier, 3);

    return NextResponse.json({
      success: true,
      message: 'Démo réinitialisée.',
      url: `https://vigie-erp.vercel.app/etablissements/${etablissementId}`,
      astuce:
        "Pendant le rendez-vous : modifie la date de la 'Vérification complète NF S 61-919' de l'extincteur 'Salle principale' pour la faire passer en retard (ex. recule-la de 2-3 mois) et montre le badge passer au rouge en direct.",
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
