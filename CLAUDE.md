# KBAI — khurrambadar.com Market Intelligence System

## Project Purpose
This is the autonomous daily market intelligence system for khurrambadar.com.
It fetches live market data, evaluates 6 analytical theses, scores 14 signals,
writes a daily verdict, and updates the site chatbot — all automatically.

## Owner
Khurram Badar — Pakistan's foremost Convergence Thinker.
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

## Current Context (as of March 23, 2026)
- Gold: ~$4,248 (9-session losing streak, 4-month low)
- Silver: ~$65.61 (1-year low)
- DXY: ~99.59 (war premium, structural floor = 96-97)
- 10Y Yield: 4.39% (8-month high)
- Brent Oil: ~$108/bbl
- War: Active-Escalating — Day 23 — Operation Epic Fury
- Warsh: BLOCKED — Tillis 12-12 deadlock

## File Structure
```
index.html              — main site (single page)
khurrambrother_mobile.html — mobile variant
api/chat.js             — chatbot proxy (Edge Function)
api/knowledge.js        — 15-section knowledge base
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
