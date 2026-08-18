export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { sql, LIBELLES_EQUIPEMENT, LIBELLES_SOUS_TYPE_EXTINCTEUR, libelleSousType } from '../../../../lib/db';
import { lireSession } from '../../../../lib/auth';
import { notFound, redirect } from 'next/navigation';
import AjoutEquipement from '../../../etablissements/[id]/AjoutEquipement';
import SupprimerEquipement from '../../../etablissements/[id]/SupprimerEquipement';
import MarquerFait from '../../../etablissements/[id]/MarquerFait';
import AjouterEcheance from '../../../etablissements/[id]/AjouterEcheance';
import AjoutPersonnel from '../../../etablissements/[id]/AjoutPersonnel';
import SupprimerPersonnel from '../../../etablissements/[id]/SupprimerPersonnel';
import MarquerFormationFaite from '../../../etablissements/[id]/MarquerFormationFaite';
import AjouterEcheanceFormation from '../../../etablissements/[id]/AjouterEcheanceFormation';
import SupprimerFormation from '../../../etablissements/[id]/SupprimerFormation';
import SuiviIndividuel from '../../../etablissements/[id]/SuiviIndividuel';
import SuiviEPI from '../../../etablissements/[id]/SuiviEPI';
import AbonnementBouton from '../../../../components/AbonnementBouton';
import { joursEssaiRestants } from '../../../../lib/acces';

async function getDetail(id: string) {
  const { rows: etabRows } = await sql`
    SELECT id, client_id, nom, type_erp, categorie, capacite_accueil, adresse, effectif_total
    FROM etablissements
    WHERE id = ${id}
  `;
  if (etabRows.length === 0) return null;

  const idNum = parseInt(id, 10);
  const equipResult = await sql.query(
    'SELECT * FROM equipements WHERE etablissement_id = $1 ORDER BY type_equipement',
    [idNum]
  );
  const echeancesResult = await sql.query(
    'SELECT * FROM echeances WHERE etablissement_id = $1 ORDER BY prochaine_echeance ASC',
    [idNum]
  );
  const { rows: typesControle } = await sql`SELECT * FROM types_controle ORDER BY equipement_type, nom_controle`;
  const personnelResult = await sql.query(
    'SELECT * FROM personnel WHERE etablissement_id = $1 ORDER BY nom',
    [idNum]
  );
  const echeancesPersonnelResult = await sql.query(
    'SELECT * FROM echeances_personnel WHERE etablissement_id = $1 ORDER BY prochaine_echeance ASC',
    [idNum]
  );
  const { rows: typesFormation } = await sql`SELECT * FROM types_formation ORDER BY nom_formation`;

  const suiviIndividuelResult = await sql.query(
    `SELECT
       p.id AS personnel_id, p.nom, p.fonction,
       sst.date_realisation AS sst_date, sst.prochaine_echeance AS sst_echeance,
       epi.date_realisation AS epi_date
     FROM personnel p
     LEFT JOIN echeances_personnel sst ON sst.personnel_id = p.id AND sst.nom_formation = 'SST'
     LEFT JOIN echeances_personnel epi ON epi.personnel_id = p.id AND epi.nom_formation = 'Équipier 1ère intervention / évacuation'
     WHERE p.etablissement_id = $1
     ORDER BY p.nom`,
    [idNum]
  );

  return {
    etablissement: etabRows[0],
    equipements: equipResult.rows,
    echeances: echeancesResult.rows,
    typesControle,
    personnel: personnelResult.rows,
    echeancesPersonnel: echeancesPersonnelResult.rows,
    typesFormation,
    suiviIndividuel: suiviIndividuelResult.rows,
  };
}

