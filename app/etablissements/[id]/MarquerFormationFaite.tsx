'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MessageEssaiExpire from '../../../components/MessageEssaiExpire';

export default function MarquerFormationFaite({
  personnelId,
  typeFormationId,
}: {
  personnelId: number;
  typeFormationId: number;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [organisme, setOrganisme] = useState('');
  const [loading, setLoading] = useState(false);
  const [essaiExpire, setEssaiExpire] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/personnel/${personnelId}/formations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_formation_id: typeFormationId,
          date_realisation: date,
          organisme_agree: organisme || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'ESSAI_EXPIRE') {
          setEssaiExpire(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Erreur lors de l\'enregistrement');
      }
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
          placeholder="ex. CNPP"
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
