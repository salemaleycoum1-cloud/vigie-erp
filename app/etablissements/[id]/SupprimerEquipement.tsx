'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SupprimerEquipement({ equipementId }: { equipementId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Supprimer cet équipement ? Les contrôles associés seront aussi supprimés.')) {
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/equipements/${equipementId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.code === 'ESSAI_EXPIRE') {
        alert("Votre période d'essai est terminée. Abonnez-vous (bouton en haut de page) pour continuer à modifier vos données.");
      } else {
        alert(data.error || 'Erreur lors de la suppression');
      }
      setLoading(false);
      return;
    }
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
