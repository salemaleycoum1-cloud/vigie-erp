'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const COULEURS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
];

interface Ligne {
  id: number;
  nom_formation: string;
  statut: string;
  a_jour: string | number;
}

export default function CouvertureBarres({
  etablissementId,
  effectifTotal,
  couverture,
}: {
  etablissementId: number;
  effectifTotal: number | null;
  couverture: Ligne[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [total, setTotal] = useState(effectifTotal?.toString() || '');
  const [loading, setLoading] = useState(false);

  // Pendant l'édition, on utilise directement la valeur tapée pour recalculer
  // les barres en temps réel — pas besoin d'enregistrer pour voir l'effet.
  const effectifActif = ouvert ? (total ? Number(total) : null) : effectifTotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/etablissements/${etablissementId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ effectif_total: total ? Number(total) : null }),
    });
    setLoading(false);
    setOuvert(false);
    // window.location.reload() plutôt que router.refresh() : le cache de
    // routeur client de Next.js sert parfois une version périmée juste après
    // un refresh partiel, alors qu'un rechargement complet va toujours
    // chercher la donnée fraîche.
    window.location.reload();
  }

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Couverture par formation
      </h2>
      <p className="mt-1 text-xs text-slate-400">
        % de salariés à jour sur chaque formation, calculé automatiquement depuis le suivi
        nominatif. Un salarié peut compter dans plusieurs barres à la fois (SST + EPI + SSIAP...),
        donc les pourcentages ne totalisent pas 100 %.
      </p>

      {!effectifActif && (
        <p className="mt-3 text-sm text-amber-700">
          Renseigne l'effectif total de l'établissement pour afficher les pourcentages.
        </p>
      )}

      {effectifActif && (
        <div className="mt-4 space-y-3">
          {couverture.map((l, i) => {
            const aJour = Number(l.a_jour);
            const pct = Math.min(100, Math.round((aJour / effectifActif) * 100));
            return (
              <div key={l.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    {l.nom_formation}
                    {l.statut === 'recommande' && (
                      <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                        (recommandé)
                      </span>
                    )}
                  </span>
                  <span className="text-slate-500">
                    {aJour} / {effectifActif} ({pct}%)
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${COULEURS[i % COULEURS.length]} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!ouvert ? (
        <button
          onClick={() => setOuvert(true)}
          className="mt-4 text-sm font-medium text-slate-900 underline underline-offset-4"
        >
          {effectifTotal ? "Modifier l'effectif total" : "Renseigner l'effectif total"}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div>
            <label className="block text-[10px] font-medium text-slate-500">
              Effectif total établissement
            </label>
            <input
              type="number"
              min="0"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              autoFocus
              className="mt-1 w-32 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? '...' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={() => {
              setTotal(effectifTotal?.toString() || '');
              setOuvert(false);
            }}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600"
          >
            Annuler
          </button>
        </form>
      )}
    </section>
  );
}
