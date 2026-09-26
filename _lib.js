// Shared helpers for the QuickBooks Online connector.
// Tokens never sit in plain text in the browser: Dash only ever holds an
// AES-256-GCM sealed blob that this server alone can open (key = TOKEN_KEY).
import crypto from 'node:crypto';

export const env = (k, d) => process.env[k] || d;
export const IS_SANDBOX = env('QBO_ENV', 'sandbox') !== 'production';
export const API_BASE = IS_SANDBOX
  ? 'https://sandbox-quickbooks.api.intuit.com'
  : 'https://quickbooks.api.intuit.com';
export const AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
export const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

export function cors(req, res) {
  const origin = env('ALLOW_ORIGIN', 'https://196969.github.io');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

function key() {
  const k = env('TOKEN_KEY', '');
  if (k.length < 32) throw new Error('TOKEN_KEY missing or shorter than 32 characters');
  return crypto.createHash('sha256').update(k).digest();
}
export function seal(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}
export function unseal(s) {
  const b = Buffer.from(String(s || ''), 'base64url');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
}

function basic() {
  return 'Basic ' + Buffer.from(env('QBO_CLIENT_ID') + ':' + env('QBO_CLIENT_SECRET')).toString('base64');
}
export async function tokenRequest(params) {
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: basic(), Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const tid = r.headers.get('intuit_tid') || '';
  console.log(JSON.stringify({ qbo: 'token:' + params.grant_type, status: r.status, intuit_tid: tid }));
  const j = await r.json();
  if (!r.ok) throw new Error('Intuit token error: ' + (j.error || r.status) + ' (intuit_tid ' + (tid || 'n/a') + ')');
  return j;
}
