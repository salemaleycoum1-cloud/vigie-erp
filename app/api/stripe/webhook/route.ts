export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getStripeClient } from '../../../../lib/stripe';

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET non configuré' }, { status: 503 });
  }

  const stripe = getStripeClient();
  const signature = req.headers.get('stripe-signature');
  const corpsBrut = await req.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(corpsBrut, signature!, webhookSecret);
  } catch (err: any) {
    console.error('Signature webhook Stripe invalide', err.message);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        await sql`
          UPDATE comptes
          SET statut = 'actif', stripe_subscription_id = ${subscriptionId}
          WHERE stripe_customer_id = ${customerId}
        `;
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const statutStripe = subscription.status as string;
        const nouveauStatut = ['active', 'trialing'].includes(statutStripe) ? 'actif' : 'expire';
        await sql`
          UPDATE comptes SET statut = ${nouveauStatut} WHERE stripe_subscription_id = ${subscription.id}
        `;
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
