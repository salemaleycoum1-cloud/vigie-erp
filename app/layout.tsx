import type { Metadata } from 'next';
import './globals.css';
import { lireSession } from '../lib/auth';
import BoutonDeconnexion from '../components/BoutonDeconnexion';

export const metadata: Metadata = {
  title: 'Vigie ERP — Suivi des vérifications incendie',
  description: 'Suivi automatisé des échéances réglementaires de sécurité incendie',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = lireSession();
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <header className="mb-10 flex items-center justify-between border-b border-slate-200 pb-6">
            <a href={session?.role === 'client' ? '/client' : '/'} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-sm font-bold text-white">
                V
              </span>
              <span className="text-lg font-semibold tracking-tight">Vigie ERP</span>
            </a>
            <div className="flex items-center gap-4">
              <nav className="text-sm text-slate-500">
                Suivi des vérifications incendie
              </nav>
              {session && <BoutonDeconnexion />}
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
