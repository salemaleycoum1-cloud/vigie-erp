'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SupprimerFormation({ formationRealiseeId }: { formationRealiseeId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        'Supprimer cette échéance de formation ? Utile si la personne a quitté, démissionné, ou est en arrêt longue durée.'
      )
    ) {
      return;
    }
    setLoading(true);
    await fetch(`/api/formations/${formationRealiseeId}`, { method: 'DELETE' });
    window.location.reload();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="ml-2 shrink-0 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
      title="Supprimer cette échéance"
    >
      {loading ? '...' : '✕'}
    </button>
  );
}
