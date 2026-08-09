'use client';

import { useState } from 'react';

export default function AbonnementBouton() {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/stripe/creer-session-paiement', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      window.location.href = data.url;
    } catch (err: any) {
      setErreur(err.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? 'Redirection...' : "S'abonner"}
      </button>
      {erreur && <p className="mt-2 text-sm text-red-700">{erreur}</p>}
    </div>
  );
}
