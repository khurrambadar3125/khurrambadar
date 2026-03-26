export const config = { runtime: 'edge' };

// KRM Learning Loop Memory System
// Stores daily snapshots, tracks thesis changes, detects patterns across days
// Uses Vercel KV (or fallback to in-memory for demo) for persistence

// In-memory fallback store (replaced by Vercel KV in production)
const MEMORY_STORE = {
  snapshots: [],    // Daily market snapshots (last 90 days)
  thesisLog: [],    // Every thesis status change with date + reason
  signals: [],      // Signal trigger history
  patterns: [],     // AI-detected patterns
  predictions: [],  // Predictions made + outcomes for accuracy tracking
  learnings: [],    // Lessons learned from prediction accuracy
};

// Helper: get today's date string
function today() { return new Date().toISOString().split('T')[0]; }

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const authHeader = req.headers.get('authorization');
  const updateKey = process.env.UPDATE_SECRET || 'kbai-update-2026';

  // Auth for POST
  if (req.method === 'POST' && authHeader !== `Bearer ${updateKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'status';

  // ═══ GET: Read memory ═══
  if (req.method === 'GET') {
    if (action === 'status') {
      return json({
        total_snapshots: MEMORY_STORE.snapshots.length,
        total_thesis_changes: MEMORY_STORE.thesisLog.length,
        total_signals: MEMORY_STORE.signals.length,
        total_patterns: MEMORY_STORE.patterns.length,
        total_predictions: MEMORY_STORE.predictions.length,
        total_learnings: MEMORY_STORE.learnings.length,
        last_snapshot: MEMORY_STORE.snapshots[MEMORY_STORE.snapshots.length - 1]?.date || 'none',
      });
    }
    if (action === 'snapshots') return json(MEMORY_STORE.snapshots.slice(-30));
    if (action === 'thesislog') return json(MEMORY_STORE.thesisLog.slice(-50));
    if (action === 'patterns') return json(MEMORY_STORE.patterns.slice(-20));
    if (action === 'learnings') return json(MEMORY_STORE.learnings.slice(-20));
    if (action === 'context') {
      // Build the full memory context string for injection into AI prompts
      return json({ context: buildMemoryContext() });
    }
  }

  // ═══ POST: Write to memory ═══
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));

    if (action === 'snapshot') {
      // Store daily market snapshot
      const snapshot = {
        date: body.date || today(),
        timestamp: new Date().toISOString(),
        gold: body.gold,
        silver: body.silver,
        dxy: body.dxy,
        oil_brent: body.oil_brent,
        oil_wti: body.oil_wti,
        yield_10y: body.yield_10y,
        sp500: body.sp500,
        btc: body.btc,
        war_status: body.war_status,
        warsh_status: body.warsh_status,
        theses: body.theses, // { A: 'INTACT', B: 'ACTIVE', ... }
        signals_triggered: body.signals_triggered, // [4, 6, 7]
        verdict: body.verdict,
        headlines: body.headlines,
      };
      MEMORY_STORE.snapshots.push(snapshot);
      // Keep last 90 days
      if (MEMORY_STORE.snapshots.length > 90) MEMORY_STORE.snapshots.shift();

      // Auto-detect thesis changes
      if (MEMORY_STORE.snapshots.length >= 2) {
        const prev = MEMORY_STORE.snapshots[MEMORY_STORE.snapshots.length - 2];
        const curr = snapshot;
        if (prev.theses && curr.theses) {
          for (const key of Object.keys(curr.theses)) {
            if (prev.theses[key] !== curr.theses[key]) {
              MEMORY_STORE.thesisLog.push({
                date: curr.date,
                thesis: key,
                from: prev.theses[key],
                to: curr.theses[key],
                gold_at_change: curr.gold,
                dxy_at_change: curr.dxy,
              });
            }
          }
        }
      }

      return json({ stored: true, total_snapshots: MEMORY_STORE.snapshots.length });
    }

    if (action === 'evaluate') {
      // Use AI to evaluate current data against memory and produce insights
      if (!apiKey) return json({ error: 'API key not configured' });

      const memoryContext = buildMemoryContext();
      const currentData = body.current_data || 'No current data provided';

      const evalPrompt = `You are the KBAI Memory Analyst. You have access to historical market data stored in the learning loop memory. Your job is to compare today's data against historical patterns, evaluate thesis accuracy, detect emerging patterns, and produce actionable insights.

MEMORY (last 30 days of stored snapshots + thesis changes):
${memoryContext}

TODAY'S LIVE DATA:
${currentData}

TASKS:
1. COMPARE today's data vs the last 7 days. What changed? What's the trend direction?
2. THESIS ACCURACY: Look at thesis status changes over time. Which theses have been consistently correct? Which are under stress?
3. PATTERN DETECTION: Are there any recurring patterns? (e.g., gold always bounces after 3+ day losing streaks, DXY reverts from war premium within X days, oil direction predicts gold direction 2 days later)
4. PREDICTION REVIEW: If any previous predictions were made, compare them against what actually happened. Score accuracy.
5. NEW INSIGHTS: What is the memory telling us that a single-day snapshot would miss? What multi-day patterns are forming?
6. FORWARD SIGNAL: Based on the accumulated data, what is the strongest signal for the next 48 hours?

OUTPUT as structured JSON:
{
  "date": "YYYY-MM-DD",
  "trend_7day": { "gold": "direction", "dxy": "direction", "oil": "direction" },
  "thesis_accuracy": { "A": "score/notes", "B": "score/notes", ... },
  "patterns_detected": ["pattern 1", "pattern 2"],
  "prediction_accuracy": { "correct": N, "wrong": N, "pending": N },
  "new_insights": ["insight 1", "insight 2"],
  "forward_signal": "strongest signal for next 48 hours",
  "confidence": "HIGH/MEDIUM/LOW"
}`;

      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            system: evalPrompt,
            messages: [{ role: 'user', content: 'Evaluate the memory against today\'s data and produce your analysis.' }],
          }),
        });

        const data = await res.json();
        const evaluation = data.content?.[0]?.text || '';

        // Store the evaluation as a learning
        MEMORY_STORE.learnings.push({
          date: today(),
          evaluation: evaluation.substring(0, 2000),
        });

        // Store any patterns detected
        try {
          const parsed = JSON.parse(evaluation);
          if (parsed.patterns_detected) {
            for (const p of parsed.patterns_detected) {
              MEMORY_STORE.patterns.push({ date: today(), pattern: p });
            }
          }
        } catch (e) { /* evaluation may not be clean JSON */ }

        return json({ evaluation, memory_size: MEMORY_STORE.snapshots.length });
      } catch (e) {
        return json({ error: 'Evaluation failed: ' + e.message });
      }
    }

    if (action === 'predict') {
      // Store a prediction for future accuracy tracking
      MEMORY_STORE.predictions.push({
        date: today(),
        prediction: body.prediction,
        target_date: body.target_date,
        asset: body.asset,
        direction: body.direction,
        target_price: body.target_price,
        confidence: body.confidence,
        outcome: null, // filled in later when we check accuracy
      });
      return json({ stored: true, total_predictions: MEMORY_STORE.predictions.length });
    }

    if (action === 'signal') {
      // Log a signal trigger
      MEMORY_STORE.signals.push({
        date: today(),
        signal_number: body.signal_number,
        signal_name: body.signal_name,
        trigger_value: body.trigger_value,
        market_context: body.market_context,
      });
      return json({ stored: true });
    }
  }

  return json({ error: 'Unknown action: ' + action });
}

// Build the memory context string for AI consumption
function buildMemoryContext() {
  const last30 = MEMORY_STORE.snapshots.slice(-30);
  const recentThesisChanges = MEMORY_STORE.thesisLog.slice(-20);
  const recentPatterns = MEMORY_STORE.patterns.slice(-10);
  const recentLearnings = MEMORY_STORE.learnings.slice(-5);

  let ctx = '=== MARKET MEMORY (Last 30 Snapshots) ===\n';
  for (const s of last30) {
    ctx += `${s.date}: Gold $${s.gold} | DXY ${s.dxy} | Oil $${s.oil_brent} | 10Y ${s.yield_10y}% | War: ${s.war_status} | Signals: [${s.signals_triggered?.join(',') || 'none'}]\n`;
  }

  ctx += '\n=== THESIS STATUS CHANGES ===\n';
  for (const t of recentThesisChanges) {
    ctx += `${t.date}: Thesis ${t.thesis} changed ${t.from} → ${t.to} (Gold was $${t.gold_at_change}, DXY was ${t.dxy_at_change})\n`;
  }

  ctx += '\n=== DETECTED PATTERNS ===\n';
  for (const p of recentPatterns) {
    ctx += `${p.date}: ${p.pattern}\n`;
  }

  ctx += '\n=== RECENT LEARNINGS ===\n';
  for (const l of recentLearnings) {
    ctx += `${l.date}: ${l.evaluation?.substring(0, 300)}...\n`;
  }

  return ctx;
}

function json(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
