export const config = { runtime: 'edge' };

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('KV not configured');
  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result;
}

export default async function handler(req) {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const raw = await kvGet('kbai:daily-brief');
    let brief = null;
    if (raw) {
      try {
        brief = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        brief = null;
      }
    }

    if (!brief) {
      return new Response(JSON.stringify({
        placeholder: true,
        date: new Date().toISOString().split('T')[0],
        message: 'No daily brief available yet. The first brief will be generated at 06:15 UTC.',
        gold_price: null,
        silver_price: null,
        dxy: null,
        oil_brent: null,
        ten_year_yield: null,
        sp500: null,
        verdict: 'Daily brief has not been generated yet. Check back after 06:15 UTC.',
        thesis_a: { status: 'PENDING', reason: 'Awaiting data' },
        thesis_b: { status: 'PENDING', reason: 'Awaiting data' },
        thesis_c: { status: 'PENDING', reason: 'Awaiting data' },
        thesis_d: { status: 'PENDING', reason: 'Awaiting data' },
        thesis_e: { status: 'PENDING', reason: 'Awaiting data' },
        thesis_f: { status: 'PENDING', reason: 'Awaiting data' },
        active_signals: [],
        headlines: [],
        scenario_a_prob: 0,
        scenario_b_prob: 0,
        scenario_c_prob: 0,
        red_alert: false,
        green_light: false,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    return new Response(JSON.stringify(brief), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to fetch brief: ' + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
