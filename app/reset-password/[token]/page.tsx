'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [succes, setSucces] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (motDePasse !== confirmation) {
      setErreur('Les mots de passe ne correspondent pas');
      return;
    }
    if (motDePasse.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, motDePasse }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      setSucces(true);
      setTimeout(() => {
        router.push('/connexion');
      }, 2000);
    } catch (err: any) {
      setErreur(err.message);
      setLoading(false);
    }
  }

  if (succes) {
    return (
      <main className="mx-auto mt-16 max-w-sm">
        <div className="rounded-lg bg-emerald-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-emerald-900">Mot de passe réinitialisé</h1>
          <p className="mt-2 text-sm text-emerald-700">
            Votre mot de passe a été changé avec succès. Vous allez être redirigé vers la connexion.
          </p>
          <Link
            href="/connexion"
            className="mt-4 inline-block text-sm font-medium text-emerald-600 underline"
          >
            Aller à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-16 max-w-sm">
      <h1 className="text-center text-2xl font-semibold">Créer un nouveau mot de passe</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Nouveau mot de passe</label>
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
            autoFocus
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">Minimum 8 caractères</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
          <input
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            required
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
          {loading ? 'Création...' : 'Créer le mot de passe'}
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
