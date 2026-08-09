import { redirect } from 'next/navigation';
import { lireSession } from '../../../lib/auth';
import NouveauFormulaire from './NouveauFormulaire';

export default function NouvelEtablissementPage() {
  const session = lireSession();
  if (!session || session.role !== 'admin') {
    redirect('/connexion');
  }
  return <NouveauFormulaire />;
}
