export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { sql, LIBELLES_EQUIPEMENT, LIBELLES_SOUS_TYPE_EXTINCTEUR, libelleSousType } from '../../../lib/db';
import { lireSession } from '../../../lib/auth';
import { notFound, redirect } from 'next/navigation';
import AjoutEquipement from './AjoutEquipement';
import SupprimerEquipement from './SupprimerEquipement';
import MarquerFait from './MarquerFait';
import AjouterEcheance from './AjouterEcheance';
import AjoutPersonnel from './AjoutPersonnel';
import SupprimerPersonnel from './SupprimerPersonnel';
import MarquerFormationFaite from './MarquerFormationFaite';
import AjouterEcheanceFormation from './AjouterEcheanceFormation';
import SupprimerFormation from './SupprimerFormation';
import ModifierContact from './ModifierContact';
import CreerAccesClient from './CreerAccesClient';
import CouvertureBarres from './CouvertureBarres';
import SuiviIndividuel from './SuiviIndividuel';
import SuiviEPI from './SuiviEPI';
import SupprimerEtablissement from './SupprimerEtablissement';
import ModifierEtablissement from './ModifierEtablissement';

async function getDetail(id: string) {
  const { rows: etabRows } = await sql`
    SELECT
      id, client_id, nom, type_erp, categorie, capacite_accueil, adresse, created_at,
      contact_email, contact_nom, effectif_total, effectif_forme_sst,
      date_dernier_recyclage_sst, effectif_forme_incendie, date_dernier_recyclage_incendie,
      cadence_incendie_mois, est_demo
    FROM etablissements
    WHERE id = ${id}
  `;
  if (etabRows.length === 0) return null;

  const idNum = parseInt(id, 10);
  const equipResult = await sql.query(
    'SELECT * FROM equipements WHERE etablissement_id = $1 ORDER BY type_equipement',
    [idNum]
  );
  const equipements = equipResult.rows;

  const echeancesResult = await sql.query(
    'SELECT * FROM echeances WHERE etablissement_id = $1 ORDER BY prochaine_echeance ASC',
    [idNum]
  );
  const echeances = echeancesResult.rows;

  const { rows: typesControle } = await sql`SELECT * FROM types_controle ORDER BY equipement_type, nom_controle`;

  const personnelResult = await sql.query(
    'SELECT * FROM personnel WHERE etablissement_id = $1 ORDER BY nom',
    [idNum]
  );
  const personnel = personnelResult.rows;

  const echeancesPersonnelResult = await sql.query(
    'SELECT * FROM echeances_personnel WHERE etablissement_id = $1 ORDER BY prochaine_echeance ASC',
    [idNum]
  );
  const echeancesPersonnel = echeancesPersonnelResult.rows;

  const { rows: typesFormation } = await sql`SELECT * FROM types_formation ORDER BY nom_formation`;

  // Suivi individuel SST / EPI : une ligne par salarié, avec échéance calculée
  // uniquement pour le SST (le recyclage EPI n'a pas de périodicité légale établie,
  // donc on affiche la date sans échéance pour ne pas afficher une obligation non vérifiée).
  const suiviIndividuelResult = await sql.query(
    `SELECT
       p.id AS personnel_id,
       p.nom,
       p.fonction,
       sst.date_realisation AS sst_date,
       sst.prochaine_echeance AS sst_echeance,
       epi.date_realisation AS epi_date
     FROM personnel p
     LEFT JOIN echeances_personnel sst
       ON sst.personnel_id = p.id AND sst.nom_formation = 'SST'
     LEFT JOIN echeances_personnel epi
       ON epi.personnel_id = p.id AND epi.nom_formation = 'Équipier 1ère intervention / évacuation'
     WHERE p.etablissement_id = $1
     ORDER BY p.nom`,
    [idNum]
  );
  const suiviIndividuel = suiviIndividuelResult.rows;

  // Couverture par formation : pour chaque type de formation existant, combien de
  // salariés de cet établissement sont à jour — calculé depuis la vue echeances_personnel
  // (même source que le suivi nominatif, donc toujours synchronisé). Un salarié peut
  // apparaître dans plusieurs formations à la fois (SST + EPI + SSIAP...), donc ces
  // pourcentages ne totalisent pas 100 % — normal, ce n'est pas un camembert.
  const couvertureResult = await sql.query(
    `SELECT
       tf.id,
       tf.nom_formation,
       tf.statut,
       COUNT(*) FILTER (WHERE ep.prochaine_echeance >= CURRENT_DATE) AS a_jour
     FROM types_formation tf
     LEFT JOIN echeances_personnel ep
       ON ep.type_formation_id = tf.id AND ep.etablissement_id = $1
     GROUP BY tf.id, tf.nom_formation, tf.statut
     ORDER BY tf.nom_formation`,
    [idNum]
  );
  const couvertureParFormation = couvertureResult.rows;

  return {
    etablissement: etabRows[0],
    equipements,
    echeances,
    typesControle,
    personnel,
    echeancesPersonnel,
    typesFormation,
    suiviIndividuel,
    couvertureParFormation,
  };
}

