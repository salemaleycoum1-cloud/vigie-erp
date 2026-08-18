'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MessageEssaiExpire from '../../../components/MessageEssaiExpire';

interface Personnel {
  id: number;
  nom: string;
  fonction: string | null;
}

interface TypeFormation {
  id: number;
  nom_formation: string;
  statut: string;
}

export default function AjouterEcheanceFormation({
  personnel,
  typesFormation,
}: {
  personnel: Personnel[];
  typesFormation: TypeFormation[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [personnelId, setPersonnelId] = useState('');
  const [typeFormationId, setTypeFormationId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [organisme, setOrganisme] = useState('');
  const [loading, setLoading] = useState(false);
  const [essaiExpire, setEssaiExpire] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function libellePersonnel(p: Personnel) {
    const suffixe = p.fonction ? ` — ${p.fonction}` : '';
    return `${p.nom}${suffixe}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!personnelId || !typeFormationId) return;
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/personnel/${personnelId}/formations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_formation_id: Number(typeFormationId),
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
        throw new Error(data.error || 'Erreur lors de l\'ajout');
      }
      setOuvert(false);
      setPersonnelId('');
      setTypeFormationId('');
      setOrganisme('');
      window.location.reload();
    } catch (err: any) {
      setErreur(err.message);
      setLoading(false);
    }
  }

  if (personnel.length === 0) {
    return null;
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
        className="text-sm font-medium text-slate-900 underline underline-offset-4"
      >
        + Ajouter une échéance
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div>
        <label className="block text-[10px] font-medium text-slate-500">Personnel</label>
        <select
          value={personnelId}
          onChange={(e) => setPersonnelId(e.target.value)}
          required
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— Choisir une personne —</option>
          {personnel.map((p) => (
            <option key={p.id} value={p.id}>
              {libellePersonnel(p)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-medium text-slate-500">Formation</label>
        <select
          value={typeFormationId}
          onChange={(e) => setTypeFormationId(e.target.value)}
          required
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— Choisir une formation —</option>
          {typesFormation.map((tf) => (
            <option key={tf.id} value={tf.id}>
              {tf.nom_formation} {tf.statut === 'recommande' ? '(recommandé)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <div>
          <label className="block text-[10px] font-medium text-slate-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-slate-500">Organisme (optionnel)</label>
          <input
            type="text"
            value={organisme}
            onChange={(e) => setOrganisme(e.target.value)}
            placeholder="ex. CNPP"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !personnelId || !typeFormationId}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? '...' : 'Ajouter'}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-md px-3 py-1.5 text-sm text-slate-600"
        >
          Annuler
        </button>
      </div>
      {erreur && <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{erreur}</div>}
    </form>
  );
}
