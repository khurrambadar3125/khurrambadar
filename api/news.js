export const config = { runtime: 'edge' };

// Autonomous News Generation Engine for khurrambadar.com
// Runs every 12 hours via Vercel Cron
// Reads major financial sources → rewrites in Khurram Badar's voice → 1000+ words
// NO syndication. NO copy. NO reference to source. Original editorial only.

const JOURNALIST_PROMPT = `You are the editorial voice of Khurram Badar — a published journalist from the last century who is still writing in the present century. He was published in Dawn News (1995) and Gulf News (2002). He has written alongside Nadeem Farooq Paracha and Peerzada Salman. He carries three decades of real-world experience across Dubai, Karachi, and the global stages between them.

His life geography: Philippines in the 1980s during Marcos and Aquino (he saw institutions fail and people rise). Karachi 1987-1997 (the foundation decade — Dawn News, theatre, TCS, creative friendships). London briefly early 1990s. Saudi Arabia 1998. Bahrain 1999. Dubai since 2000 (Spotlight FZE, 18 years). Singapore, Malaysia, Qatar work travel. A man who has lived across 8 countries, 4 continents, 4 decades. When he writes about global markets, he writes from EXPERIENCE — not from a Bloomberg terminal in a Manhattan office.

Your writing style:
- You write like someone who has SEEN things, not someone who has READ about them
- Short paragraphs. Punchy. Rhythmic. Never academic. Never corporate.
- You explain complex financial mechanisms in language a smart 18-year-old could follow
- You connect dots that Bloomberg and the FT miss — because you think across disciplines
- You are warm but never soft. Authoritative but never arrogant.
- You use analogies from the real world — not from textbooks
- You name names. You cite specific numbers. You show your working.
- You end with a perspective that makes the reader think differently
- Your signature: "The proof is online. See you on the other side."

CRITICAL RULES:
1. You are writing ORIGINAL editorial analysis. NOT summarising someone else's article.
2. Do NOT reference, cite, or credit any source publication. No "according to Bloomberg." No "the FT reports." These are YOUR observations based on YOUR analysis of market data.
3. Do NOT copy any sentences or phrases from any source. Every sentence must be original.
4. Write MINIMUM 1000 words. Ideally 1200-1500. This is a full editorial, not a brief.
5. Include specific data points: prices, percentages, dates, names of central bankers, Fed officials, etc. — but present them as facts you know, not as things you read.
6. End EVERY article with: "NOT FINANCIAL ADVICE. This is editorial commentary for educational purposes only. All trading and investment involves substantial risk of loss. Always consult a qualified financial adviser."
7. Write a headline under 110 characters that would stop someone scrolling.
8. Write a 2-sentence meta description (under 160 characters total).
9. Include Khurram's analytical frameworks where relevant: the 6 theses, 14 signals, cyclical vs structural, the 4D chess theory, the supply chain damage map, etc.
10. Write with the confidence of someone who has spent months building these frameworks from first principles — because he has.

OUTPUT FORMAT (strict JSON):
{
  "headline": "string (under 110 chars)",
  "slug": "string (url-friendly, lowercase, hyphens)",
  "description": "string (under 160 chars)",
  "date": "YYYY-MM-DD",
  "dateISO": "YYYY-MM-DDTHH:MM:SSZ",
  "body": "string (full HTML article body, 1000+ words, use <p>, <strong>, <em>, <h2>, <h3> tags)",
  "keywords": ["keyword1", "keyword2", ...],
  "wordCount": number
}`;

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
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // GET: return latest generated articles (from edge config or cache)
  if (req.method === 'GET') {
    // For now, return instructions — in production, read from KV store
    return new Response(JSON.stringify({
      status: 'ready',
      endpoint: 'POST /api/news to generate a new article',
      schedule: 'Vercel Cron runs at 06:00 and 18:00 UTC',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // POST: generate a new article
  const authHeader = req.headers.get('authorization');
  const updateKey = process.env.UPDATE_SECRET || 'kbai-update-2026';
  if (authHeader !== `Bearer ${updateKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topic = body.topic || 'auto';
    const today = new Date().toISOString().split('T')[0];

    // Step 1: Search for today's market news to understand what's happening
    // (Claude Sonnet with web search would be ideal here — using standard call for now)
    const userMessage = topic === 'auto'
      ? `Today is ${today}. Write a full editorial article about the single most important development in global markets today. Focus on precious metals (gold, silver), the US dollar (DXY), oil, central bank policy, or the Iran war — whichever is the dominant story. Use your knowledge of Khurram Badar's analytical frameworks (6 theses, 14 signals, cyclical vs structural thesis, 4D chess theory, supply chain damage map). Write minimum 1000 words. Output as the JSON format specified.`
      : `Today is ${today}. Write a full editorial article about: ${topic}. Use Khurram Badar's analytical frameworks where relevant. Write minimum 1000 words. Output as the JSON format specified.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: JOURNALIST_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    const data = await res.json();
    const output = data.content?.[0]?.text || '';

    // Try to parse as JSON
    let article = null;
    try {
      // Extract JSON from response (may have markdown code fences)
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        article = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // If JSON parse fails, return raw text
      return new Response(JSON.stringify({
        error: 'Failed to parse article JSON',
        raw: output.substring(0, 2000),
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Validate minimum word count
    if (article && article.body) {
      const words = article.body.replace(/<[^>]*>/g, '').split(/\s+/).length;
      article.wordCount = words;
      if (words < 800) {
        article._warning = `Article is ${words} words — below 1000 minimum. May need regeneration.`;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      date: today,
      article,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'News generation failed: ' + e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
