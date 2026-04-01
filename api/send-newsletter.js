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

function thesisColor(status) {
  const s = (status || '').toUpperCase();
  if (s === 'INTACT') return '#22c55e';
  if (s === 'STRESS-TESTED' || s === 'STRESS_TESTED') return '#f59e0b';
  if (s === 'BROKEN') return '#ef4444';
  if (s === 'APPROACHING' || s === 'ACTIVATED' || s === 'PENDING') return '#3b82f6';
  if (s === 'PAUSED') return '#8b8b8b';
  return '#8b8b8b';
}

function thesisLabel(key) {
  const labels = {
    thesis_a: 'A: DXY Floor 96-97',
    thesis_b: 'B: 4D Chess (Fed/Warsh)',
    thesis_c: 'C: BOJ Hike Path',
    thesis_d: 'D: Gold Bull $5,500-6,300',
    thesis_e: 'E: Peace Dividend',
    thesis_f: 'F: Cyclical vs Structural',
    thesis_g: 'G: Supply Chain',
    thesis_h: 'H: Iran Incentive Flip',
  };
  return labels[key] || key;
}

function buildEmailHtml(brief, recipientEmail) {
  const date = brief.date || new Date().toISOString().split('T')[0];
  const gold = brief.gold_price || '—';
  const silver = brief.silver_price || '—';
  const dxy = brief.dxy || '—';
  const oil = brief.oil_brent || '—';
  const tenY = brief.ten_year_yield || '—';
  const sp = brief.sp500 || '—';
  const war = brief.war_status || '—';
  const warsh = brief.warsh_status || '—';
  const verdict = brief.verdict || 'No verdict available.';
  const signals = brief.active_signals || [];
  const headlines = brief.headlines || [];

  const theses = ['thesis_a','thesis_b','thesis_c','thesis_d','thesis_e','thesis_f','thesis_g','thesis_h'];

  const thesisRows = theses.map(key => {
    const t = brief[key] || { status: 'PENDING', reason: 'N/A' };
    const color = thesisColor(t.status);
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(201,146,31,0.12);font-family:Georgia,serif;font-size:14px;color:#EDE8DC;">
          ${thesisLabel(key)}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(201,146,31,0.12);text-align:center;">
          <span style="display:inline-block;padding:3px 10px;border-radius:4px;background:${color};color:#fff;font-family:'Courier New',monospace;font-size:12px;font-weight:bold;letter-spacing:0.05em;">
            ${(t.status || 'PENDING').toUpperCase()}
          </span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(201,146,31,0.12);font-size:13px;color:#9ca3af;">
          ${t.reason || ''}
        </td>
      </tr>`;
  }).join('');

  const signalItems = signals.length > 0
    ? signals.map(s => `<li style="padding:4px 0;color:#EDE8DC;font-size:14px;">${s}</li>`).join('')
    : '<li style="padding:4px 0;color:#6b7280;font-size:14px;">No signals triggered today.</li>';

  const headlineItems = headlines.length > 0
    ? headlines.map(h => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(201,146,31,0.08);">
          <span style="font-family:'Courier New',monospace;font-size:11px;color:#C9921F;text-transform:uppercase;letter-spacing:0.05em;">${h.source || ''}</span><br>
          <a href="${h.url || '#'}" style="color:#EDE8DC;text-decoration:none;font-size:14px;line-height:1.4;">${h.headline || ''}</a>
        </td>
      </tr>`).join('')
    : '<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">No headlines available.</td></tr>';

  // Alert boxes
  let alertBox = '';
  if (brief.red_alert) {
    alertBox = `
      <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:16px 20px;margin:16px 0;">
        <span style="color:#ef4444;font-weight:bold;font-size:14px;font-family:'Courier New',monospace;">RED ALERT</span>
        <p style="color:#EDE8DC;font-size:14px;margin:6px 0 0 0;">${brief.red_alert_reason || ''}</p>
      </div>`;
  }
  if (brief.green_light) {
    alertBox += `
      <div style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:8px;padding:16px 20px;margin:16px 0;">
        <span style="color:#22c55e;font-weight:bold;font-size:14px;font-family:'Courier New',monospace;">GREEN LIGHT</span>
        <p style="color:#EDE8DC;font-size:14px;margin:6px 0 0 0;">${brief.green_light_reason || ''}</p>
      </div>`;
  }

  // Scenario probabilities
  const scA = brief.scenario_a_prob || 0;
  const scB = brief.scenario_b_prob || 0;
  const scC = brief.scenario_c_prob || 0;

  const unsubUrl = `https://khurrambadar.com/api/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#070810;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:600px;margin:0 auto;background:#0C0E1A;border:1px solid rgba(201,146,31,0.2);">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#0C0E1A 0%,#1a1520 100%);padding:32px 28px 24px;border-bottom:2px solid #C9921F;text-align:center;">
    <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;color:#C9921F;font-weight:bold;letter-spacing:0.04em;">KBAI DAILY BRIEF</h1>
    <p style="margin:6px 0 0;font-family:'Courier New',monospace;font-size:13px;color:#6b7280;letter-spacing:0.1em;">${date}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#5B6370;">khurrambadar.com</p>
  </div>

  <!-- MARKET SNAPSHOT -->
  <div style="padding:24px 28px 16px;">
    <h2 style="margin:0 0 16px;font-family:'Courier New',monospace;font-size:13px;color:#C9921F;letter-spacing:0.12em;text-transform:uppercase;">Market Snapshot</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td width="50%" style="padding:8px 8px 8px 0;">
          <span style="font-family:'Courier New',monospace;font-size:11px;color:#6b7280;text-transform:uppercase;">Gold</span><br>
          <span style="font-family:Georgia,serif;font-size:20px;color:#F0B840;font-weight:bold;">$${gold}</span>
        </td>
        <td width="50%" style="padding:8px 0 8px 8px;">
          <span style="font-family:'Courier New',monospace;font-size:11px;color:#6b7280;text-transform:uppercase;">Silver</span><br>
          <span style="font-family:Georgia,serif;font-size:20px;color:#C0C0C0;font-weight:bold;">$${silver}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 8px 8px 0;">
          <span style="font-family:'Courier New',monospace;font-size:11px;color:#6b7280;text-transform:uppercase;">DXY</span><br>
          <span style="font-family:Georgia,serif;font-size:18px;color:#EDE8DC;">${dxy}</span>
        </td>
        <td style="padding:8px 0 8px 8px;">
          <span style="font-family:'Courier New',monospace;font-size:11px;color:#6b7280;text-transform:uppercase;">Brent Oil</span><br>
          <span style="font-family:Georgia,serif;font-size:18px;color:#EDE8DC;">$${oil}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 8px 8px 0;">
          <span style="font-family:'Courier New',monospace;font-size:11px;color:#6b7280;text-transform:uppercase;">10Y Yield</span><br>
          <span style="font-family:Georgia,serif;font-size:18px;color:#EDE8DC;">${tenY}%</span>
        </td>
        <td style="padding:8px 0 8px 8px;">
          <span style="font-family:'Courier New',monospace;font-size:11px;color:#6b7280;text-transform:uppercase;">S&amp;P 500</span><br>
          <span style="font-family:Georgia,serif;font-size:18px;color:#EDE8DC;">${sp}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 8px 8px 0;">
          <span style="font-family:'Courier New',monospace;font-size:11px;color:#6b7280;text-transform:uppercase;">War Status</span><br>
          <span style="font-family:Georgia,serif;font-size:15px;color:#f59e0b;">${war}</span>
        </td>
        <td style="padding:8px 0 8px 8px;">
          <span style="font-family:'Courier New',monospace;font-size:11px;color:#6b7280;text-transform:uppercase;">Warsh Status</span><br>
          <span style="font-family:Georgia,serif;font-size:15px;color:#EDE8DC;">${warsh}</span>
        </td>
      </tr>
    </table>
  </div>

  <!-- SCENARIO PROBABILITIES -->
  <div style="padding:0 28px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td width="33%" style="text-align:center;padding:8px 4px;">
          <div style="font-family:'Courier New',monospace;font-size:24px;color:#f59e0b;font-weight:bold;">${scA}%</div>
          <div style="font-family:'Courier New',monospace;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">War Drags</div>
        </td>
        <td width="33%" style="text-align:center;padding:8px 4px;">
          <div style="font-family:'Courier New',monospace;font-size:24px;color:#ef4444;font-weight:bold;">${scB}%</div>
          <div style="font-family:'Courier New',monospace;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Escalation</div>
        </td>
        <td width="33%" style="text-align:center;padding:8px 4px;">
          <div style="font-family:'Courier New',monospace;font-size:24px;color:#22c55e;font-weight:bold;">${scC}%</div>
          <div style="font-family:'Courier New',monospace;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Ceasefire</div>
        </td>
      </tr>
    </table>
  </div>

  ${alertBox}

  <!-- VERDICT -->
  <div style="padding:0 28px 20px;">
    <div style="background:rgba(201,146,31,0.08);border:1px solid rgba(201,146,31,0.25);border-radius:8px;padding:20px 24px;">
      <h2 style="margin:0 0 10px;font-family:'Courier New',monospace;font-size:13px;color:#C9921F;letter-spacing:0.12em;text-transform:uppercase;">Today's Verdict</h2>
      <p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#EDE8DC;line-height:1.65;">${verdict}</p>
    </div>
  </div>

  <!-- THESIS SCORECARD -->
  <div style="padding:0 28px 20px;">
    <h2 style="margin:0 0 12px;font-family:'Courier New',monospace;font-size:13px;color:#C9921F;letter-spacing:0.12em;text-transform:uppercase;">Thesis Scorecard</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${thesisRows}
    </table>
  </div>

  <!-- ACTIVE SIGNALS -->
  <div style="padding:0 28px 20px;">
    <h2 style="margin:0 0 10px;font-family:'Courier New',monospace;font-size:13px;color:#C9921F;letter-spacing:0.12em;text-transform:uppercase;">Active Signals</h2>
    <ul style="margin:0;padding:0 0 0 18px;list-style:disc;">${signalItems}</ul>
  </div>

  <!-- HEADLINES -->
  <div style="padding:0 28px 24px;">
    <h2 style="margin:0 0 10px;font-family:'Courier New',monospace;font-size:13px;color:#C9921F;letter-spacing:0.12em;text-transform:uppercase;">Today's Headlines</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${headlineItems}
    </table>
  </div>

  <!-- FOOTER -->
  <div style="padding:24px 28px;border-top:1px solid rgba(201,146,31,0.15);text-align:center;">
    <p style="margin:0 0 8px;font-size:12px;color:#6b7280;font-style:italic;">Educational only — not financial advice.</p>
    <p style="margin:0 0 12px;font-size:12px;">
      <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
    </p>
    <p style="margin:0;">
      <a href="https://khurrambadar.com" style="color:#C9921F;text-decoration:none;font-size:13px;letter-spacing:0.05em;">khurrambadar.com</a>
    </p>
  </div>

</div>
</body>
</html>`;
}

export { buildEmailHtml, kvGet };

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

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Read brief
    const rawBrief = await kvGet('kbai:daily-brief');
    let brief = null;
    if (rawBrief) {
      try {
        brief = typeof rawBrief === 'string' ? JSON.parse(rawBrief) : rawBrief;
      } catch (e) { brief = null; }
    }
    if (!brief) {
      return new Response(JSON.stringify({ error: 'No daily brief found. Run update-brief first.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Read subscribers
    const rawSubs = await kvGet('kbai:subscribers');
    let subscribers = [];
    if (rawSubs) {
      try {
        subscribers = typeof rawSubs === 'string' ? JSON.parse(rawSubs) : rawSubs;
      } catch (e) { subscribers = []; }
    }
    if (!Array.isArray(subscribers) || subscribers.length === 0) {
      return new Response(JSON.stringify({ error: 'No subscribers found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const date = brief.date || new Date().toISOString().split('T')[0];
    const goldLabel = brief.gold_price ? `$${brief.gold_price}` : 'N/A';
    const warLabel = brief.war_status || 'Active';
    const subject = `KBAI Daily Brief — ${date} | Gold ${goldLabel} | ${warLabel}`;

    let sentCount = 0;
    const errors = [];

    // Send to each subscriber
    for (const sub of subscribers) {
      try {
        const html = buildEmailHtml(brief, sub.email);
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'KRM Intelligence <daily@khurrambadar.com>',
            to: [sub.email],
            subject,
            html,
          }),
        });

        if (res.ok) {
          sentCount++;
        } else {
          const errData = await res.text();
          errors.push({ email: sub.email, error: errData });
        }
      } catch (e) {
        errors.push({ email: sub.email, error: e.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sent: sentCount,
      total_subscribers: subscribers.length,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Newsletter error: ' + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
