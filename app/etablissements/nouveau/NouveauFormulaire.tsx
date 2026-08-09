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

export default function NouvelEtablissementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: '',
    type_erp: 'M',
    categorie: '5',
    capacite_accueil: '',
    adresse: '',
    contact_email: '',
    contact_nom: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);

    try {
      const res = await fetch('/api/etablissements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          categorie: Number(form.categorie),
          capacite_accueil: form.capacite_accueil ? Number(form.capacite_accueil) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }

      const data = await res.json();
      router.push(`/etablissements/${data.etablissement.id}`);
    } catch (err: any) {
      setErreur(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Nouvel établissement</h1>
      <p className="mt-1 text-sm text-slate-500">
        Renseigne les informations de base. Les équipements et contrôles se configurent à l'étape suivante.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="nom" className="block text-sm font-medium text-slate-700">
            Nom de l'établissement
          </label>
          <input
            id="nom"
            type="text"
            required
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            placeholder="ex. Résidence Le Trianon"
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="type_erp" className="block text-sm font-medium text-slate-700">
              Type ERP
            </label>
            <select
              id="type_erp"
              value={form.type_erp}
              onChange={(e) => setForm({ ...form, type_erp: e.target.value })}
              className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {TYPES_ERP.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="categorie" className="block text-sm font-medium text-slate-700">
              Catégorie
            </label>
            <select
              id="categorie"
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="4">4e catégorie</option>
              <option value="5">5e catégorie</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="capacite" className="block text-sm font-medium text-slate-700">
            Capacité d'accueil (optionnel)
          </label>
          <input
            id="capacite"
            type="number"
            value={form.capacite_accueil}
            onChange={(e) => setForm({ ...form, capacite_accueil: e.target.value })}
            placeholder="ex. 120"
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="adresse" className="block text-sm font-medium text-slate-700">
            Adresse (optionnel)
          </label>
          <input
            id="adresse"
            type="text"
            value={form.adresse}
            onChange={(e) => setForm({ ...form, adresse: e.target.value })}
            placeholder="ex. 12 rue de la République, Arles"
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div className="border-t border-slate-200 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Contact client (optionnel)
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Reçoit les alertes email d'échéances en plus de toi, si renseigné.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact_nom" className="block text-sm font-medium text-slate-700">
                Nom du contact
              </label>
              <input
                id="contact_nom"
                type="text"
                value={form.contact_nom}
                onChange={(e) => setForm({ ...form, contact_nom: e.target.value })}
                placeholder="ex. M. Dupont"
                className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-slate-700">
                Email du contact
              </label>
              <input
                id="contact_email"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="ex. contact@client.fr"
                className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {erreur && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer l\'établissement'}
          </button>
          <a href="/" className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Annuler
          </a>
        </div>
      </form>
    </main>
  );
}
