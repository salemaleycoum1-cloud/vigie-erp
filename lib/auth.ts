import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'crypto';
import { cookies } from 'next/headers';

// Authentification maison, sans dépendance externe : hachage scrypt (natif à
// Node, pas besoin d'installer bcrypt) + session signée par HMAC dans un
// cookie httpOnly. SESSION_SECRET doit être configuré sur Vercel en
// production ; sans lui, la valeur par défaut ci-dessous est utilisée pour
// ne pas bloquer un démarrage local, mais elle est volontairement visible
// pour qu'on ne l'oublie pas en production.
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-a-changer-en-production';
const SESSION_COOKIE_NOM = 'vigie_session';
const SESSION_DUREE_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export function hacherMotDePasse(motDePasse: string): string {
  const sel = randomBytes(16).toString('hex');
  const hash = scryptSync(motDePasse, sel, 64).toString('hex');
  return `${sel}:${hash}`;
}

export function verifierMotDePasse(motDePasse: string, hachage: string): boolean {
  const [sel, hash] = hachage.split(':');
  if (!sel || !hash) return false;
  const hashCalcule = scryptSync(motDePasse, sel, 64);
  const hashStocke = Buffer.from(hash, 'hex');
  if (hashCalcule.length !== hashStocke.length) return false;
  return timingSafeEqual(hashCalcule, hashStocke);
}

export interface SessionPayload {
  compteId: number;
  role: 'admin' | 'client';
  clientId: number | null;
  exp: number;
}

function signer(valeur: string): string {
  return createHmac('sha256', SESSION_SECRET).update(valeur).digest('hex');
}

export function creerJetonSession(payload: Omit<SessionPayload, 'exp'>): string {
  const donnees: SessionPayload = { ...payload, exp: Date.now() + SESSION_DUREE_MS };
  const encode = Buffer.from(JSON.stringify(donnees)).toString('base64url');
  return `${encode}.${signer(encode)}`;
}

export function verifierJetonSession(jeton: string | undefined | null): SessionPayload | null {
  if (!jeton) return null;
  const [encode, signature] = jeton.split('.');
  if (!encode || !signature) return null;
  if (signature !== signer(encode)) return null;
  try {
    const donnees: SessionPayload = JSON.parse(Buffer.from(encode, 'base64url').toString());
    if (donnees.exp < Date.now()) return null;
    return donnees;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NOM };

// À utiliser dans les Server Components (pages) pour lire la session courante.
export function lireSession(): SessionPayload | null {
  const jeton = cookies().get(SESSION_COOKIE_NOM)?.value;
  return verifierJetonSession(jeton);
}

// À utiliser dans les Route Handlers (API) : renvoie la session si c'est un
// admin valide, sinon null — à l'appelant de renvoyer 401 dans ce cas.
export function exigerAdmin(): SessionPayload | null {
  const session = lireSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}
