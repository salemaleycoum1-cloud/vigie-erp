'use client';

import AbonnementBouton from './AbonnementBouton';

// Affiché à la place d'un message d'erreur générique quand une action
// d'écriture échoue parce que la période d'essai est terminée (code
// ESSAI_EXPIRE renvoyé par l'API). Donne un chemin direct vers l'abonnement
// Stripe au lieu de laisser l'utilisateur face à une erreur muette.
export default function MessageEssaiExpire() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm text-amber-900">
        Votre période d'essai gratuit est terminée. Vos données restent consultables, mais pour
        continuer à les modifier, il faut activer l'abonnement.
      </p>
      <div className="mt-2">
        <AbonnementBouton />
      </div>
    </div>
  );
}
