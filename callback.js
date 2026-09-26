// Step 2: Intuit sends the owner back here with a one-time code.
// We swap it for tokens, seal them, and hand only the sealed blob back to Dash.
import { env, seal, unseal, tokenRequest } from './_lib.js';

export default async function handler(req, res) {
  const dash = env('DASH_URL', 'https://196969.github.io/dash-app-/');
  try {
    const { code, realmId, state, error } = req.query || {};
    if (error) throw new Error(error);
    const st = unseal(state);
    if (!st || Date.now() - st.t > 10 * 60 * 1000) throw new Error('Sign-in took too long; start again from Dash.');
    const t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: env('QBO_REDIRECT_URI') });
    const blob = seal({ r: t.refresh_token, realm: realmId, at: Date.now() });
    res.writeHead(302, { Location: dash + '#qbo=' + encodeURIComponent(blob) + '&realm=' + encodeURIComponent(realmId || '') });
    res.end();
  } catch (e) {
    res.writeHead(302, { Location: dash + '#qboerror=' + encodeURIComponent(e.message) });
    res.end();
  }
}
