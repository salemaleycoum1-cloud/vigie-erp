'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SupprimerPersonnel({ personnelId }: { personnelId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Supprimer ce membre du personnel ? Son historique de formation sera aussi supprimé.')) {
      return;
    }
    setLoading(true);
    await fetch(`/api/personnel/${personnelId}`, { method: 'DELETE' });
    window.location.reload();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
      title="Supprimer"
    >
      {loading ? '...' : '✕'}
    </button>
  );
}