function joursRestants(dateStr: string) {
  const jours = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return jours;
}

export default async function EtablissementPage({ params }: { params: { id: string } }) {
  const session = lireSession();
  if (!session || session.role !== 'admin') {
    redirect('/connexion');
  }

  const data = await getDetail(params.id);
  if (!data) notFound();

  const { etablissement, equipements, echeances, typesControle, personnel, echeancesPersonnel, typesFormation, suiviIndividuel, couvertureParFormation } = data;

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {etablissement.nom}
          {etablissement.est_demo && (
            <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-violet-700">
              Démo
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          ERP {etablissement.type_erp} — {etablissement.categorie}e catégorie
          {etablissement.capacite_accueil && ` · ${etablissement.capacite_accueil} personnes`}
        </p>
        <div className="mt-2">
          <ModifierEtablissement
            etablissementId={etablissement.id}
            nomInitial={etablissement.nom}
            typeErpInitial={etablissement.type_erp}
            categorieInitial={etablissement.categorie}
            capaciteInitial={etablissement.capacite_accueil}
            adresseInitial={etablissement.adresse}
          />
        </div>
        <div className="mt-2">
          <ModifierContact
            etablissementId={etablissement.id}
            contactNomInitial={etablissement.contact_nom}
            contactEmailInitial={etablissement.contact_email}
          />
        </div>
        <div className="mt-2">
          <CreerAccesClient
            etablissementId={etablissement.id}
            contactNomInitial={etablissement.contact_nom}
            contactEmailInitial={etablissement.contact_email}
          />
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <SupprimerEtablissement etablissementId={etablissement.id} nom={etablissement.nom} />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Échéances
          </h2>
          <div className="mt-3 space-y-2">
            {echeances.length === 0 && (
              <p className="text-sm text-slate-400">Aucun contrôle enregistré pour l'instant.</p>
            )}
            {echeances.map((ech: any) => {
              const jours = joursRestants(ech.prochaine_echeance);
              const enRetard = jours < 0;
              const bientot = jours >= 0 && jours <= 30;
              return (
                <div
                  key={ech.controle_realise_id}
                  className={`rounded-md border px-3 py-2.5 text-sm ${
                    enRetard
                      ? 'border-red-200 bg-red-50'
                      : bientot
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{ech.nom_controle}</span>
                    <div className="flex items-center">
                      <span
                        className={
                          enRetard ? 'text-red-700' : bientot ? 'text-amber-700' : 'text-slate-500'
                        }
                      >
                        {enRetard
                          ? `En retard de ${Math.abs(jours)} j`
                          : `Dans ${jours} j`}
                      </span>
                      <MarquerFait equipementId={ech.equipement_id} typeControleId={ech.type_controle_id} />
                    </div>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {LIBELLES_EQUIPEMENT[ech.type_equipement as keyof typeof LIBELLES_EQUIPEMENT]}
                    {ech.sous_type ? ` (${libelleSousType(ech.type_equipement, ech.sous_type)})` : ''}
                    {ech.equipement_libelle ? ` — ${ech.equipement_libelle}` : ''} · Échéance le{' '}
                    {new Date(ech.prochaine_echeance).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <AjouterEcheance equipements={equipements as any} typesControle={typesControle as any} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Équipements
          </h2>
          <div className="mt-3 space-y-2">
            {equipements.length === 0 && (
              <p className="text-sm text-slate-400">Aucun équipement enregistré.</p>
            )}
            {equipements.map((eq: any) => (
              <div key={eq.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm">
                <div>
                  <span className="font-medium text-slate-800">
                    {LIBELLES_EQUIPEMENT[eq.type_equipement as keyof typeof LIBELLES_EQUIPEMENT]}
                  </span>
                  {eq.sous_type && (
                    <span className="text-slate-500"> ({libelleSousType(eq.type_equipement, eq.sous_type)})</span>
                  )}
                  {eq.libelle && <span className="text-slate-500"> — {eq.libelle}</span>}
                </div>
                <SupprimerEquipement equipementId={eq.id} />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <AjoutEquipement etablissementId={etablissement.id} />
          </div>
        </section>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Personnel — Formations
        </h2>
        <div className="mt-3 grid gap-8 md:grid-cols-2">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Échéances de formation
            </h3>
            <div className="mt-3 space-y-2">
              {echeancesPersonnel.length === 0 && (
                <p className="text-sm text-slate-400">Aucune formation enregistrée pour l'instant.</p>
              )}
              {echeancesPersonnel.map((ech: any) => {
                const jours = joursRestants(ech.prochaine_echeance);
                const enRetard = jours < 0;
                const bientot = jours >= 0 && jours <= 30;
                return (
                  <div
                    key={ech.formation_realisee_id}
                    className={`rounded-md border px-3 py-2.5 text-sm ${
                      enRetard
                        ? 'border-red-200 bg-red-50'
                        : bientot
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">
                        {ech.nom_formation}
                        {ech.statut === 'recommande' && (
                          <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                            recommandé
                          </span>
                        )}
                      </span>
                      <div className="flex items-center">
                        <span
                          className={
                            enRetard ? 'text-red-700' : bientot ? 'text-amber-700' : 'text-slate-500'
                          }
                        >
                          {enRetard ? `En retard de ${Math.abs(jours)} j` : `Dans ${jours} j`}
                        </span>
                        <MarquerFormationFaite
                          personnelId={ech.personnel_id}
                          typeFormationId={ech.type_formation_id}
                        />
                        <SupprimerFormation formationRealiseeId={ech.formation_realisee_id} />
                      </div>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {ech.personnel_nom}
                      {ech.fonction ? ` — ${ech.fonction}` : ''} · Échéance le{' '}
                      {new Date(ech.prochaine_echeance).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <AjouterEcheanceFormation personnel={personnel as any} typesFormation={typesFormation as any} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Personnel
            </h3>
            <div className="mt-3 space-y-2">
              {personnel.length === 0 && (
                <p className="text-sm text-slate-400">Aucun membre du personnel enregistré.</p>
              )}
              {personnel.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium text-slate-800">{p.nom}</span>
                    {p.fonction && <span className="text-slate-500"> — {p.fonction}</span>}
                  </div>
                  <SupprimerPersonnel personnelId={p.id} />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <AjoutPersonnel etablissementId={etablissement.id} />
            </div>
          </section>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Suivi individuel SST
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Une ligne par salarié. Échéance de recyclage à 24 mois, avec badge d'alerte si dépassée
          ou proche.
        </p>
        <div className="mt-3">
          <SuiviIndividuel lignes={suiviIndividuel as any} />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Suivi EPI (Équipier 1ère intervention)
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Repères à 6 et 12 mois affichés à titre indicatif seulement — le seul élément légalement
          obligatoire est l'exercice d'évacuation semestriel (article R4227-39), pas le recyclage
          individuel de cette formation. Pas de badge d'alerte ici volontairement, pour ne pas
          laisser croire à une obligation non vérifiée.
        </p>
        <div className="mt-3">
          <SuiviEPI lignes={suiviIndividuel as any} />
        </div>
      </div>

      <div className="mt-10">
        <CouvertureBarres
          etablissementId={etablissement.id}
          effectifTotal={etablissement.effectif_total}
          couverture={couvertureParFormation as any}
        />
      </div>
    </main>
  );
}