function joursRestants(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default async function ClientEtablissementPage({ params }: { params: { id: string } }) {
  const session = lireSession();
  if (!session || session.role !== 'client' || !session.clientId) {
    redirect('/connexion');
  }

  const data = await getDetail(params.id);
  if (!data) notFound();
  if (data.etablissement.client_id !== session.clientId) notFound();

  const { rows: compteRows } = await sql`
    SELECT statut, date_debut_essai FROM comptes WHERE id = ${session.compteId}
  `;
  const lectureSeule = compteRows.length === 0 || compteRows[0].statut === 'expire';
  const enEssai = compteRows.length > 0 && compteRows[0].statut === 'essai';
  const joursEssaiRestantsVal = enEssai ? joursEssaiRestants(compteRows[0].date_debut_essai) : null;

  const { etablissement, equipements, echeances, typesControle, personnel, echeancesPersonnel, typesFormation, suiviIndividuel } = data;

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{etablissement.nom}</h1>
        <p className="mt-1 text-sm text-slate-500">
          ERP {etablissement.type_erp} — {etablissement.categorie}e catégorie
          {etablissement.capacite_accueil && ` · ${etablissement.capacite_accueil} personnes`}
        </p>
      </div>

      {lectureSeule && (
        <div className="mb-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>
            Votre période d'essai est terminée. Vous pouvez toujours consulter vos données,
            mais l'ajout et la modification sont désactivés tant qu'un abonnement n'est pas actif.
          </p>
          <div className="mt-2">
            <AbonnementBouton />
          </div>
        </div>
      )}

      {enEssai && (
        <div
          className={`mb-8 rounded-md border px-4 py-3 text-sm ${
            joursEssaiRestantsVal !== null && joursEssaiRestantsVal <= 3
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          {joursEssaiRestantsVal !== null ? (
            <>
              Période d'essai : <strong>{joursEssaiRestantsVal}</strong>{' '}
              {joursEssaiRestantsVal === 1 ? 'jour restant' : 'jours restants'}.
            </>
          ) : (
            "Vous êtes en période d'essai."
          )}{' '}
          <AbonnementBouton />
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Échéances</h2>
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
                    enRetard ? 'border-red-200 bg-red-50' : bientot ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{ech.nom_controle}</span>
                    <div className="flex items-center">
                      <span className={enRetard ? 'text-red-700' : bientot ? 'text-amber-700' : 'text-slate-500'}>
                        {enRetard ? `En retard de ${Math.abs(jours)} j` : `Dans ${jours} j`}
                      </span>
                      {!lectureSeule && (
                        <MarquerFait equipementId={ech.equipement_id} typeControleId={ech.type_controle_id} />
                      )}
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
          {!lectureSeule && (
            <div className="mt-4">
              <AjouterEcheance equipements={equipements as any} typesControle={typesControle as any} />
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Équipements</h2>
          <div className="mt-3 space-y-2">
            {equipements.length === 0 && <p className="text-sm text-slate-400">Aucun équipement enregistré.</p>}
            {equipements.map((eq: any) => (
              <div key={eq.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm">
                <div>
                  <span className="font-medium text-slate-800">
                    {LIBELLES_EQUIPEMENT[eq.type_equipement as keyof typeof LIBELLES_EQUIPEMENT]}
                  </span>
                  {eq.sous_type && <span className="text-slate-500"> ({libelleSousType(eq.type_equipement, eq.sous_type)})</span>}
                  {eq.libelle && <span className="text-slate-500"> — {eq.libelle}</span>}
                </div>
                {!lectureSeule && <SupprimerEquipement equipementId={eq.id} />}
              </div>
            ))}
          </div>
          {!lectureSeule && (
            <div className="mt-4">
              <AjoutEquipement etablissementId={etablissement.id} />
            </div>
          )}
        </section>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Personnel — Formations</h2>
        <div className="mt-3 grid gap-8 md:grid-cols-2">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Échéances de formation</h3>
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
                      enRetard ? 'border-red-200 bg-red-50' : bientot ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
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
                        <span className={enRetard ? 'text-red-700' : bientot ? 'text-amber-700' : 'text-slate-500'}>
                          {enRetard ? `En retard de ${Math.abs(jours)} j` : `Dans ${jours} j`}
                        </span>
                        {!lectureSeule && (
                          <>
                            <MarquerFormationFaite personnelId={ech.personnel_id} typeFormationId={ech.type_formation_id} />
                            <SupprimerFormation formationRealiseeId={ech.formation_realisee_id} />
                          </>
                        )}
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
            {!lectureSeule && (
              <div className="mt-4">
                <AjouterEcheanceFormation personnel={personnel as any} typesFormation={typesFormation as any} />
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Personnel</h3>
            <div className="mt-3 space-y-2">
              {personnel.length === 0 && <p className="text-sm text-slate-400">Aucun membre du personnel enregistré.</p>}
              {personnel.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-slate-800">{p.nom}</span>
                    {p.fonction && <span className="text-slate-500"> — {p.fonction}</span>}
                  </div>
                  {!lectureSeule && <SupprimerPersonnel personnelId={p.id} />}
                </div>
              ))}
            </div>
            {!lectureSeule && (
              <div className="mt-4">
                <AjoutPersonnel etablissementId={etablissement.id} />
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Suivi individuel SST</h2>
        <div className="mt-3">
          <SuiviIndividuel lignes={suiviIndividuel as any} />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Suivi EPI (Équipier 1ère intervention)
        </h2>
        <div className="mt-3">
          <SuiviEPI lignes={suiviIndividuel as any} />
        </div>
      </div>
    </main>
  );
}
