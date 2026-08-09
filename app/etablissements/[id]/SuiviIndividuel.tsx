interface Ligne {
  personnel_id: number;
  nom: string;
  fonction: string | null;
  sst_date: string | null;
  sst_echeance: string | null;
  epi_date: string | null;
}

function joursRestants(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function BadgeEcheanceSst({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return <span className="text-slate-400">—</span>;
  const jours = joursRestants(dateStr);
  const enRetard = jours < 0;
  const bientot = jours >= 0 && jours <= 30;
  const couleur = enRetard ? 'text-red-700' : bientot ? 'text-amber-700' : 'text-emerald-700';
  return (
    <span className={couleur}>
      {new Date(dateStr).toLocaleDateString('fr-FR')}
      {enRetard ? ` (retard ${Math.abs(jours)}j)` : bientot ? ` (${jours}j)` : ''}
    </span>
  );
}

export default function SuiviIndividuel({ lignes }: { lignes: Ligne[] }) {
  if (lignes.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Aucun salarié enregistré. Ajoute du personnel dans le bloc "Personnel — Formations" ci-dessus
        pour faire apparaître le suivi ici.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Salarié</th>
            <th className="px-4 py-2.5">Date SST</th>
            <th className="px-4 py-2.5">Échéance recyclage SST</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lignes.map((l) => (
            <tr key={l.personnel_id}>
              <td className="px-4 py-2.5">
                <span className="font-medium text-slate-800">{l.nom}</span>
                {l.fonction && <span className="text-slate-500"> — {l.fonction}</span>}
              </td>
              <td className="px-4 py-2.5 text-slate-600">
                {l.sst_date ? new Date(l.sst_date).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-4 py-2.5">
                <BadgeEcheanceSst dateStr={l.sst_echeance} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
