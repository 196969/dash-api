// Step 3: READ-ONLY pull. Dash posts its sealed blob; we refresh the access
// token, read accounts / customers / invoices / purchases, and return them
// with a fresh sealed blob (Intuit rotates refresh tokens). Nothing is written to QuickBooks.
import { env, cors, seal, unseal, tokenRequest, API_BASE } from './_lib.js';

const QUERIES = {
  accounts: 'select * from Account maxresults 1000',
  customers: 'select * from Customer maxresults 1000',
  invoices: 'select * from Invoice maxresults 1000',
  purchases: 'select * from Purchase maxresults 1000',
};

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const s = unseal(body.token);
    const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: s.r });
    const out = {};
    for (const [k, q] of Object.entries(QUERIES)) {
      const r = await fetch(`${API_BASE}/v3/company/${s.realm}/query?minorversion=75&query=${encodeURIComponent(q)}`, {
        headers: { Authorization: 'Bearer ' + t.access_token, Accept: 'application/json' },
      });
      const j = await r.json();
      if (!r.ok) throw new Error('QuickBooks ' + k + ' read failed (' + r.status + ')');
      const qr = j.QueryResponse || {};
      out[k] = qr[Object.keys(qr).find(x => Array.isArray(qr[x]))] || [];
    }
    res.status(200).json({
      connected: true,
      environment: env('QBO_ENV', 'sandbox'),
      realm: s.realm,
      syncedAt: new Date().toISOString(),
      counts: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])),
      data: out,
      token: seal({ r: t.refresh_token || s.r, realm: s.realm, at: Date.now() }),
    });
  } catch (e) {
    res.status(200).json({ connected: false, error: e.message });
  }
}
