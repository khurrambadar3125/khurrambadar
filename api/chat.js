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
    const allowed = ['claude-3-haiku-20240307'];
    if (!allowed.includes(body.model)) {
      return new Response(JSON.stringify({ error: 'Model not allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cap max_tokens to prevent abuse
    body.max_tokens = Math.min(body.max_tokens || 1024, 2048);

    // Convert system prompt to array format for prompt caching
    // Block 1: Full Knowledge Base (CACHED — rarely changes, ~55K tokens)
    // Block 2: System prompt from browser (identity, voice, VIP, live context)
    // Caching means Block 1 is sent once, then read from cache at 90% discount
    const systemText = (typeof body.system === 'string') ? body.system : '';

    const lastMsg = (body.messages && body.messages.length > 0)
      ? body.messages[body.messages.length - 1].content.toLowerCase() : '';
    const marketKeywords = ['gold','silver','dxy','dollar','oil','fed','fomc','rate','yield',
      'treasury','bond','market','trade','titan','signal','thesis','metals','copper',
      'bitcoin','btc','crypto','eth','war','iran','ceasefire','inflation','deflation',
      'recession','bull','bear','comex','lbma','price','chart','analysis','forecast',
      'predict','invest','portfolio','risk','hedge','commodity','energy','wheat','corn',
      'platinum','palladium','carry trade','boj','ecb','central bank','qe','qt',
      'money print','liquidity','m2','vitalik','bilal','pmex','khurram zafar',
      'proprietary','research','verdict','scorecard','signal'];
    const needsKB = marketKeywords.some(kw => lastMsg.includes(kw));

    // Build system as array for caching
    const systemBlocks = [];

    if (needsKB) {
      // Inject the INTELLIGENCE sections of KB (lessons, patterns, predictions,
      // theses, signals, compounding engine, live context) but skip the verbose
      // daily snapshots and historical narrative to stay under 50K token limit.
      // The intelligence IS the value — not the raw daily logs.
      let smartKB = '';

      // 1. Thesis framework + signal matrix (~3K tokens)
      const thesisStart = KNOWLEDGE_BASE.indexOf('15. DAILY MARKET INTELLIGENCE');
      const thesisEnd = KNOWLEDGE_BASE.indexOf('16. BREAKING');
      if (thesisStart > -1 && thesisEnd > -1) {
        smartKB += KNOWLEDGE_BASE.substring(thesisStart, thesisEnd);
      }

      // 2. Lessons (all 30 — the accumulated rules, ~8K tokens)
      const lessonStart = KNOWLEDGE_BASE.indexOf('LESSON 001');
      const lessonEnd = KNOWLEDGE_BASE.indexOf('=== COMPLETE ASSESSMENT HISTORY');
      if (lessonStart > -1) {
        const end = lessonEnd > -1 ? lessonEnd : lessonStart + 20000;
        smartKB += '\n\n' + KNOWLEDGE_BASE.substring(lessonStart, Math.min(end, lessonStart + 20000));
      }

      // 3. Patterns + Predictions (~4K tokens)
      const patternStart = KNOWLEDGE_BASE.indexOf('=== PATTERNS DETECTED');
      const evalStart = KNOWLEDGE_BASE.indexOf('=== EVALUATION RULES');
      if (patternStart > -1) {
        const end = evalStart > -1 ? evalStart + 2000 : patternStart + 8000;
        smartKB += '\n\n' + KNOWLEDGE_BASE.substring(patternStart, Math.min(end, patternStart + 10000));
      }

      // 4. Compounding Intelligence Engine (~5K tokens)
      const engineStart = KNOWLEDGE_BASE.indexOf('21. THE COMPOUNDING INTELLIGENCE ENGINE');
      if (engineStart > -1) {
        smartKB += '\n\n' + KNOWLEDGE_BASE.substring(engineStart, Math.min(engineStart + 12000, KNOWLEDGE_BASE.length));
      }

      // 5. Latest daily snapshots (last 5 days only, ~3K tokens)
      const apr1Idx = KNOWLEDGE_BASE.indexOf('APR 1 (WED');
      const predIdx = KNOWLEDGE_BASE.indexOf('PRED_001 RESULT');
      if (apr1Idx > -1 && predIdx > -1) {
        smartKB += '\n\nRECENT DAILY SNAPSHOTS:\n' + KNOWLEDGE_BASE.substring(apr1Idx, predIdx + 2000);
      }

      // 6. Scenario probabilities (latest, ~1K tokens)
      const scenarioStart = KNOWLEDGE_BASE.indexOf('=== REVISED SCENARIO PROBABILITIES (post-reading Apr');
      if (scenarioStart > -1) {
        smartKB += '\n\n' + KNOWLEDGE_BASE.substring(scenarioStart, Math.min(scenarioStart + 2000, KNOWLEDGE_BASE.length));
      }

      if (smartKB.length > 0) {
        systemBlocks.push({
          type: 'text',
          text: smartKB,
          cache_control: { type: 'ephemeral' },
        });
      }
    }

    // Block 2: System prompt (identity, voice, VIP recognition, live context)
    if (systemText) {
      systemBlocks.push({
        type: 'text',
        text: systemText,
      });
    }

    // Replace string system with array system
    body.system = systemBlocks.length > 0 ? systemBlocks : undefined;

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
