// Health check: tells Dash whether the connector is configured (never reveals keys).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || 'https://196969.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const has = k => Boolean(process.env[k]);
  res.status(200).json({
    ok: true,
    qbo: {
      configured: has('QBO_CLIENT_ID') && has('QBO_CLIENT_SECRET') && has('QBO_REDIRECT_URI') && (process.env.TOKEN_KEY || '').length >= 32,
      environment: process.env.QBO_ENV || 'sandbox',
    },
    tts: { configured: has('ELEVENLABS_API_KEY') },
  });
}
