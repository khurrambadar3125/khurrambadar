# KBAI — khurrambadar.com Market Intelligence System

## Project Purpose
This is the autonomous daily market intelligence system for khurrambadar.com.
It fetches live market data, evaluates 6 analytical theses, scores 14 signals,
writes a daily verdict, and updates the site chatbot — all automatically.

## Owner
Khurram Badar — One of the world's foremost Convergence Thinkers.
30+ years C-Suite across UAE, Pakistan, Saudi Arabia, Bahrain, Singapore.
Uses Claude Code to build and maintain everything.

## Architecture
- **Hosting**: Vercel (static site + Edge Functions)
- **Chatbot**: Claude Haiku via `/api/chat` proxy
- **Knowledge Base**: `/api/knowledge.js` — 15 sections, 737 lines
- **Daily Updates**: `/api/update.js` — autonomous agent with web search
- **Cron**: Vercel Cron at 06:00 UTC daily

## Key Rules
- All output is educational only — never financial advice
- Disclaimer on market responses: "Educational only — not financial advice"
- Keep code simple — owner is not a developer
- Use Anthropic API with model: claude-3-haiku-20240307 for chatbot (60x cheaper than Haiku 4.5)
- Use claude-sonnet-4-20250514 for update agent (needs reasoning)

## The 6 Theses
- A: DXY structural floor 96-97 (war premium = 99-100 currently)
- B: 4D Chess — Warsh blocked, Powell stays, QE $40B/month continues
- C: BOJ hike path to 1.25-1.5% by July-August 2026
- D: Gold structural bull — $5,500-$6,300 year-end target
- E: Peace Dividend Trade — pending ceasefire signal
- F: Cyclical vs Structural — classify each day's move

## The 14 Signals
1: DXY<98 BULLISH | 2: DXY>101 BEARISH | 3: 10Y<4% BULLISH | 4: 10Y>4.5% BEARISH
5: Oil<$80 BULLISH | 6: Oil>$110 BEARISH | 7: Ceasefire ACTIVATE | 8: BOJ hike BULLISH
9: Fed cut BULLISH | 10: Warsh confirmed BEARISH | 11: G/S>75 silver cheap
12: Shanghai premium>$10 structural | 13: COMEX silver<80Moz stress | 14: Gold+Dollar up = decoupling

## Current Context (as of April 6, 2026 — Markets reopen, deadline Tuesday)
- MARKETS CLOSED: Good Friday. Reopen Monday April 6 = Hormuz deadline day
- NFP March: +178,000 (vs +59K expected — 3X BEAT). Higher for longer confirmed.
- TWO US PLANES DOWN (April 3): F-15 in Iran + combat plane near Hormuz. Iran struck Gulf refineries.
- Gold: ~$4,676 (holding $4,650-4,700 range)
- Silver: ~$72.90 (-2.75% last session)
- DXY: ~100.03 (war premium holding above 100)
- Brent Oil: ~$109.03 (+7.78% — Signal 6 TRIGGERED above $110)
- WTI: ~$111 (WTI > Brent RARE INVERSION = prolonged US involvement priced in)
- 10Y Yield: ~4.345% (rising on strong NFP)
- S&P: 6,583 (+0.11% last trade)
- BREAKING AXIOS: 45-day ceasefire talks underway — US, Iran, Pakistan-Turkey-Egypt mediators
- Two-phase deal: Phase 1 = 45-day ceasefire, Phase 2 = permanent end. Chances "slim" per sources.
- Trump deadline extended to TUESDAY 8PM ET — 4th extension (Lesson 019 confirmed)
- US airman rescued after 36hr evasion in Iran. CIA deception op.
- Iran Qalibaf: will target Gulf energy if US strikes power plants
- War: Day 38 — deadline TUESDAY Apr 7 8PM ET
- UK 40-nation summit: US DID NOT ATTEND. Joint statement but no military escort.
- Signal 6 TRIGGERED: Oil above $110
- Signal 13 ACTIVE: COMEX registered silver 76.4M oz
- Shanghai gold at DISCOUNT (-0.47%) — Signal 12 weakening
- BOJ: April 28 hike to 1.0% increasingly expected
- Warsh: Hearing targeted week of April 13. Powell term expires May 15.

## File Structure
```
index.html              — main site (single page)
khurrambrother_mobile.html — mobile variant
api/chat.js             — chatbot proxy (Edge Function)
api/knowledge.js        — 16-section knowledge base
api/update.js           — autonomous daily update agent
vercel.json             — routes + cron schedule
CLAUDE.md               — this file
```

## Environment Variables (Vercel)
- `ANTHROPIC_API_KEY` — Anthropic API key for chatbot + updates
- `UPDATE_SECRET` — Bearer token for triggering manual updates

## How To Update
- **Add luminary**: Edit index.html luminaries section
- **Update knowledge base**: Edit api/knowledge.js
- **Update chatbot prompt**: Edit KRM_SYSTEM in index.html
- **Trigger manual update**: POST /api/update with auth header
- **Change theses/signals**: Update both index.html prompt and api/knowledge.js
