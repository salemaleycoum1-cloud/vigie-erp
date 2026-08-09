'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ModifierContact({
  etablissementId,
  contactNomInitial,
  contactEmailInitial,
}: {
  etablissementId: number;
  contactNomInitial: string | null;
  contactEmailInitial: string | null;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState(contactNomInitial || '');
  const [email, setEmail] = useState(contactEmailInitial || '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/etablissements/${etablissementId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_nom: nom || null, contact_email: email || null }),
    });
    setLoading(false);
    setOuvert(false);
    window.location.reload();
  }

  if (!ouvert) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {contactEmailInitial ? (
          <span>
            Contact : {contactNomInitial ? `${contactNomInitial} — ` : ''}
            {contactEmailInitial}
          </span>
        ) : (
          <span className="text-slate-400">Aucun contact client renseigné</span>
        )}
        <button
          onClick={() => setOuvert(true)}
          className="text-xs font-medium text-slate-900 underline underline-offset-4"
        >
          Modifier
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
      <div>
        <label className="block text-[10px] font-medium text-slate-500">Nom du contact</label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="ex. M. Dupont"
          className="rounded border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-slate-500">Email du contact</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contact@client.fr"
          className="rounded border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
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
    </form>
  );
}
