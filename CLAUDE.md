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
- Use Anthropic API with model: claude-haiku-4-5-20251001 for chatbot
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

## Current Context (as of April 2, 2026)
- BREAKING Apr 2: Trump's prime-time hawkish national address — vows to "hit Iran extremely hard" in 2-3 weeks, threatens power plants
- Gold: ~$4,619 (-2.9% — peace rally REVERSED by hawkish speech)
- Silver: ~$70.94 (-5.4% — punished harder, ratio expanding to 65.1:1)
- DXY: ~100.07 (+0.5% — BACK ABOVE 100, war premium re-inflating)
- Brent Oil: ~$107.87 (+6.6% — approaching Signal 6 threshold $110)
- WTI: ~$106.49 (+6.4% — Trump speech drove oil surge)
- 10Y Yield: ~4.381% (+6bp — yields rising on war/inflation fears)
- S&P Futures: -1.25% (peace rally erased)
- War: Day 33 — ESCALATION PHASE — April 6 Hormuz deadline 4 days away
- Iran rejected 15-point plan, countered with 5 conditions
- UK organizing 30+ nation summit April 3 for Hormuz diplomacy
- BOJ: April hike to 1.0% expected by one-third of economists
- ISM Prices: 78.3 (highest since June 2022 — STAGFLATION WARNING)
- Signal 13 ACTIVE: COMEX registered silver 76.4M oz (below 80M threshold)
- Thesis E (Peace Dividend): FADING — probability 10% before April 6
- Warsh: STILL BLOCKED — Tillis holding all Fed confirmations

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
