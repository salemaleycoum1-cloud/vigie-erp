'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MessageEssaiExpire from '../../../components/MessageEssaiExpire';

export default function AjoutPersonnel({ etablissementId }: { etablissementId: number }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState('');
  const [fonction, setFonction] = useState('');
  const [loading, setLoading] = useState(false);
  const [essaiExpire, setEssaiExpire] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/etablissements/${etablissementId}/personnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, fonction: fonction || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'ESSAI_EXPIRE') {
          setEssaiExpire(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Erreur lors de l\'ajout');
      }
      setNom('');
      setFonction('');
      setOuvert(false);
      window.location.reload();
    } catch (err: any) {
      setErreur(err.message);
      setLoading(false);
    }
  }

  if (essaiExpire) {
    return (
      <div className="mt-2">
        <MessageEssaiExpire />
      </div>
    );
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
      {erreur && <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{erreur}</div>}
    </form>
  );
}
