'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MarquerFait({
  equipementId,
  typeControleId,
}: {
  equipementId: number;
  typeControleId: number;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [organisme, setOrganisme] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/equipements/${equipementId}/controles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type_controle_id: typeControleId,
        date_realisation: date,
        organisme_agree: organisme || null,
      }),
    });
    setLoading(false);
    setOuvert(false);
    window.location.reload();
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="ml-3 shrink-0 rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        Marquer comme fait
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
    >
      <div>
        <label className="block text-[10px] font-medium text-slate-500">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="rounded border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-slate-500">Organisme (optionnel)</label>
        <input
          type="text"
          value={organisme}
          onChange={(e) => setOrganisme(e.target.value)}
          placeholder="ex. APAVE"
          className="rounded border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        {loading ? '...' : 'Confirmer'}
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
