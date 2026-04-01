export const config = { runtime: 'edge' };

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('KV not configured');
  const res = await fetch(`${url}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SET', key, JSON.stringify(value)]),
  });
  return res.ok;
}

const REQUIRED_FIELDS = [
  'date', 'gold_price', 'silver_price', 'dxy', 'oil_brent',
  'ten_year_yield', 'sp500', 'war_status', 'warsh_status',
  'thesis_a', 'thesis_b', 'thesis_c', 'thesis_d', 'thesis_e', 'thesis_f',
  'active_signals', 'verdict',
];

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Auth check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.KBAI_API_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const brief = await req.json();

    // Validate required fields
    const missing = REQUIRED_FIELDS.filter(f => brief[f] === undefined);
    if (missing.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: ' + missing.join(', '),
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add metadata
    brief.updated_at = new Date().toISOString();

    // Write to KV
    await kvSet('kbai:daily-brief', brief);
    await kvSet('kbai:last-updated', new Date().toISOString());

    return new Response(JSON.stringify({
      success: true,
      updated_at: brief.updated_at,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Update failed: ' + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
