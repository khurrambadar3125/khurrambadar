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

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();

  if (!email) {
    return new Response(htmlPage('Missing email parameter.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const raw = await kvGet('kbai:subscribers');
    let subscribers = [];
    if (raw) {
      try {
        subscribers = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        subscribers = [];
      }
    }
    if (!Array.isArray(subscribers)) subscribers = [];

    const before = subscribers.length;
    subscribers = subscribers.filter(s => s.email !== email);
    const removed = subscribers.length < before;

    if (removed) {
      await kvSet('kbai:subscribers', subscribers);
    }

    return new Response(
      htmlPage("You've been unsubscribed from KRM Daily Brief.", true),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  } catch (e) {
    return new Response(htmlPage('Error processing unsubscribe: ' + e.message, false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function htmlPage(message, success) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KBAI — Unsubscribe</title>
<style>
  body {
    background: #070810;
    color: #EDE8DC;
    font-family: 'Georgia', serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
    padding: 20px;
  }
  .card {
    background: rgba(12,14,26,0.95);
    border: 1px solid rgba(201,146,31,0.25);
    border-radius: 12px;
    padding: 48px 40px;
    max-width: 480px;
    text-align: center;
  }
  h1 {
    color: #C9921F;
    font-size: 22px;
    margin-bottom: 16px;
    letter-spacing: 0.03em;
  }
  p {
    font-size: 16px;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  a {
    color: #C9921F;
    text-decoration: none;
    font-size: 14px;
  }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="card">
  <h1>KRM Daily Brief</h1>
  <p>${message}</p>
  <a href="https://khurrambadar.com">Return to khurrambadar.com</a>
</div>
</body>
</html>`;
}
