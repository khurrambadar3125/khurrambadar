export const config = { runtime: 'edge' };

// Autonomous Daily Update Agent for KBAI
// Runs on schedule or manual trigger — fetches data, evaluates theses, scores signals

const UPDATE_AGENT_PROMPT = `ROLE: You are the Autonomous Daily Update Agent for khurrambadar.com. Your job is to search the web, collect live market data, evaluate all analytical theses, and produce a structured daily update block. You output ONLY the structured update. No conversational text. No preamble.

STEP 1 — SEARCH FOR LIVE DATA
Search for today's live values. Prioritise: Trading Economics, Reuters, Bloomberg, CNBC, Investing.com.

REQUIRED DATA: gold spot USD/oz, silver spot USD/oz, gold-silver ratio, DXY index, USD/JPY, EUR/USD, US 10Y yield, US 30Y yield, Japan 10Y yield, TIPS 10Y real yield, Fed funds rate, Fed balance sheet size, BOJ rate, Brent crude, WTI crude, Hormuz status, S&P 500, VIX, Nikkei 225, Bitcoin, Iran war status, Warsh confirmation status, top 3 headlines, latest CPI, COMEX registered silver inventory, Shanghai gold premium.

STEP 2 — EVALUATE ALL 6 THESES (INTACT/STRESS-TESTED/BROKEN/PENDING/PAUSED)
A — DXY Floor 96-97: INTACT if DXY<102 + war premium visible + BOJ hiking. BROKEN if DXY>104 no war.
B — 4D Chess: INTACT if Warsh blocked + Fed expanding. BROKEN if Warsh confirmed or QT restarts.
C — BOJ Path: INTACT if BOJ hiking cycle active. BROKEN if BOJ reverses.
D — Gold Bull $5,500-6,300: INTACT if CB buying + $4,200 EMA holds. STRESS-TESTED if gold<$4,200.
E — Peace Dividend: PENDING if war active. ACTIVATED on ceasefire.
F — Cyclical vs Structural: Classify today's move.

STEP 3 — SCORE ALL 14 SIGNALS (TRIGGERED/APPROACHING/CLEAR)
1:DXY<98  2:DXY>101  3:10Y<4.0%  4:10Y>4.5%  5:Oil<$80  6:Oil>$110  7:Ceasefire  8:BOJ hike  9:Fed cut signal  10:Warsh confirmed  11:G/S ratio>75  12:Shanghai premium>$10  13:COMEX silver<80Moz  14:Gold+Dollar both up

STEP 4 — VERDICT (4 sentences max, plain English)
STEP 5 — UPDATE SCENARIO PROBABILITIES (must sum to 100%)

OUTPUT FORMAT — Use EXACTLY this structure:
=== KBAI_DAILY_UPDATE_START ===
UPDATE_DATE: [YYYY-MM-DD]
UPDATE_TIME: [HH:MM UTC]
--- LIVE DATA ---
GOLD: $[X] ([change])
SILVER: $[X] ([change])
GS_RATIO: [X]:1
DXY: [X] ([change])
USD_JPY: [X]
EUR_USD: [X]
US_10Y: [X]%
US_30Y: [X]%
JP_10Y: [X]%
REAL_YIELD: [X]%
FED_RATE: [X]%
FED_BS: $[X]T
BOJ_RATE: [X]%
BRENT: $[X]
WTI: $[X]
HORMUZ: [OPEN/PARTIAL/CLOSED]
SP500: [X] ([change])
VIX: [X]
NIKKEI: [X]
BTC: $[X]
COMEX_AG: [X]M oz
--- STATUS ---
WAR: [STATUS] Day [X]
WARSH: [STATUS]
H1: [headline]
H2: [headline]
H3: [headline]
--- THESES ---
A: [STATUS] — [reason]
B: [STATUS] — [reason]
C: [STATUS] — [reason]
D: [STATUS] — [reason]
E: [STATUS] — [reason]
F: [STATUS] — [reason]
--- SIGNALS ---
[List only TRIGGERED or APPROACHING signals with number and name]
--- VERDICT ---
[4 sentences max]
--- SCENARIOS ---
A: [X]% War Drags — Gold $[X]-$[X], DXY [X]-[X]
B: [X]% Escalation — Gold $[X]-$[X], DXY [X]-[X]
C: [X]% Ceasefire — Gold $[X]-$[X], DXY [X]-[X]
--- ALERTS ---
RED_ALERT: [YES/NO] [reason if yes]
GREEN_LIGHT: [YES/NO] [reason if yes]
PEACE_IMMINENT: [YES/NO]
=== KBAI_DAILY_UPDATE_END ===`;

const EVENT_MONITOR_PROMPT = `You are the KBAI Event Monitor. Scan headlines for high-impact triggers. Output ONLY JSON.
Search: 'Iran ceasefire 2026', 'Kevin Warsh Senate confirmation', 'oil price today', 'gold price today', 'BOJ rate decision', 'Federal Reserve rate cut'.
Output JSON: { scan_time, ceasefire_detected, warsh_confirmed, oil_above_120, gold_below_4200, boj_hiked, fed_cut_signal, any_trigger_fired, triggers: [] }`;

// Validation rules
function validateUpdate(text) {
  const errors = [];
  const goldMatch = text.match(/GOLD:\s*\$([0-9,]+)/);
  if (goldMatch) {
    const price = parseInt(goldMatch[1].replace(/,/g, ''));
    if (price < 2000 || price > 8000) errors.push(`Gold price ${price} out of range`);
  }
  const dxyMatch = text.match(/DXY:\s*([0-9.]+)/);
  if (dxyMatch) {
    const dxy = parseFloat(dxyMatch[1]);
    if (dxy < 80 || dxy > 120) errors.push(`DXY ${dxy} out of range`);
  }
  const scenarioProbs = text.match(/(\d+)%\s*(War|Escalation|Ceasefire)/g);
  if (scenarioProbs && scenarioProbs.length === 3) {
    const sum = scenarioProbs.reduce((s, m) => s + parseInt(m), 0);
    if (sum < 95 || sum > 105) errors.push(`Scenario probs sum to ${sum}, not ~100`);
  }
  return errors;
}

export default async function handler(req) {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const authHeader = req.headers.get('authorization');
  const updateKey = process.env.UPDATE_SECRET || 'kbai-update-2026';

  // Auth check — require secret for POST (trigger update)
  if (req.method === 'POST') {
    if (authHeader !== `Bearer ${updateKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const mode = body.mode || 'full'; // 'full' or 'monitor'
    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = mode === 'monitor' ? EVENT_MONITOR_PROMPT : UPDATE_AGENT_PROMPT;
    const userMessage = mode === 'monitor'
      ? `Today is ${today}. Scan for trigger events now.`
      : `Today is ${today}. Run the full daily update. Search for all data points. Output ONLY the structured block.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    const data = await res.json();
    const output = data.content?.[0]?.text || '';

    // Validate if full update
    let validation = { valid: true, errors: [] };
    if (mode === 'full') {
      const errors = validateUpdate(output);
      validation = { valid: errors.length === 0, errors };
    }

    return new Response(JSON.stringify({
      mode,
      date: today,
      timestamp: new Date().toISOString(),
      validation,
      output,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Update agent error: ' + e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
