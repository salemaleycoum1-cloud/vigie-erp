'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SupprimerEtablissement({ etablissementId, nom }: { etablissementId: number; nom: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Supprimer définitivement "${nom}" ? Cette action supprime aussi tous ses équipements, son personnel, son historique de contrôles et de formations, ainsi que l'accès client associé. Cette action est irréversible.`
      )
    ) {
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/etablissements/${etablissementId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/');
    } else {
      setLoading(false);
      alert('La suppression a échoué. Réessaie ou vérifie ta connexion.');
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs font-medium text-red-600 underline underline-offset-4 hover:text-red-800 disabled:opacity-50"
    >
      {loading ? 'Suppression...' : "Supprimer l'établissement"}
    </button>
  );
}
