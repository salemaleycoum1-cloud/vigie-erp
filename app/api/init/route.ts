import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

// Route d'administration pour (ré)appliquer le schéma en production.
// Protégée par un secret : sans INIT_SECRET configuré sur Vercel, la route
// refuse tout accès plutôt que de rester ouverte par défaut.
export async function GET(req: NextRequest) {
  const secretAttendu = process.env.INIT_SECRET;
  if (!secretAttendu) {
    return NextResponse.json(
      { success: false, error: 'INIT_SECRET non configuré — route désactivée par sécurité.' },
      { status: 503 }
    );
  }
  const secretFourni = req.nextUrl.searchParams.get('secret');
  if (secretFourni !== secretAttendu) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await sql.query(schema);
    return NextResponse.json({ success: true, message: 'Schéma initialisé avec succès.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
