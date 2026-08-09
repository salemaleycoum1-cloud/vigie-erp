export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { sql } from '../../lib/db';
import { lireSession } from '../../lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AbonnementBouton from '../../components/AbonnementBouton';

async function getEtablissementsClient(clientId: number) {
  const { rows } = await sql`
    SELECT
      e.id, e.nom, e.type_erp, e.categorie, e.capacite_accueil, e.adresse,
      COUNT(ech.controle_realise_id) FILTER (WHERE ech.prochaine_echeance < CURRENT_DATE) AS echeances_en_retard,
      COUNT(ech.controle_realise_id) FILTER (
        WHERE ech.prochaine_echeance >= CURRENT_DATE
        AND ech.prochaine_echeance <= CURRENT_DATE + INTERVAL '30 days'
      ) AS echeances_a_venir
    FROM etablissements e
    LEFT JOIN echeances ech ON ech.etablissement_id = e.id
    WHERE e.client_id = ${clientId}
    GROUP BY e.id
    ORDER BY e.nom
  `;
  return rows;
}

export default async function ClientAccueilPage() {
  const session = lireSession();
  if (!session || session.role !== 'client' || !session.clientId) {
    redirect('/connexion');
  }

  const etablissements = await getEtablissementsClient(session.clientId!);
  const { rows: compteRows } = await sql`SELECT statut FROM comptes WHERE id = ${session.compteId}`;
  const statut = compteRows.length > 0 ? compteRows[0].statut : 'essai';

  return (
    <main>
      <h1 className="text-2xl font-semibold tracking-tight">Vos établissements</h1>
      <p className="mt-1 text-sm text-slate-500">
        Suivi de vos échéances réglementaires de sécurité incendie.
      </p>

      {statut === 'essai' && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Vous êtes en période d'essai. <AbonnementBouton />
        </div>
      )}

      {statut === 'expire' && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Votre période d'essai est terminée — vous êtes en lecture seule.
          <div className="mt-2">
            <AbonnementBouton />
          </div>
        </div>
      )}

      {etablissements.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-500">
            Aucun établissement n'est encore associé à votre compte. Contactez votre conseiller.
          </p>
        </div>
      )}

      {etablissements.length > 0 && (
        <div className="mt-6 space-y-3">
          {etablissements.map((etab: any) => {
            const enRetard = Number(etab.echeances_en_retard);
            const aVenir = Number(etab.echeances_a_venir);
            return (
              <Link
                key={etab.id}
                href={`/client/etablissements/${etab.id}`}
                className="block rounded-lg border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{etab.nom}</span>
                  {enRetard > 0 ? (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                      {enRetard} en retard
                    </span>
                  ) : aVenir > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      {aVenir} sous 30 jours
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      À jour
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  ERP {etab.type_erp} — {etab.categorie}e catégorie
                  {etab.adresse ? ` · ${etab.adresse}` : ''}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
