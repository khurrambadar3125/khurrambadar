import { KNOWLEDGE_BASE } from './knowledge.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    // Only allow the expected model
    const allowed = ['claude-haiku-4-5-20251001'];
    if (!allowed.includes(body.model)) {
      return new Response(JSON.stringify({ error: 'Model not allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cap max_tokens to prevent abuse
    body.max_tokens = Math.min(body.max_tokens || 1024, 2048);

    // Inject knowledge base into system prompt if present
    if (body.system && typeof body.system === 'string') {
      body.system = body.system + '\n\nKNOWLEDGE BASE (use this data to answer financial/macro questions):\n' + KNOWLEDGE_BASE;

      // Inject learning loop memory context (last 30 days of snapshots + patterns)
      try {
        const memUrl = new URL('/api/memory?action=context', req.url);
        const memRes = await fetch(memUrl.toString());
        if (memRes.ok) {
          const memData = await memRes.json();
          if (memData.context && memData.context.length > 50) {
            body.system = body.system + '\n\nLEARNING LOOP MEMORY (historical snapshots, thesis changes, detected patterns — use this to identify multi-day trends and compare today vs previous days):\n' + memData.context;
          }
        }
      } catch (e) { /* memory unavailable, continue without it */ }
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Proxy error: ' + e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
