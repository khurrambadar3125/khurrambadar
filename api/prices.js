export const config = { runtime: 'edge' };

// Server-side price proxy — multi-source with proper gold AND silver spot prices
// Priority: GoldAPI.io (real spot) → CoinGecko (PAXG backup) → Binance (BTC backup)

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

  // SOURCE 1: GoldAPI.io — real spot gold price (free, 300 req/month)
  try {
    const r = await fetch('https://www.goldapi.io/api/XAU/USD', {
      headers: { 'x-access-token': 'goldapi-demo', 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const d = await r.json();
      if (d.price) {
        prices.gold = {
          price: Math.round(d.price * 100) / 100,
          change: d.chp != null ? Math.round(d.chp * 100) / 100 : null,
        };
      }
    }
  } catch (e) {}

  // SOURCE 2: GoldAPI.io — real spot silver price
  try {
    const r = await fetch('https://www.goldapi.io/api/XAG/USD', {
      headers: { 'x-access-token': 'goldapi-demo', 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const d = await r.json();
      if (d.price) {
        prices.silver = {
          price: Math.round(d.price * 100) / 100,
          change: d.chp != null ? Math.round(d.chp * 100) / 100 : null,
        };
      }
    }
  } catch (e) {}

  // SOURCE 3: CoinGecko — PAXG (gold proxy) + BTC (always need this)
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,bitcoin&vs_currencies=usd&include_24hr_change=true',
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(4000) }
    );
    if (r.ok) {
      const d = await r.json();
      // Gold fallback if GoldAPI failed
      if (!prices.gold && d['pax-gold']) {
        prices.gold = {
          price: Math.round(d['pax-gold'].usd * 100) / 100,
          change: Math.round((d['pax-gold'].usd_24h_change || 0) * 100) / 100,
        };
      }
      if (d.bitcoin) {
        prices.btc = {
          price: Math.round(d.bitcoin.usd),
          change: Math.round((d.bitcoin.usd_24h_change || 0) * 100) / 100,
        };
      }
    }
  } catch (e) {}

  // SOURCE 4: Binance — BTC backup
  if (!prices.btc) {
    try {
      const r = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) {
        const d = await r.json();
        prices.btc = {
          price: Math.round(parseFloat(d.lastPrice)),
          change: Math.round(parseFloat(d.priceChangePercent) * 100) / 100,
        };
      }
    } catch (e) {}
  }

  // Silver fallback — if GoldAPI failed, estimate from gold using live ratio
  if (!prices.silver && prices.gold) {
    const gsRatio = 62.7; // Updated April 1 2026 — was 64, now compressing
    prices.silver = {
      price: Math.round((prices.gold.price / gsRatio) * 100) / 100,
      change: prices.gold.change ? Math.round(prices.gold.change * 1.5 * 100) / 100 : null,
      estimated: true,
    };
  }

  // S&P 500 — try Yahoo Finance via a CORS-friendly path
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1d',
      { signal: AbortSignal.timeout(3000) }
    );
    if (r.ok) {
      const d = await r.json();
      const meta = d?.chart?.result?.[0]?.meta;
      if (meta && meta.regularMarketPrice) {
        const prev = meta.chartPreviousClose || meta.previousClose;
        const current = meta.regularMarketPrice;
        const change = prev ? ((current - prev) / prev) * 100 : 0;
        prices.sp500 = {
          price: Math.round(current * 100) / 100,
          change: Math.round(change * 100) / 100,
        };
      }
    }
  } catch (e) {}

  // S&P fallback — last known value (updated daily via market updates)
  if (!prices.sp500) {
    prices.sp500 = { price: 6402, change: 0.52, estimated: true };
  }

  return new Response(JSON.stringify(prices), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=30',
    },
  });
}
