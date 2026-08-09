export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { lireSession } from '../../../../lib/auth';
import { getStripeClient } from '../../../../lib/stripe';

export async function POST() {
  const session = lireSession();
  if (!session || session.role !== 'client' || !session.clientId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: 'STRIPE_PRICE_ID non configuré' }, { status: 503 });
  }

  try {
    const stripe = getStripeClient();

    const { rows: compteRows } = await sql`
      SELECT email, stripe_customer_id FROM comptes WHERE id = ${session.compteId}
    `;
    if (compteRows.length === 0) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
    }

    let stripeCustomerId = compteRows[0].stripe_customer_id as string | null;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: compteRows[0].email });
      stripeCustomerId = customer.id;
      await sql`UPDATE comptes SET stripe_customer_id = ${stripeCustomerId} WHERE id = ${session.compteId}`;
    }

    const { rows: countRows } = await sql`
      SELECT COUNT(*)::int AS n FROM etablissements WHERE client_id = ${session.clientId}
    `;
    const quantite = Math.max(1, countRows[0].n);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: quantite }],
      success_url: 'https://vigie-erp.vercel.app/client?abonnement=succes',
      cancel_url: 'https://vigie-erp.vercel.app/client?abonnement=annule',
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
