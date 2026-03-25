export const config = { runtime: 'edge' };

// Server-side price proxy for assets that block browser CORS (Silver, S&P 500)
// Also fetches Gold and BTC as backup if client-side APIs fail

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const prices = {
    gold: null,
    silver: null,
    btc: null,
    sp500: null,
    updated: new Date().toISOString(),
  };

  // Silver futures (SI=F) via Yahoo Finance — no CORS issue server-side
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=1d&range=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (r.ok) {
      const d = await r.json();
      const m = d.chart?.result?.[0]?.meta;
      if (m) {
        prices.silver = {
          price: Math.round(m.regularMarketPrice * 100) / 100,
          prev: Math.round(m.chartPreviousClose * 100) / 100,
          change: Math.round(((m.regularMarketPrice - m.chartPreviousClose) / m.chartPreviousClose) * 10000) / 100,
        };
      }
    }
  } catch (e) {}

  // S&P 500 (^GSPC) via Yahoo Finance
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (r.ok) {
      const d = await r.json();
      const m = d.chart?.result?.[0]?.meta;
      if (m) {
        prices.sp500 = {
          price: Math.round(m.regularMarketPrice * 100) / 100,
          prev: Math.round(m.chartPreviousClose * 100) / 100,
          change: Math.round(((m.regularMarketPrice - m.chartPreviousClose) / m.chartPreviousClose) * 10000) / 100,
        };
      }
    }
  } catch (e) {}

  // Gold futures (GC=F) via Yahoo Finance — backup for client-side PAXG
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (r.ok) {
      const d = await r.json();
      const m = d.chart?.result?.[0]?.meta;
      if (m) {
        prices.gold = {
          price: Math.round(m.regularMarketPrice * 100) / 100,
          prev: Math.round(m.chartPreviousClose * 100) / 100,
          change: Math.round(((m.regularMarketPrice - m.chartPreviousClose) / m.chartPreviousClose) * 10000) / 100,
        };
      }
    }
  } catch (e) {}

  // BTC via Yahoo Finance — backup for client-side Binance/CoinGecko
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1d&range=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (r.ok) {
      const d = await r.json();
      const m = d.chart?.result?.[0]?.meta;
      if (m) {
        prices.btc = {
          price: Math.round(m.regularMarketPrice),
          prev: Math.round(m.chartPreviousClose),
          change: Math.round(((m.regularMarketPrice - m.chartPreviousClose) / m.chartPreviousClose) * 10000) / 100,
        };
      }
    }
  } catch (e) {}

  return new Response(JSON.stringify(prices), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=30',
    },
  });
}
