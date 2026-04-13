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
    oil: null,
    dxy: null,
    yield10y: null,
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

  // OIL (Brent) — Yahoo Finance server-side
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=1d',
      { signal: AbortSignal.timeout(3000) }
    );
    if (r.ok) {
      const d = await r.json();
      const meta = d && d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta;
      if (meta && meta.regularMarketPrice) {
        const prev = meta.chartPreviousClose || meta.previousClose;
        const current = meta.regularMarketPrice;
        const change = prev ? ((current - prev) / prev) * 100 : 0;
        prices.oil = { price: Math.round(current * 100) / 100, change: Math.round(change * 100) / 100 };
      }
    }
  } catch (e) {}

  // DXY (Dollar Index) — Yahoo Finance server-side
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1d',
      { signal: AbortSignal.timeout(3000) }
    );
    if (r.ok) {
      const d = await r.json();
      const meta = d && d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta;
      if (meta && meta.regularMarketPrice) {
        const prev = meta.chartPreviousClose || meta.previousClose;
        const current = meta.regularMarketPrice;
        const change = prev ? ((current - prev) / prev) * 100 : 0;
        prices.dxy = { price: Math.round(current * 100) / 100, change: Math.round(change * 100) / 100 };
      }
    }
  } catch (e) {}

  // 10Y Yield — Yahoo Finance server-side
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=1d',
      { signal: AbortSignal.timeout(3000) }
    );
    if (r.ok) {
      const d = await r.json();
      const meta = d && d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta;
      if (meta && meta.regularMarketPrice) {
        const prev = meta.chartPreviousClose || meta.previousClose;
        const current = meta.regularMarketPrice;
        const change = prev ? ((current - prev) / prev) * 100 : 0;
        prices.yield10y = { price: Math.round(current * 1000) / 1000, change: Math.round(change * 100) / 100 };
      }
    }
  } catch (e) {}

  // Fallbacks from daily brief if Yahoo failed
  if (!prices.sp500 || !prices.oil || !prices.dxy) {
    try {
      const briefUrl = (process.env.KV_REST_API_URL || '');
      const briefToken = (process.env.KV_REST_API_TOKEN || '');
      if (briefUrl && briefToken) {
        const r = await fetch(briefUrl + '/get/kbai:daily-brief', {
          headers: { Authorization: 'Bearer ' + briefToken },
          signal: AbortSignal.timeout(3000),
        });
        if (r.ok) {
          const raw = await r.json();
          const brief = typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result;
          if (brief) {
            if (!prices.sp500 && brief.sp500) prices.sp500 = { price: brief.sp500, change: null, estimated: true };
            if (!prices.oil && brief.oil_brent) prices.oil = { price: brief.oil_brent, change: null, estimated: true };
            if (!prices.dxy && brief.dxy) prices.dxy = { price: brief.dxy, change: null, estimated: true };
            if (!prices.yield10y && brief.ten_year_yield) prices.yield10y = { price: brief.ten_year_yield, change: null, estimated: true };
          }
        }
      }
    } catch (e) {}
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
