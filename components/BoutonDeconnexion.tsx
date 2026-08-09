'use client';

export default function BoutonDeconnexion() {
  async function handleClick() {
    await fetch('/api/auth/deconnexion', { method: 'POST' });
    window.location.href = '/connexion';
  }

  return (
    <button
      onClick={handleClick}
      className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-900"
    >
      Déconnexion
    </button>
  );
}
