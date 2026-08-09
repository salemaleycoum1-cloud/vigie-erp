function ajouterMois(dateStr: string, mois: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + mois);
  return d;
}

interface Ligne {
  personnel_id: number;
  nom: string;
  fonction: string | null;
  epi_date: string | null;
}

export default function SuiviEPI({ lignes }: { lignes: Ligne[] }) {
  const lignesAvecFormation = lignes.filter((l) => l.epi_date);

  if (lignesAvecFormation.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Aucune formation EPI enregistrée pour l'instant.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Salarié</th>
            <th className="px-4 py-2.5">Date formation</th>
            <th className="px-4 py-2.5">Repère 6 mois (indicatif)</th>
            <th className="px-4 py-2.5">Repère 12 mois (indicatif)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lignesAvecFormation.map((l) => (
            <tr key={l.personnel_id}>
              <td className="px-4 py-2.5">
                <span className="font-medium text-slate-800">{l.nom}</span>
                {l.fonction && <span className="text-slate-500"> — {l.fonction}</span>}
              </td>
              <td className="px-4 py-2.5 text-slate-600">
                {new Date(l.epi_date as string).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-4 py-2.5 text-slate-500">
                {ajouterMois(l.epi_date as string, 6).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-4 py-2.5 text-slate-500">
                {ajouterMois(l.epi_date as string, 12).toLocaleDateString('fr-FR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
