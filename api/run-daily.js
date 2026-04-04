export const config = { maxDuration: 300, runtime: 'nodejs' };

function getKvCreds() {
  // Vercel KV uses different env var names depending on how it was linked
  const url = process.env.KV_REST_API_URL || process.env.KV_URL || process.env.REDIS_URL || '';
  const token = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || '';
  return { url, token };
}

async function kvGet(key) {
  const { url, token } = getKvCreds();
  if (!url || !token) throw new Error('KV not configured — checked KV_REST_API_URL, KV_URL, REDIS_URL');
  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result;
}

async function kvSet(key, value) {
  const { url, token } = getKvCreds();
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

REQUIRED SEARCHES (search EACH individually — use the SINGLE MOST RECENT price from the SINGLE most authoritative source):
1. "gold XAU/USD spot price" — use kitco.com or investing.com LIVE price. ONE number only.
2. "silver XAG/USD spot price" — use kitco.com or investing.com LIVE price. ONE number only.
3. "DXY US dollar index" — use investing.com or tradingeconomics.com LIVE. ONE number only.
4. "brent crude oil price" — use investing.com or oilprice.com LIVE. ONE number only.
5. "US 10 year treasury yield" — use cnbc.com or investing.com LIVE. ONE number only.
6. "S&P 500 index" — use latest close or futures from investing.com or cnbc.com.
7. "Iran war latest news today" 8. "Kevin Warsh Fed confirmation status" 9. "BOJ interest rate decision"
10. "Financial Times today" 11. "Wall Street Journal today" 12. "Bloomberg markets today"

CRITICAL PRICE ACCURACY RULES:
- NEVER average prices from multiple sources. Pick the ONE most recent source and use THAT number.
- If two sources conflict, use the one with the MOST RECENT timestamp.
- Kitco and Investing.com are the gold standard for precious metals. Use them FIRST.
- NEVER round to the nearest $100. Use the exact price shown (e.g., $4,618.60, NOT $4,772).
- If a source shows yesterday's close, search for a more recent real-time quote.
- Double-check: your gold price should be within 1% of the kitco.com live quote. Your silver should be within 1% of kitco.com. If not, you searched the wrong source.

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check — accept Bearer token OR Vercel cron header
  const authHeader = req.headers['authorization'] || '';
  const kbaiKey = process.env.KBAI_API_KEY;
  const isAuthed = (authHeader === `Bearer ${kbaiKey}`) ||
                   (req.headers['x-vercel-cron'] === '1');
  if (!isAuthed) {
    return res.status(401).json({
      error: 'Unauthorized',
      hint: kbaiKey ? `Key is set (${kbaiKey.length} chars)` : 'KBAI_API_KEY not set',
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
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
      return res.status(502).json({ error: 'Claude API failed', log });
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
      return res.status(500).json({
        error: 'Failed to parse brief from Claude',
        raw: claudeData.content?.map(b => b.type === 'text' ? b.text : b.type).join('\n'),
        log,
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
          const silverLabel = briefJson.silver_price ? `$${briefJson.silver_price}` : '';
          const dxyLabel = briefJson.dxy || '';
          const subject = `KRM Daily Brief — ${today} | Gold ${goldLabel} | Silver ${silverLabel} | DXY ${dxyLabel}`;

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

    return res.status(200).json({
      success: true,
      date: today,
      brief: briefJson,
      brief_saved: true,
      newsletter: newsletterResult,
      log,
    });
  } catch (e) {
    log.push(`FATAL: ${e.message}`);
    return res.status(500).json({ error: e.message, log });
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
<div style="padding:24px 28px;">
<div style="font-family:monospace;font-size:11px;color:#C9921F;margin-bottom:16px;letter-spacing:0.1em;">MARKET SNAPSHOT</div>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td width="50%" style="padding:14px 0;border-bottom:1px solid rgba(201,146,31,0.08);"><span style="font-family:monospace;font-size:10px;color:#6b7280;">GOLD</span><br><span style="font-size:20px;color:#F0B840;font-weight:bold;">$${brief.gold_price||'—'}</span></td>
<td width="50%" style="padding:14px 0;border-bottom:1px solid rgba(201,146,31,0.08);"><span style="font-family:monospace;font-size:10px;color:#6b7280;">SILVER</span><br><span style="font-size:20px;color:#C0C0C0;font-weight:bold;">$${brief.silver_price||'—'}</span></td></tr>
<tr><td style="padding:14px 0;border-bottom:1px solid rgba(201,146,31,0.08);"><span style="font-family:monospace;font-size:10px;color:#6b7280;">DXY</span><br><span style="font-size:18px;color:#EDE8DC;">${brief.dxy||'—'}</span></td>
<td style="padding:14px 0;border-bottom:1px solid rgba(201,146,31,0.08);"><span style="font-family:monospace;font-size:10px;color:#6b7280;">BRENT OIL</span><br><span style="font-size:18px;color:#EDE8DC;">$${brief.oil_brent||'—'}</span></td></tr>
<tr><td style="padding:14px 0;border-bottom:1px solid rgba(201,146,31,0.08);"><span style="font-family:monospace;font-size:10px;color:#6b7280;">10Y YIELD</span><br><span style="font-size:18px;color:#EDE8DC;">${brief.ten_year_yield||'—'}%</span></td>
<td style="padding:14px 0;border-bottom:1px solid rgba(201,146,31,0.08);"><span style="font-family:monospace;font-size:10px;color:#6b7280;">S&P 500</span><br><span style="font-size:18px;color:#EDE8DC;">${brief.sp500||'—'}</span></td></tr>
<tr><td style="padding:14px 0;"><span style="font-family:monospace;font-size:10px;color:#6b7280;">WAR STATUS</span><br><span style="font-size:13px;color:#f59e0b;line-height:1.4;">${brief.war_status||'—'}</span></td>
<td style="padding:14px 0;"><span style="font-family:monospace;font-size:10px;color:#6b7280;">WARSH STATUS</span><br><span style="font-size:13px;color:#EDE8DC;line-height:1.4;">${brief.warsh_status||'—'}</span></td></tr></table>

<div style="text-align:center;padding:20px 0;margin-top:8px;border-top:1px solid rgba(201,146,31,0.1);border-bottom:1px solid rgba(201,146,31,0.1);">
<div style="font-family:monospace;font-size:10px;color:#6b7280;margin-bottom:8px;">SCENARIO PROBABILITIES</div>
<span style="color:#f59e0b;font-family:monospace;font-size:20px;font-weight:bold;">${brief.scenario_a_prob||0}%</span><span style="color:#6b7280;font-size:11px;"> War </span><span style="color:#ef4444;font-family:monospace;font-size:20px;font-weight:bold;margin:0 16px;">${brief.scenario_b_prob||0}%</span><span style="color:#6b7280;font-size:11px;"> Escalation </span><span style="color:#22c55e;font-family:monospace;font-size:20px;font-weight:bold;margin:0 16px;">${brief.scenario_c_prob||0}%</span><span style="color:#6b7280;font-size:11px;"> Peace</span></div>

${alertHtml}

<div style="background:rgba(201,146,31,0.08);border:1px solid rgba(201,146,31,0.2);border-radius:6px;padding:20px 24px;margin:24px 0;">
<div style="font-family:monospace;font-size:11px;color:#C9921F;margin-bottom:12px;letter-spacing:0.1em;">TODAY'S VERDICT</div>
<p style="margin:0;font-size:14px;color:#EDE8DC;line-height:1.7;">${brief.verdict||'No verdict.'}</p></div>

<div style="font-family:monospace;font-size:11px;color:#C9921F;margin:28px 0 12px;letter-spacing:0.1em;">THESIS SCORECARD</div>
<table width="100%" cellpadding="0" cellspacing="0">${thesisRows}</table>

<div style="font-family:monospace;font-size:11px;color:#C9921F;margin:28px 0 12px;letter-spacing:0.1em;">ACTIVE SIGNALS</div>
<ul style="margin:0;padding:0 0 0 16px;">${signals}</ul>

<div style="font-family:monospace;font-size:11px;color:#C9921F;margin:28px 0 12px;letter-spacing:0.1em;">HEADLINES</div>
${headlines}
</div>
<div style="padding:16px 28px;border-top:1px solid rgba(201,146,31,0.12);text-align:center;">
<p style="margin:0 0 10px;font-family:monospace;font-size:10px;color:#C9921F;letter-spacing:0.1em;">SHARE THIS BRIEF</p>
<a href="https://wa.me/?text=${encodeURIComponent(`KRM Daily Brief — ${d}\nGold $${brief.gold_price||''} | Silver $${brief.silver_price||''} | DXY ${brief.dxy||''}\n\nSubscribe free: https://khurrambadar.com/daily`)}" style="display:inline-block;padding:6px 14px;margin:3px;background:#25D366;color:#fff;text-decoration:none;border-radius:5px;font-family:monospace;font-size:11px;font-weight:bold;">WhatsApp</a>
<a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(`KRM Daily Brief — ${d}\nGold $${brief.gold_price||''} | Silver $${brief.silver_price||''} | DXY ${brief.dxy||''}\n\nSubscribe: https://khurrambadar.com/daily`)}" style="display:inline-block;padding:6px 14px;margin:3px;background:#1DA1F2;color:#fff;text-decoration:none;border-radius:5px;font-family:monospace;font-size:11px;font-weight:bold;">X / Twitter</a>
<a href="https://khurrambadar.com/daily" style="display:inline-block;padding:6px 14px;margin:3px;background:rgba(201,146,31,0.15);color:#C9921F;text-decoration:none;border-radius:5px;font-family:monospace;font-size:11px;border:1px solid rgba(201,146,31,0.3);">View on Web</a>
<p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">Forward this email or share the link — <a href="https://khurrambadar.com/daily" style="color:#C9921F;">subscribe free</a></p>
</div>
<div style="padding:12px 28px;border-top:1px solid rgba(201,146,31,0.08);text-align:center;">
<p style="margin:0 0 6px;font-size:11px;color:#6b7280;font-style:italic;">Educational only — not financial advice.</p>
<a href="${unsubUrl}" style="color:#6b7280;font-size:11px;text-decoration:underline;">Unsubscribe</a>
<br><a href="https://khurrambadar.com" style="color:#C9921F;font-size:12px;text-decoration:none;margin-top:6px;display:inline-block;">khurrambadar.com</a>
</div></div></body></html>`;
}
