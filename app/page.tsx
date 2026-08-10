export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { sql } from '../lib/db';
import { lireSession } from '../lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function getEtablissements() {
  try {
    const { rows } = await sql`
      SELECT
        e.id, e.client_id, e.nom, e.type_erp, e.categorie, e.capacite_accueil,
        e.adresse, e.created_at, e.est_demo,
        COUNT(ech.controle_realise_id) FILTER (WHERE ech.prochaine_echeance < CURRENT_DATE) AS echeances_en_retard,
        COUNT(ech.controle_realise_id) FILTER (
          WHERE ech.prochaine_echeance >= CURRENT_DATE
          AND ech.prochaine_echeance <= CURRENT_DATE + INTERVAL '30 days'
        ) AS echeances_a_venir
      FROM etablissements e
      INNER JOIN echeances ech ON ech.etablissement_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;
    return rows;
  } catch (error) {
    return null;
  }
}

function StatutBadge({ enRetard, aVenir }: { enRetard: number; aVenir: number }) {
  if (enRetard > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        {enRetard} échéance{enRetard > 1 ? 's' : ''} en retard
      </span>
    );
  }
  if (aVenir > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {aVenir} échéance{aVenir > 1 ? 's' : ''} sous 30 jours
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      À jour
    </span>
  );
}

export default async function HomePage() {
  const session = lireSession();
  if (!session || session.role !== 'admin') {
    redirect('/connexion');
  }

  const etablissements = await getEtablissements();

  return (
    <main>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Établissements suivis</h1>
          <p className="mt-1 text-sm text-slate-500">
            Vérifications incendie ERP type M/N, catégories 4 et 5
          </p>
        </div>
        <Link
          href="/etablissements/nouveau"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Nouvel établissement
        </Link>
      </div>

      {etablissements === null && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Impossible de se connecter à la base de données. Vérifiez que <code>POSTGRES_URL</code> est
          configuré et que le schéma a été initialisé (<code>npm run db:init</code>).
        </div>
      )}

      {etablissements !== null && etablissements.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-500">Aucun établissement suivi pour l'instant.</p>
          <Link
            href="/etablissements/nouveau"
            className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-4"
          >
            Ajouter le premier établissement
          </Link>
        </div>
      )}

      {etablissements !== null && etablissements.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Établissement</th>
                <th className="px-4 py-3">Type / Catégorie</th>
                <th className="px-4 py-3">Capacité</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {etablissements.map((etab: any) => (
                <tr key={etab.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/etablissements/${etab.id}`} className="font-medium text-slate-900 hover:underline">
                      {etab.nom}
                    </Link>
                    {etab.est_demo && (
                      <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                        Démo
                      </span>
                    )}
                    {etab.adresse && <div className="text-xs text-slate-400">{etab.adresse}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    ERP {etab.type_erp} — {etab.categorie}e catégorie
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {etab.capacite_accueil ? `${etab.capacite_accueil} pers.` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatutBadge
                      enRetard={Number(etab.echeances_en_retard)}
                      aVenir={Number(etab.echeances_a_venir)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
