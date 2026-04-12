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
    const {
      to,
      subject,
      message,
      recipient_name,
      recipient_title,    // e.g. "Founder, Nutshell Group | Chairman BOI"
      recipient_welcome,  // welcome key for CTA: "bilal" → khurrambadar.com/?welcome=bilal
      cta_text,           // optional CTA button text, e.g. "Visit Your Profile"
      cta_url,            // optional custom CTA URL
    } = body;

    if (!to || !subject || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, message' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build personalized recipient banner
    const recipientBanner = recipient_name ? `
    <div style="padding:20px 28px;background:linear-gradient(135deg,rgba(201,146,31,0.08),rgba(201,146,31,0.02));border-bottom:1px solid rgba(201,146,31,0.1);">
      <p style="margin:0;font-family:'Courier New',monospace;font-size:10px;color:#6b7280;letter-spacing:0.12em;text-transform:uppercase;">Prepared for</p>
      <p style="margin:4px 0 0;font-size:20px;color:#C9921F;font-family:Georgia,serif;font-weight:bold;">${recipient_name}</p>
      ${recipient_title ? `<p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:11px;color:#6b7280;">${recipient_title}</p>` : ''}
    </div>` : '';

    // Build CTA button
    const welcomeUrl = recipient_welcome
      ? `https://khurrambadar.com/?welcome=${encodeURIComponent(recipient_welcome)}`
      : (cta_url || '');
    const buttonText = cta_text || (recipient_welcome ? 'Visit Your Personalized Profile' : '');
    const ctaButton = (welcomeUrl && buttonText) ? `
    <div style="text-align:center;padding:24px 0 8px;">
      <a href="${welcomeUrl}" style="display:inline-block;padding:12px 32px;background:#C9921F;color:#fff;text-decoration:none;border-radius:8px;font-family:Georgia,serif;font-size:14px;font-weight:bold;">${buttonText}</a>
    </div>` : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#070810;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:600px;margin:0 auto;background:#0C0E1A;border:1px solid rgba(201,146,31,0.2);">

  <!-- Header -->
  <div style="padding:28px;border-bottom:2px solid #C9921F;text-align:center;">
    <h1 style="margin:0;font-size:24px;color:#C9921F;font-family:Georgia,serif;font-weight:bold;">Khurram Badar</h1>
    <p style="margin:6px 0 0;font-family:'Courier New',monospace;font-size:11px;color:#6b7280;letter-spacing:0.1em;">Personal Message</p>
  </div>

  <!-- Recipient Banner -->
  ${recipientBanner}

  <!-- Message Body -->
  <div style="padding:28px;">
    <div style="font-size:15px;color:#EDE8DC;line-height:1.85;white-space:pre-wrap;">${message}</div>
    ${ctaButton}
  </div>

  <!-- Subscribe CTA -->
  <div style="padding:16px 28px;background:rgba(201,146,31,0.04);border-top:1px solid rgba(201,146,31,0.08);text-align:center;">
    <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">Get daily market intelligence — gold, silver, DXY, oil — delivered every morning.</p>
    <a href="https://khurrambadar.com/daily" style="display:inline-block;padding:8px 24px;background:rgba(201,146,31,0.15);color:#C9921F;text-decoration:none;border-radius:6px;font-family:'Courier New',monospace;font-size:12px;font-weight:bold;border:1px solid rgba(201,146,31,0.25);">Subscribe to KRM Daily Brief</a>
  </div>

  <!-- Signature -->
  <div style="padding:20px 28px;border-top:1px solid rgba(201,146,31,0.12);">
    <p style="margin:0 0 4px;font-size:14px;color:#C9921F;font-family:Georgia,serif;font-weight:bold;">Khurram Badar</p>
    <p style="margin:0;font-family:'Courier New',monospace;font-size:11px;color:#6b7280;line-height:1.7;">
      One of the World's Foremost Convergence Thinkers<br>
      AI Innovator · ESG Advisor · Market Intelligence<br>
      Founder, Spotlight FZE (est. 2002)<br><br>
      Pakistan: +92 326 2266682 (WhatsApp)<br>
      Dubai: +971 55 6239111 (WhatsApp)<br>
      khurrambadar@gmail.com<br>
      <a href="https://khurrambadar.com" style="color:#C9921F;text-decoration:none;">khurrambadar.com</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="padding:12px 28px;border-top:1px solid rgba(201,146,31,0.06);text-align:center;">
    <p style="margin:0;font-size:10px;color:#52525b;">This is a personal message from Khurram Badar. If you believe you received this in error, please reply to let us know.</p>
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
