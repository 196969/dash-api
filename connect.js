// Step 1 of the connection: send the owner to Intuit to sign in and approve.
import crypto from 'node:crypto';
import { env, AUTH_URL, seal } from './_lib.js';

export default async function handler(req, res) {
  try {
    const state = seal({ n: crypto.randomBytes(8).toString('hex'), t: Date.now() });
    const q = new URLSearchParams({
      client_id: env('QBO_CLIENT_ID'),
      response_type: 'code',
      scope: 'com.intuit.quickbooks.accounting',
      redirect_uri: env('QBO_REDIRECT_URI'),
      state,
    });
    res.writeHead(302, { Location: AUTH_URL + '?' + q.toString() });
    res.end();
  } catch (e) {
    res.status(500).send('Connector not configured: ' + e.message);
  }
}
