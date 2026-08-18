import { sql } from './db';
import { lireSession } from './auth';

// Un client ne peut agir que sur SES propres établissements (via clients.id),
// et seulement en écriture si son statut n'est pas 'expire' (lecture seule
// après la période d'essai sans abonnement actif). Un admin peut toujours tout.

export async function peutLireEtablissement(etablissementId: number): Promise<boolean> {
  const session = lireSession();
  if (!session) return false;
  if (session.role === 'admin') return true;

  const { rows } = await sql`SELECT client_id FROM etablissements WHERE id = ${etablissementId}`;
  if (rows.length === 0) return false;
  return rows[0].client_id === session.clientId;
}

export async function peutEcrireEtablissement(etablissementId: number): Promise<boolean> {
  const raison = await raisonRefusEcriture(etablissementId);
  return raison === null;
}

// Version détaillée : renvoie null si l'écriture est autorisée, sinon le motif
// précis du refus. Utilisée par les routes d'écriture pour distinguer un vrai
// problème d'accès ('interdit') d'un essai expiré ('essai_expire'), afin
// d'afficher le bon message côté client (ex. bouton d'abonnement direct).
export type RaisonRefusEcriture = 'interdit' | 'essai_expire';

export async function raisonRefusEcriture(
  etablissementId: number
): Promise<RaisonRefusEcriture | null> {
  const session = lireSession();
  if (!session) return 'interdit';
  if (session.role === 'admin') return null;

  const { rows } = await sql`SELECT client_id FROM etablissements WHERE id = ${etablissementId}`;
  if (rows.length === 0 || rows[0].client_id !== session.clientId) return 'interdit';

  const { rows: compteRows } = await sql`SELECT statut FROM comptes WHERE id = ${session.compteId}`;
  if (compteRows.length === 0) return 'interdit';
  return compteRows[0].statut === 'expire' ? 'essai_expire' : null;
}

export async function etablissementIdDepuisEquipement(equipementId: number): Promise<number | null> {
  const { rows } = await sql`SELECT etablissement_id FROM equipements WHERE id = ${equipementId}`;
  return rows.length > 0 ? rows[0].etablissement_id : null;
}

export async function etablissementIdDepuisPersonnel(personnelId: number): Promise<number | null> {
  const { rows } = await sql`SELECT etablissement_id FROM personnel WHERE id = ${personnelId}`;
  return rows.length > 0 ? rows[0].etablissement_id : null;
}

export async function etablissementIdDepuisFormation(formationRealiseeId: number): Promise<number | null> {
  const { rows } = await sql`
    SELECT p.etablissement_id AS etablissement_id
    FROM formations_realisees fr
    JOIN personnel p ON p.id = fr.personnel_id
    WHERE fr.id = ${formationRealiseeId}
  `;
  return rows.length > 0 ? rows[0].etablissement_id : null;
}

// Nombre de jours d'essai restants avant expiration (durée alignée sur le cron
// /api/cron/expirer-essais, qui bascule réellement le statut). Retourne null si
// aucune date de début n'est connue. Ne descend jamais en dessous de 0.
export const DUREE_ESSAI_JOURS = 14;

export function joursEssaiRestants(dateDebutEssai: string | Date | null): number | null {
  if (!dateDebutEssai) return null;
  const debut = new Date(dateDebutEssai).getTime();
  const joursEcoules = Math.floor((Date.now() - debut) / (24 * 60 * 60 * 1000));
  return Math.max(0, DUREE_ESSAI_JOURS - joursEcoules);
}
