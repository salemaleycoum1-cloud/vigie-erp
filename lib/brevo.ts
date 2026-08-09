// Envoi d'emails transactionnels via l'API Brevo (v3/smtp/email).
// Nécessite la variable d'environnement BREVO_API_KEY sur Vercel.
// BREVO_SENDER_EMAIL doit être une adresse d'expéditeur validée dans Brevo,
// sinon Brevo refusera l'envoi.

interface Destinataire {
  email: string;
  name?: string;
}

export async function sendEmailBrevo({
  to,
  subject,
  htmlContent,
}: {
  to: Destinataire[];
  subject: string;
  htmlContent: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY manquant — email non envoyé');
    return { success: false, error: 'BREVO_API_KEY manquant' };
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'alertes@vigie-erp.fr';
  const senderName = process.env.BREVO_SENDER_NAME || 'Vigie ERP';

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to,
        subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Erreur Brevo', res.status, text);
      return { success: false, error: `${res.status}: ${text}` };
    }
    return { success: true };
  } catch (error: any) {
    console.error('Erreur envoi Brevo', error);
    return { success: false, error: error.message };
  }
}
