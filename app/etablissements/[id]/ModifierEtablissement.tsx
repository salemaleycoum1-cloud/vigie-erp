'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TYPES_ERP = [
  { value: 'J', label: "J — Structures d'accueil personnes âgées / handicapées" },
  { value: 'L', label: "L — Salles d'auditions, conférences, spectacles, multimédia" },
  { value: 'M', label: 'M — Magasins de vente, centres commerciaux' },
  { value: 'N', label: 'N — Restaurants et débits de boissons' },
  { value: 'O', label: 'O — Hôtels et pensions de famille' },
  { value: 'P', label: 'P — Salles de danse et salles de jeux' },
  { value: 'R', label: "R — Établissements d'enseignement, colonies de vacances" },
  { value: 'S', label: 'S — Bibliothèques, centres de documentation' },
  { value: 'T', label: "T — Salles d'expositions" },
  { value: 'U', label: 'U — Établissements de soins' },
  { value: 'V', label: 'V — Établissements de culte' },
  { value: 'W', label: 'W — Administrations, banques, bureaux' },
  { value: 'X', label: 'X — Établissements sportifs couverts' },
  { value: 'Y', label: 'Y — Musées' },
  { value: 'PA', label: 'PA — Établissements de plein air' },
  { value: 'CTS', label: 'CTS — Chapiteaux, tentes et structures' },
  { value: 'SG', label: 'SG — Structures gonflables' },
  { value: 'PS', label: 'PS — Parcs de stationnement couverts' },
  { value: 'GA', label: 'GA — Gares accessibles au public' },
  { value: 'OA', label: "OA — Hôtels-restaurants d'altitude" },
  { value: 'EF', label: 'EF — Établissements flottants' },
  { value: 'REF', label: 'REF — Refuges de montagne' },
];

export default function ModifierEtablissement({
  etablissementId,
  nomInitial,
  typeErpInitial,
  categorieInitial,
  capaciteInitial,
  adresseInitial,
}: {
  etablissementId: number;
  nomInitial: string;
  typeErpInitial: string;
  categorieInitial: number;
  capaciteInitial: number | null;
  adresseInitial: string | null;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: nomInitial,
    type_erp: typeErpInitial,
    categorie: String(categorieInitial),
    capacite_accueil: capaciteInitial ? String(capaciteInitial) : '',
    adresse: adresseInitial || '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) {
      setErreur('Le nom ne peut pas être vide');
      return;
    }
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/etablissements/${etablissementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom.trim(),
          type_erp: form.type_erp,
          categorie: Number(form.categorie),
          capacite_accueil: form.capacite_accueil ? Number(form.capacite_accueil) : null,
          adresse: form.adresse.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }
      router.refresh();
      setOuvert(false);
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="text-xs font-medium text-slate-900 underline underline-offset-4"
      >
        Modifier l'établissement
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <div>
        <label className="block text-[10px] font-medium text-slate-500">Nom</label>
        <input
          type="text"
          required
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-medium text-slate-500">Type ERP</label>
          <select
            value={form.type_erp}
            onChange={(e) => setForm({ ...form, type_erp: e.target.value })}
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
          >
            {TYPES_ERP.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-slate-500">Catégorie</label>
          <select
            value={form.categorie}
            onChange={(e) => setForm({ ...form, categorie: e.target.value })}
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="4">4e catégorie</option>
            <option value="5">5e catégorie</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-medium text-slate-500">
            Capacité d'accueil
          </label>
          <input
            type="number"
            value={form.capacite_accueil}
            onChange={(e) => setForm({ ...form, capacite_accueil: e.target.value })}
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-slate-500">Adresse</label>
          <input
            type="text"
            value={form.adresse}
            onChange={(e) => setForm({ ...form, adresse: e.target.value })}
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
      </div>

      {erreur && <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{erreur}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {loading ? '...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded px-2.5 py-1 text-xs text-slate-500"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
