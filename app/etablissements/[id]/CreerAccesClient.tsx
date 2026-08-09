'use client';

import { useState } from 'react';

export default function CreerAccesClient({
  etablissementId,
  contactNomInitial,
  contactEmailInitial,
}: {
  etablissementId: number;
  contactNomInitial: string | null;
  contactEmailInitial: string | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState(contactNomInitial || '');
  const [email, setEmail] = useState(contactEmailInitial || '');
  const [motDePasse, setMotDePasse] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/etablissements/${etablissementId}/creer-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, mot_de_passe: motDePasse }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }
      setMessage(`Accès client créé pour ${email}. Communique-lui l'email et le mot de passe choisis.`);
      setMotDePasse('');
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
        Créer un accès client
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-medium text-slate-500">Nom du client</label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-slate-500">Email de connexion</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-medium text-slate-500">Mot de passe</label>
        <input
          type="text"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          required
          placeholder="Choisis un mot de passe à communiquer au client"
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
        />
      </div>

      {message && <div className="rounded bg-emerald-50 px-2 py-1.5 text-xs text-emerald-700">{message}</div>}
      {erreur && <div className="rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">{erreur}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {loading ? '...' : 'Créer / lier'}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="rounded px-2.5 py-1 text-xs text-slate-500">
          Fermer
        </button>
      </div>
    </form>
  );
}
