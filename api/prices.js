export const config = { runtime: 'edge' };

// Server-side price proxy — multi-source, PARALLELIZED for sub-500ms response
// Priority: GoldAPI.io (real spot) → CoinGecko (PAXG backup) → Binance (BTC backup)
// All independent fetches run concurrently via Promise.all

async function fetchJSON(url, options = {}, timeoutMs = 3500) {
  try {
    const r = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

function yahooChart(ticker) {
  return fetchJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`);
}

function parseYahoo(data, decimals = 2) {
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta || !meta.regularMarketPrice) return null;
  const prev = meta.chartPreviousClose || meta.previousClose;
  const current = meta.regularMarketPrice;
  const change = prev ? ((current - prev) / prev) * 100 : 0;
  const mul = Math.pow(10, decimals);
  return {
    price: Math.round(current * mul) / mul,
    change: Math.round(change * 100) / 100,
  };
}

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

  const goldApiHeaders = { headers: { 'x-access-token': 'goldapi-demo', 'Content-Type': 'application/json' } };

  // Fire EVERY independent fetch in parallel — 7 requests, ~single round-trip
  const [
    goldRaw,
    silverRaw,
    coingeckoRaw,
    sp500Raw,
    oilRaw,
    dxyRaw,
    yield10yRaw,
  ] = await Promise.all([
    fetchJSON('https://www.goldapi.io/api/XAU/USD', goldApiHeaders, 4000),
    fetchJSON('https://www.goldapi.io/api/XAG/USD', goldApiHeaders, 4000),
    fetchJSON(
      'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,bitcoin&vs_currencies=usd&include_24hr_change=true',
      { headers: { Accept: 'application/json' } },
      4000
    ),
    yahooChart('%5EGSPC'),
    yahooChart('BZ=F'),
    yahooChart('DX-Y.NYB'),
    yahooChart('%5ETNX'),
  ]);

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

  // GOLD — GoldAPI primary
  if (goldRaw?.price) {
    prices.gold = {
      price: Math.round(goldRaw.price * 100) / 100,
      change: goldRaw.chp != null ? Math.round(goldRaw.chp * 100) / 100 : null,
    };
  }

  // SILVER — GoldAPI primary
  if (silverRaw?.price) {
    prices.silver = {
      price: Math.round(silverRaw.price * 100) / 100,
      change: silverRaw.chp != null ? Math.round(silverRaw.chp * 100) / 100 : null,
    };
  }

  // BTC + gold fallback from CoinGecko
  if (coingeckoRaw) {
    if (!prices.gold && coingeckoRaw['pax-gold']) {
      prices.gold = {
        price: Math.round(coingeckoRaw['pax-gold'].usd * 100) / 100,
        change: Math.round((coingeckoRaw['pax-gold'].usd_24h_change || 0) * 100) / 100,
      };
    }
    if (coingeckoRaw.bitcoin) {
      prices.btc = {
        price: Math.round(coingeckoRaw.bitcoin.usd),
        change: Math.round((coingeckoRaw.bitcoin.usd_24h_change || 0) * 100) / 100,
      };
    }
  }

  // BTC fallback — Binance (only if CoinGecko failed; run now after parallel round)
  if (!prices.btc) {
    const binance = await fetchJSON('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {}, 3000);
    if (binance?.lastPrice) {
      prices.btc = {
        price: Math.round(parseFloat(binance.lastPrice)),
        change: Math.round(parseFloat(binance.priceChangePercent) * 100) / 100,
      };
    }
  }

  // Silver fallback — estimate from gold via gold/silver ratio
  if (!prices.silver && prices.gold) {
    const gsRatio = 62.7; // Updated April 1 2026 — was 64, now compressing
    prices.silver = {
      price: Math.round((prices.gold.price / gsRatio) * 100) / 100,
      change: prices.gold.change ? Math.round(prices.gold.change * 1.5 * 100) / 100 : null,
      estimated: true,
    };
  }

  // Yahoo-derived series
  prices.sp500 = parseYahoo(sp500Raw);
  prices.oil = parseYahoo(oilRaw);
  prices.dxy = parseYahoo(dxyRaw);
  prices.yield10y = parseYahoo(yield10yRaw, 3);

  // KV brief fallback — only if ANY Yahoo slot failed
  if (!prices.sp500 || !prices.oil || !prices.dxy || !prices.yield10y) {
    try {
      const briefUrl = process.env.KV_REST_API_URL || '';
      const briefToken = process.env.KV_REST_API_TOKEN || '';
      if (briefUrl && briefToken) {
        const raw = await fetchJSON(briefUrl + '/get/kbai:daily-brief', {
          headers: { Authorization: 'Bearer ' + briefToken },
        }, 3000);
        const brief = raw ? (typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result) : null;
        if (brief) {
          if (!prices.sp500 && brief.sp500) prices.sp500 = { price: brief.sp500, change: null, estimated: true };
          if (!prices.oil && brief.oil_brent) prices.oil = { price: brief.oil_brent, change: null, estimated: true };
          if (!prices.dxy && brief.dxy) prices.dxy = { price: brief.dxy, change: null, estimated: true };
          if (!prices.yield10y && brief.ten_year_yield) prices.yield10y = { price: brief.ten_year_yield, change: null, estimated: true };
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
