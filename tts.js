// Dash — Neural TTS endpoint (Vercel serverless function)
// POST { text: "..." }  ->  audio/mpeg  (a warm neural voice)
// Provider: ElevenLabs. Set env vars in Vercel (never in the client):
//   ELEVENLABS_API_KEY   your ElevenLabs key
//   ELEVENLABS_VOICE_ID  the voice id (see README for warm/young picks)
//   ALLOW_ORIGIN         your site origin, e.g. https://196969.github.io  (or * to allow all)

export default async function handler(req, res) {
  const origin = process.env.ALLOW_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST' }); return; }

  try {
    // body may arrive parsed or raw depending on runtime
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const text = (body && body.text ? String(body.text) : '').slice(0, 2500).trim();
    if (!text) { res.status(400).json({ error: 'No text' }); return; }

    const key = process.env.ELEVENLABS_API_KEY;
    const voice = process.env.ELEVENLABS_VOICE_ID;
    if (!key || !voice) { res.status(500).json({ error: 'Server not configured (missing key or voice id)' }); return; }

    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voice, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true }
      })
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      res.status(502).json({ error: 'TTS provider error', status: r.status, detail: detail.slice(0, 400) });
      return;
    }

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).json({ error: 'TTS failed', detail: String(e && e.message || e) });
  }
}
