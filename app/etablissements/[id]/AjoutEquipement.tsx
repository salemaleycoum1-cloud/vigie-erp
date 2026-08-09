'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const OPTIONS = [
  { value: 'extincteur', label: 'Extincteur' },
  { value: 'ssi', label: 'Système de Sécurité Incendie (SSI)' },
  { value: 'desenfumage', label: 'Désenfumage' },
  { value: 'ria', label: "RIA (Robinet d'Incendie Armé)" },
  { value: 'sprinkler', label: 'Sprinkler' },
  { value: 'installation_technique', label: 'Installation technique (chauffage/ventilation)' },
  { value: 'alarme', label: 'Alarme incendie' },
  { value: 'eclairage_securite', label: 'Éclairage de sécurité (BAES)' },
  { value: 'porte_coupe_feu', label: 'Porte coupe-feu' },
  { value: 'installation_electrique', label: 'Installation électrique' },
];

const SOUS_TYPES_EXTINCTEUR = [
  { value: 'co2', label: 'CO2' },
  { value: 'eau_additif', label: 'Eau + additif' },
  { value: 'poudre', label: 'Poudre' },
];

const SOUS_TYPES_SSI = [
  { value: 'A', label: 'Catégorie A' },
  { value: 'B', label: 'Catégorie B' },
  { value: 'C', label: 'Catégorie C' },
  { value: 'D', label: 'Catégorie D' },
  { value: 'E', label: 'Catégorie E' },
];

const SOUS_TYPES_ALARME = [
  { value: 'type_1', label: 'Type 1' },
  { value: 'type_2a', label: 'Type 2a' },
  { value: 'type_2b', label: 'Type 2b' },
  { value: 'type_3', label: 'Type 3' },
  { value: 'type_4', label: 'Type 4' },
];

const SOUS_TYPES_PAR_TYPE: Record<string, { value: string; label: string }[]> = {
  extincteur: SOUS_TYPES_EXTINCTEUR,
  ssi: SOUS_TYPES_SSI,
  alarme: SOUS_TYPES_ALARME,
};

export default function AjoutEquipement({ etablissementId }: { etablissementId: number }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [type, setType] = useState('extincteur');
  const [sousType, setSousType] = useState('co2');
  const [libelle, setLibelle] = useState('');
  const [loading, setLoading] = useState(false);

  const sousTypesDisponibles = SOUS_TYPES_PAR_TYPE[type] || [];

  function handleTypeChange(nouveauType: string) {
    setType(nouveauType);
    const options = SOUS_TYPES_PAR_TYPE[nouveauType];
    setSousType(options ? options[0].value : '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/etablissements/${etablissementId}/equipements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type_equipement: type,
        libelle,
        sous_type: sousTypesDisponibles.length > 0 ? sousType : null,
      }),
    });
    setLibelle('');
    setOuvert(false);
    setLoading(false);
    window.location.reload();
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="text-sm font-medium text-slate-900 underline underline-offset-4"
      >
        + Ajouter un équipement
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <select
        value={type}
        onChange={(e) => handleTypeChange(e.target.value)}
        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {sousTypesDisponibles.length > 0 && (
        <select
          value={sousType}
          onChange={(e) => setSousType(e.target.value)}
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {sousTypesDisponibles.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      <input
        type="text"
        value={libelle}
        onChange={(e) => setLibelle(e.target.value)}
        placeholder="Libellé optionnel (ex. Hall d'entrée)"
        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Ajouter
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-md px-3 py-1.5 text-sm text-slate-600"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
