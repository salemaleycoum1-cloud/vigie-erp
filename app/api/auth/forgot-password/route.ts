export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { sendEmailBrevo } from '../../../../lib/brevo';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const { rows } = await sql`
      SELECT id FROM comptes WHERE email = ${email} LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Si ce compte existe, un email a été envoyé',
      });
    }

    const compte = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await sql`
      UPDATE comptes
      SET reset_token = ${resetToken}, reset_token_expires = ${expiresAt}
      WHERE id = ${compte.id}
    `;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password/${resetToken}`;

    const emailResult = await sendEmailBrevo({
      to: [{ email }],
      subject: 'Réinitialisation de votre mot de passe Vigie ERP',
      htmlContent: `
        <p>Vous avez demandé une réinitialisation de mot de passe.</p>
        <p><a href="${resetUrl}">Cliquez ici pour créer un nouveau mot de passe</a></p>
        <p style="color: #666; font-size: 12px;">Ce lien expire dans 1 heure.</p>
        <p style="color: #666; font-size: 12px;">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      `,
    });

    if (!emailResult.success) {
      console.error('Erreur envoi email:', emailResult.error);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Si ce compte existe, un email a été envoyé',
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
