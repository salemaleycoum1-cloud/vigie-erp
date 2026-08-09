'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AjoutPersonnel({ etablissementId }: { etablissementId: number }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState('');
  const [fonction, setFonction] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/etablissements/${etablissementId}/personnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, fonction: fonction || null }),
    });
    setNom('');
    setFonction('');
    setOuvert(false);
    setLoading(false);
    window.location.reload();
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="text-sm font-medium text-slate-900 underline underline-offset-4"
      >
        + Ajouter un membre du personnel
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <input
        type="text"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Nom"
        required
        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        type="text"
        value={fonction}
        onChange={(e) => setFonction(e.target.value)}
        placeholder="Fonction (optionnel, ex. Agent SSIAP)"
        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Ajouter
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-md px-3 py-1.5 text-sm text-slate-600"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
