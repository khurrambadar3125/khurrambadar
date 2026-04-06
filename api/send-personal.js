export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-vercel-cron',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Auth — accept Bearer token OR Vercel cron header
  const authHeader = req.headers.get('authorization');
  const isCron = req.headers.get('x-vercel-cron') === '1';
  if (!isCron && authHeader !== `Bearer ${process.env.KBAI_API_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { to, subject, message, recipient_name } = body;

    if (!to || !subject || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, message' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const greeting = recipient_name ? `Dear ${recipient_name},` : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#070810;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:600px;margin:0 auto;background:#0C0E1A;border:1px solid rgba(201,146,31,0.2);">
  <div style="padding:28px;border-bottom:2px solid #C9921F;text-align:center;">
    <h1 style="margin:0;font-size:22px;color:#C9921F;font-family:Georgia,serif;">Khurram Badar</h1>
    <p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:11px;color:#6b7280;letter-spacing:0.1em;">Personal Message</p>
  </div>
  <div style="padding:28px;">
    ${greeting ? `<p style="margin:0 0 16px;font-size:16px;color:#EDE8DC;">${greeting}</p>` : ''}
    <div style="font-size:15px;color:#EDE8DC;line-height:1.8;white-space:pre-wrap;">${message}</div>
  </div>
  <div style="padding:20px 28px;border-top:1px solid rgba(201,146,31,0.12);">
    <p style="margin:0 0 4px;font-size:13px;color:#C9921F;font-family:Georgia,serif;font-weight:bold;">Khurram Badar</p>
    <p style="margin:0;font-family:'Courier New',monospace;font-size:11px;color:#6b7280;line-height:1.6;">
      One of the World's Foremost Convergence Thinkers<br>
      AI Innovator · ESG Advisor · Market Intelligence<br>
      Pakistan: +92 326 2266682 (WhatsApp)<br>
      Dubai: +971 55 6239111 (WhatsApp)<br>
      khurrambadar@gmail.com · <a href="https://khurrambadar.com" style="color:#C9921F;text-decoration:none;">khurrambadar.com</a>
    </p>
  </div>
</div>
</body></html>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Khurram Badar <daily@khurrambadar.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errData = await emailRes.text();
      return new Response(JSON.stringify({ error: 'Send failed', details: errData }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await emailRes.json();
    return new Response(JSON.stringify({ success: true, id: result.id, to }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
