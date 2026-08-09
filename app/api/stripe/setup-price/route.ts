export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '../../../../lib/stripe';

// GET /api/stripe/setup-price?secret=... — à visiter une seule fois pour créer
// le produit et le tarif Stripe. Protégée par INIT_SECRET.
export async function GET(req: NextRequest) {
  const secretAttendu = process.env.INIT_SECRET;
  if (!secretAttendu) {
    return NextResponse.json({ error: 'INIT_SECRET non configuré' }, { status: 503 });
  }
  if (req.nextUrl.searchParams.get('secret') !== secretAttendu) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const stripe = getStripeClient();

    const produit = await stripe.products.create({
      name: 'Vigie ERP — Abonnement',
      description:
        '19,99€ pour le premier établissement, +10€ par établissement supplémentaire, facturé mensuellement.',
    });

    const prix = await stripe.prices.create({
      product: produit.id,
      currency: 'eur',
      recurring: { interval: 'month' },
      billing_scheme: 'tiered',
      tiers_mode: 'graduated',
      tiers: [
        { up_to: 1, flat_amount: 1999 },
        { up_to: 'inf', unit_amount: 1000 },
      ],
    });

    return NextResponse.json({
      success: true,
      productId: produit.id,
      priceId: prix.id,
      message: "Enregistre priceId comme variable d'environnement STRIPE_PRICE_ID sur Vercel.",
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
