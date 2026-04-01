export const config = { runtime: 'edge', maxDuration: 120 };

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

const BRIEF_SYSTEM_PROMPT = `You are the KRM Daily Brief Generator for khurrambadar.com — the autonomous market intelligence platform of Khurram Badar, one of the world's foremost Convergence Thinkers. 30+ years C-Suite across UAE, Pakistan, Saudi Arabia, Bahrain, Singapore. Published journalist (Dawn 1995, Gulf News 2002).

Search the web for today's live market data from FT, WSJ, Bloomberg, NYT, Economist, Yahoo News, CNBC, and Reuters. Evaluate all 8 theses, score all 14 signals, produce a JSON brief.

REQUIRED SEARCHES (search EACH individually, use most recent price):
1. "gold spot price today USD" 2. "silver spot price today USD" 3. "DXY dollar index today"
4. "brent crude oil price today" 5. "US 10 year treasury yield today" 6. "S&P 500 today"
7. "Iran war latest news" 8. "Kevin Warsh Fed confirmation status" 9. "BOJ interest rate"
10. "Financial Times today markets" 11. "Wall Street Journal today markets" 12. "Bloomberg markets today"

THE 8 THESES (rate each: INTACT, STRESS-TESTED, BROKEN, PENDING, APPROACHING, ACTIVATED, FROZEN, CONFIRMING):
A: DXY Floor 96-97 — INTACT if DXY<102 war premium. CONFIRMING if trending to 96-98. BROKEN if DXY>104 no war.
B: 4D Chess (Warsh) — INTACT if Warsh blocked. BROKEN if confirmed.
C: BOJ Path 1.25-1.5% — INTACT if hiking. FROZEN if war delays. BROKEN if reverses.
D: Gold Bull $5,500-6,300 — Two-catalyst: war exit→$5,000-5,200; private credit shock+Fed pivot→$5,500-6,300.
E: Peace Dividend — PENDING→APPROACHING→ACTIVATED. Arrives in PHASES (withdrawal→escort→deal).
F: Cyclical vs Structural — STRUCTURAL if gold rising with DXY stable/rising (Signal 14). CYCLICAL if pure dollar move.
G: Supply Chain — LOCKED IN if disruption persists. IEA: "largest supply disruption in history."
H: Iran Incentive Flip — ACTIVE if Iran earning more than pre-war (dark fleet + war premiums to China).

THE 14 SIGNALS (TRIGGERED, APPROACHING, or CLEAR):
1:DXY<98=BULLISH 2:DXY>101=BEARISH 3:10Y<4%=BULLISH 4:10Y>4.5%=BEARISH 5:Oil<$80=BULLISH 6:Oil>$110=BEARISH 7:Ceasefire=ACTIVATE 8:BOJ hike=BULLISH 9:Fed cut=BULLISH 10:Warsh confirmed=BEARISH 11:G/S>75=silver cheap 12:Shanghai premium>$10=structural 13:COMEX silver<80Moz=stress 14:Gold+Dollar both up=DECOUPLING (rarest, most important)

VERDICT: 3-4 sentences in Khurram's voice — confident, punchy, connecting dots across geographies. ALWAYS cover BOTH gold AND silver. Reference specific numbers. End with forward-looking 48-72h statement.

SCENARIOS (must sum to 100): A=War Drags/Stalemate B=Escalation C=Ceasefire/Withdrawal

ALERTS: Red Alert if oil>$120, gold<$4,000, DXY>106, IRGC strikes tech, Bab al-Mandeb closed. Green Light if ceasefire imminent, DXY<97, or 3+ bullish signals converging.

TRUMP TIMING: If Friday, note potential post-close announcement. If Monday, note potential pre-open de-escalation.

OUTPUT: Return ONLY valid JSON:
{"date":"YYYY-MM-DD","gold_price":number,"silver_price":number,"dxy":number,"oil_brent":number,"ten_year_yield":number,"sp500":number,"war_status":"string","warsh_status":"string","thesis_a":{"status":"string","reason":"string"},"thesis_b":{"status":"string","reason":"string"},"thesis_c":{"status":"string","reason":"string"},"thesis_d":{"status":"string","reason":"string"},"thesis_e":{"status":"string","reason":"string"},"thesis_f":{"status":"string","reason":"string"},"thesis_g":{"status":"string","reason":"string"},"thesis_h":{"status":"string","reason":"string"},"active_signals":["string"],"verdict":"string","headlines":[{"source":"string","headline":"string","url":"string"}],"scenario_a_prob":number,"scenario_b_prob":number,"scenario_c_prob":number,"red_alert":boolean,"red_alert_reason":"string or null","green_light":boolean,"green_light_reason":"string or null"}

CRITICAL: Output ONLY the JSON. No markdown, no code fences, no explanation. All prices CURRENT (searched today). Probabilities sum to 100. 3 headlines with real URLs.`;

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

  // Auth check — accept Bearer token OR Vercel cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = req.headers.get('x-vercel-cron-secret');
  const kbaiKey = process.env.KBAI_API_KEY;
  const isAuthed = (authHeader === `Bearer ${kbaiKey}`) ||
                   (cronSecret && cronSecret === process.env.CRON_SECRET) ||
                   (req.headers.get('x-vercel-cron') === '1');
  if (!isAuthed) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      hint: kbaiKey ? `Key is set (${kbaiKey.length} chars)` : 'KBAI_API_KEY not set',
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const log = [];
  const today = new Date().toISOString().split('T')[0];
  log.push(`[${new Date().toISOString()}] Starting daily run for ${today}`);

  try {
    // STEP 1: Call Claude with web search to generate brief
    log.push('Step 1: Calling Claude API with web search...');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: BRIEF_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Today is ${today}. Search for all live market data and generate today's KRM Daily Brief as JSON.`,
        }],
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 12,
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      log.push(`Claude API error: ${claudeRes.status} — ${errText}`);
      return new Response(JSON.stringify({ error: 'Claude API failed', log }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const claudeData = await claudeRes.json();
    log.push(`Claude responded with ${claudeData.content?.length || 0} content blocks`);

    // Extract the text block with JSON
    let briefJson = null;
    for (const block of (claudeData.content || [])) {
      if (block.type === 'text') {
        let text = block.text.trim();
        // Strip markdown code fences if present
        if (text.startsWith('```')) {
          text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        try {
          briefJson = JSON.parse(text);
          break;
        } catch (e) {
          // Try to find JSON in the text
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              briefJson = JSON.parse(jsonMatch[0]);
              break;
            } catch (e2) {}
          }
        }
      }
    }

    if (!briefJson) {
      log.push('ERROR: Could not parse JSON from Claude response');
      return new Response(JSON.stringify({
        error: 'Failed to parse brief from Claude',
        raw: claudeData.content?.map(b => b.type === 'text' ? b.text : b.type).join('\n'),
        log,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure date is set
    briefJson.date = briefJson.date || today;
    log.push(`Parsed brief: Gold $${briefJson.gold_price}, DXY ${briefJson.dxy}`);

    // STEP 2: Write to KV
    log.push('Step 2: Writing brief to KV...');
    briefJson.updated_at = new Date().toISOString();
    await kvSet('kbai:daily-brief', briefJson);
    await kvSet('kbai:last-updated', new Date().toISOString());
    log.push('Brief saved to KV');

    // STEP 3: Send newsletter
    log.push('Step 3: Sending newsletter...');
    let newsletterResult = { sent: 0, skipped: true };

    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        log.push('RESEND_API_KEY not set — skipping newsletter');
      } else {
        // Read subscribers
        const rawSubs = await kvGet('kbai:subscribers');
        let subscribers = [];
        if (rawSubs) {
          try {
            subscribers = typeof rawSubs === 'string' ? JSON.parse(rawSubs) : rawSubs;
          } catch (e) { subscribers = []; }
        }

        if (!Array.isArray(subscribers) || subscribers.length === 0) {
          log.push('No subscribers — skipping newsletter');
        } else {
          // Dynamically import the email builder
          // Since we can't import in Edge easily, inline a simpler send
          const goldLabel = briefJson.gold_price ? `$${briefJson.gold_price}` : 'N/A';
          const warLabel = briefJson.war_status || 'Active';
          const subject = `KRM Daily Brief — ${today} | Gold ${goldLabel} | ${warLabel}`;

          let sentCount = 0;
          for (const sub of subscribers) {
            try {
              // Build a simplified inline email for the cron job
              const unsubUrl = `https://khurrambadar.com/api/unsubscribe?email=${encodeURIComponent(sub.email)}`;
              const html = buildCronEmail(briefJson, sub.email, unsubUrl);

              const emailRes = await fetch('https://api.resend.com/emails', {
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

              if (emailRes.ok) sentCount++;
            } catch (e) {
              log.push(`Failed to send to ${sub.email}: ${e.message}`);
            }
          }

          newsletterResult = { sent: sentCount, total: subscribers.length, skipped: false };
          log.push(`Newsletter sent to ${sentCount}/${subscribers.length} subscribers`);
        }
      }
    } catch (e) {
      log.push(`Newsletter error: ${e.message}`);
    }

    log.push(`[${new Date().toISOString()}] Daily run complete`);

    return new Response(JSON.stringify({
      success: true,
      date: today,
      brief_saved: true,
      newsletter: newsletterResult,
      log,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    log.push(`FATAL: ${e.message}`);
    return new Response(JSON.stringify({ error: e.message, log }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Simplified email builder for the cron context (avoids cross-file imports in Edge)
function buildCronEmail(brief, email, unsubUrl) {
  const d = brief.date || '';
  const theses = ['thesis_a','thesis_b','thesis_c','thesis_d','thesis_e','thesis_f','thesis_g','thesis_h'];
  const labels = {
    thesis_a: 'A: DXY Floor', thesis_b: 'B: 4D Chess', thesis_c: 'C: BOJ Path',
    thesis_d: 'D: Gold Bull', thesis_e: 'E: Peace Div', thesis_f: 'F: Cyc/Struct',
    thesis_g: 'G: Supply Chain', thesis_h: 'H: Iran Incentive',
  };

  function color(s) {
    s = (s||'').toUpperCase();
    if (s==='INTACT') return '#22c55e';
    if (s.includes('STRESS')) return '#f59e0b';
    if (s==='BROKEN') return '#ef4444';
    return '#3b82f6';
  }

  const thesisRows = theses.map(k => {
    const t = brief[k] || {status:'PENDING',reason:''};
    return `<tr><td style="padding:6px 8px;color:#EDE8DC;font-size:13px;border-bottom:1px solid rgba(201,146,31,0.1);">${labels[k]}</td><td style="padding:6px 8px;text-align:center;border-bottom:1px solid rgba(201,146,31,0.1);"><span style="background:${color(t.status)};color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;font-family:monospace;">${t.status}</span></td><td style="padding:6px 8px;color:#9ca3af;font-size:12px;border-bottom:1px solid rgba(201,146,31,0.1);">${t.reason||''}</td></tr>`;
  }).join('');

  const signals = (brief.active_signals||[]).map(s=>`<li style="color:#EDE8DC;font-size:13px;padding:2px 0;">${s}</li>`).join('') || '<li style="color:#6b7280;">None triggered</li>';

  const headlines = (brief.headlines||[]).map(h=>`<div style="padding:6px 0;border-bottom:1px solid rgba(201,146,31,0.08);"><span style="font-family:monospace;font-size:10px;color:#C9921F;">${h.source||''}</span><br><a href="${h.url||'#'}" style="color:#EDE8DC;font-size:13px;text-decoration:none;">${h.headline||''}</a></div>`).join('') || '<div style="color:#6b7280;font-size:13px;">No headlines</div>';

  let alertHtml = '';
  if (brief.red_alert) alertHtml += `<div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:12px 16px;margin:12px 0;"><span style="color:#ef4444;font-weight:bold;font-size:13px;">RED ALERT:</span> <span style="color:#EDE8DC;font-size:13px;">${brief.red_alert_reason||''}</span></div>`;
  if (brief.green_light) alertHtml += `<div style="background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);border-radius:6px;padding:12px 16px;margin:12px 0;"><span style="color:#22c55e;font-weight:bold;font-size:13px;">GREEN LIGHT:</span> <span style="color:#EDE8DC;font-size:13px;">${brief.green_light_reason||''}</span></div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#070810;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;background:#0C0E1A;border:1px solid rgba(201,146,31,0.2);">
<div style="padding:28px;border-bottom:2px solid #C9921F;text-align:center;">
<h1 style="margin:0;font-size:24px;color:#C9921F;">KRM DAILY BRIEF</h1>
<p style="margin:4px 0 0;font-family:monospace;font-size:12px;color:#6b7280;">${d} | khurrambadar.com</p></div>
<div style="padding:20px 28px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="50%" style="padding:6px 0;"><span style="font-family:monospace;font-size:10px;color:#6b7280;">GOLD</span><br><span style="font-size:18px;color:#F0B840;font-weight:bold;">$${brief.gold_price||'—'}</span></td>
<td width="50%" style="padding:6px 0;"><span style="font-family:monospace;font-size:10px;color:#6b7280;">SILVER</span><br><span style="font-size:18px;color:#C0C0C0;font-weight:bold;">$${brief.silver_price||'—'}</span></td></tr><tr>
<td style="padding:6px 0;"><span style="font-family:monospace;font-size:10px;color:#6b7280;">DXY</span><br><span style="font-size:16px;color:#EDE8DC;">${brief.dxy||'—'}</span></td>
<td style="padding:6px 0;"><span style="font-family:monospace;font-size:10px;color:#6b7280;">BRENT</span><br><span style="font-size:16px;color:#EDE8DC;">$${brief.oil_brent||'—'}</span></td></tr><tr>
<td style="padding:6px 0;"><span style="font-family:monospace;font-size:10px;color:#6b7280;">10Y YIELD</span><br><span style="font-size:16px;color:#EDE8DC;">${brief.ten_year_yield||'—'}%</span></td>
<td style="padding:6px 0;"><span style="font-family:monospace;font-size:10px;color:#6b7280;">S&P 500</span><br><span style="font-size:16px;color:#EDE8DC;">${brief.sp500||'—'}</span></td></tr><tr>
<td style="padding:6px 0;"><span style="font-family:monospace;font-size:10px;color:#6b7280;">WAR</span><br><span style="font-size:14px;color:#f59e0b;">${brief.war_status||'—'}</span></td>
<td style="padding:6px 0;"><span style="font-family:monospace;font-size:10px;color:#6b7280;">WARSH</span><br><span style="font-size:14px;color:#EDE8DC;">${brief.warsh_status||'—'}</span></td></tr></table>
<div style="text-align:center;padding:12px 0;"><span style="color:#f59e0b;font-family:monospace;font-size:18px;font-weight:bold;">${brief.scenario_a_prob||0}%</span><span style="color:#6b7280;font-size:11px;"> War </span><span style="color:#ef4444;font-family:monospace;font-size:18px;font-weight:bold;margin:0 12px;">${brief.scenario_b_prob||0}%</span><span style="color:#6b7280;font-size:11px;"> Esc </span><span style="color:#22c55e;font-family:monospace;font-size:18px;font-weight:bold;margin:0 12px;">${brief.scenario_c_prob||0}%</span><span style="color:#6b7280;font-size:11px;"> Peace</span></div>
${alertHtml}
<div style="background:rgba(201,146,31,0.08);border:1px solid rgba(201,146,31,0.2);border-radius:6px;padding:16px 20px;margin:16px 0;">
<div style="font-family:monospace;font-size:11px;color:#C9921F;margin-bottom:8px;">TODAY'S VERDICT</div>
<p style="margin:0;font-size:14px;color:#EDE8DC;line-height:1.6;">${brief.verdict||'No verdict.'}</p></div>
<div style="font-family:monospace;font-size:11px;color:#C9921F;margin:16px 0 8px;">THESIS SCORECARD</div>
<table width="100%" cellpadding="0" cellspacing="0">${thesisRows}</table>
<div style="font-family:monospace;font-size:11px;color:#C9921F;margin:16px 0 8px;">ACTIVE SIGNALS</div>
<ul style="margin:0;padding:0 0 0 16px;">${signals}</ul>
<div style="font-family:monospace;font-size:11px;color:#C9921F;margin:16px 0 8px;">HEADLINES</div>
${headlines}
</div>
<div style="padding:20px 28px;border-top:1px solid rgba(201,146,31,0.12);text-align:center;">
<p style="margin:0 0 8px;font-size:11px;color:#6b7280;font-style:italic;">Educational only — not financial advice.</p>
<a href="${unsubUrl}" style="color:#6b7280;font-size:11px;text-decoration:underline;">Unsubscribe</a>
<br><a href="https://khurrambadar.com" style="color:#C9921F;font-size:12px;text-decoration:none;margin-top:8px;display:inline-block;">khurrambadar.com</a>
</div></div></body></html>`;
}
