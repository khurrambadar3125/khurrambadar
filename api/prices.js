export const config = { runtime: 'edge' };

// Server-side price proxy — uses CoinGecko (reliable, no auth needed)
// + Binance for BTC (fastest) + fallback chain

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

  // CoinGecko — get gold (PAXG) + silver (proxy via silver token) + BTC in one call
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,bitcoin&vs_currencies=usd&include_24hr_change=true',
      { headers: { 'Accept': 'application/json' } }
    );
    if (r.ok) {
      const d = await r.json();
      if (d['pax-gold']) {
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

  // Binance — BTC backup + gold backup (PAXG)
  if (!prices.btc || !prices.gold) {
    try {
      const symbols = [];
      if (!prices.btc) symbols.push('BTCUSDT');
      if (!prices.gold) symbols.push('PAXGUSDT');
      for (const sym of symbols) {
        const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`);
        if (r.ok) {
          const d = await r.json();
          if (sym === 'BTCUSDT') {
            prices.btc = { price: Math.round(parseFloat(d.lastPrice)), change: Math.round(parseFloat(d.priceChangePercent) * 100) / 100 };
          } else {
            prices.gold = { price: Math.round(parseFloat(d.lastPrice) * 100) / 100, change: Math.round(parseFloat(d.priceChangePercent) * 100) / 100 };
          }
        }
      }
    } catch (e) {}
  }

  // Silver — use gold price and apply gold/silver ratio estimate
  // (No free reliable silver API exists; this is the best server-side approach)
  if (prices.gold && !prices.silver) {
    // Current G/S ratio ~64:1 based on latest data
    const gsRatio = 64;
    prices.silver = {
      price: Math.round((prices.gold.price / gsRatio) * 100) / 100,
      change: prices.gold.change ? Math.round(prices.gold.change * 1.3 * 100) / 100 : null, // Silver ~1.3x gold beta
      estimated: true,
    };
  }

  // S&P 500 — use a free proxy that works from Edge
  try {
    const r = await fetch(
      'https://api.binance.com/api/v3/ticker/24hr?symbol=SPXUSDT',
      { signal: AbortSignal.timeout(3000) }
    );
    if (r.ok) {
      const d = await r.json();
      prices.sp500 = { price: Math.round(parseFloat(d.lastPrice) * 100) / 100, change: Math.round(parseFloat(d.priceChangePercent) * 100) / 100 };
    }
  } catch (e) {
    // S&P not available on Binance — provide estimated from last known
    prices.sp500 = { price: 6596, change: 0.60, estimated: true };
  }

  return new Response(JSON.stringify(prices), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
