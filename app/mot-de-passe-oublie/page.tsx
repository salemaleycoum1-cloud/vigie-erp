'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function OublieMotDePassePage() {
  const [email, setEmail] = useState('');
  const [envoyee, setEnvoyee] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      setEnvoyee(true);
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (envoyee) {
    return (
      <main className="mx-auto mt-16 max-w-sm">
        <div className="rounded-lg bg-emerald-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-emerald-900">Email envoyé</h1>
          <p className="mt-2 text-sm text-emerald-700">
            Si ce compte existe, vous recevrez un lien pour réinitialiser votre mot de passe dans les prochaines minutes.
          </p>
          <Link
            href="/connexion"
            className="mt-4 inline-block text-sm font-medium text-emerald-600 underline"
          >
            Retour à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-16 max-w-sm">
      <h1 className="text-center text-2xl font-semibold">Mot de passe oublié</h1>
      <p className="mt-2 text-center text-sm text-slate-500">
        Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        {erreur && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Envoi...' : 'Envoyer le lien'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/connexion" className="text-slate-900 underline">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
