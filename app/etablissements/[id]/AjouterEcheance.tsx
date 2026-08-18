'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MessageEssaiExpire from '../../../components/MessageEssaiExpire';

const LIBELLES_EQUIPEMENT: Record<string, string> = {
  extincteur: 'Extincteur',
  ssi: 'Système de Sécurité Incendie (SSI)',
  desenfumage: 'Désenfumage',
  ria: "RIA (Robinet d'Incendie Armé)",
  sprinkler: 'Sprinkler',
  installation_technique: 'Installation technique (chauffage/ventilation)',
};

interface Equipement {
  id: number;
  type_equipement: string;
  libelle: string | null;
  sous_type: string | null;
}

interface TypeControle {
  id: number;
  equipement_type: string;
  nom_controle: string;
  periodicite_mois: number;
}

export default function AjouterEcheance({
  equipements,
  typesControle,
}: {
  equipements: Equipement[];
  typesControle: TypeControle[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [equipementId, setEquipementId] = useState<string>('');
  const [typeControleId, setTypeControleId] = useState<string>('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [organisme, setOrganisme] = useState('');
  const [loading, setLoading] = useState(false);
  const [essaiExpire, setEssaiExpire] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const equipementChoisi = equipements.find((eq) => String(eq.id) === equipementId);

  const controlesDisponibles = useMemo(() => {
    if (!equipementChoisi) return [];
    return typesControle.filter((tc) => tc.equipement_type === equipementChoisi.type_equipement);
  }, [equipementChoisi, typesControle]);

  function libelleEquipement(eq: Equipement) {
    const base = LIBELLES_EQUIPEMENT[eq.type_equipement] || eq.type_equipement;
    const suffixe = eq.libelle ? ` — ${eq.libelle}` : '';
    return `${base}${suffixe} (#${eq.id})`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!equipementId || !typeControleId) return;
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/equipements/${equipementId}/controles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_controle_id: Number(typeControleId),
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
      setEquipementId('');
      setTypeControleId('');
      setOrganisme('');
      window.location.reload();
    } catch (err: any) {
      setErreur(err.message);
      setLoading(false);
    }
  }

  if (equipements.length === 0) {
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
        <label className="block text-[10px] font-medium text-slate-500">Équipement</label>
        <select
          value={equipementId}
          onChange={(e) => {
            setEquipementId(e.target.value);
            setTypeControleId('');
          }}
          required
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— Choisir un équipement —</option>
          {equipements.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {libelleEquipement(eq)}
            </option>
          ))}
        </select>
      </div>

      {equipementChoisi && (
        <div>
          <label className="block text-[10px] font-medium text-slate-500">Type de contrôle</label>
          <select
            value={typeControleId}
            onChange={(e) => setTypeControleId(e.target.value)}
            required
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">— Choisir un contrôle —</option>
            {controlesDisponibles.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.nom_controle}
              </option>
            ))}
          </select>
        </div>
      )}

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
            placeholder="ex. APAVE"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !equipementId || !typeControleId}
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
