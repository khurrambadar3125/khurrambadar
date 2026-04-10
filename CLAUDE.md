# KBAI — khurrambadar.com | The Compounding Intelligence Platform

## Project Purpose
This is the autonomous daily market intelligence system AND personal brand platform for khurrambadar.com. It fetches live market data, evaluates 8 analytical theses, scores 14 signals, writes a daily verdict, sends email newsletters, and powers an AI chatbot — all autonomously.

## Owner
Khurram Badar — One of the world's foremost Convergence Thinkers.
- 30+ years C-Suite across UAE, Pakistan, Saudi Arabia, Bahrain, Singapore
- Published journalist: Dawn (1995), Gulf News (2002)
- Founder: Spotlight FZE (2002 Dubai Media City → 2007 RAKEZ, approaching 20 years)
- AI Innovator, ESG Advisor, Fintech/Blockchain Pioneer, Environmentalist
- Father of Yusuf, Dina, and Rania. Married to Saira Khurram (Head of School, The City School)
- Uses Claude Code to build and maintain everything
- Currently based in Karachi, Pakistan. Dubai is second home (visits 3x/year)

## Architecture
- **Hosting**: Vercel (static site + Edge Functions)
- **Chatbot**: Claude Haiku 3 (`claude-3-haiku-20240307`) via `/api/chat` proxy with prompt caching
- **Knowledge Base**: `/api/knowledge.js` — 21 sections, compounding intelligence engine
- **Daily Updates**: `/api/run-daily.js` — autonomous cron with Claude Sonnet web search
- **Newsletter**: `/api/send-newsletter.js` — Resend API, 6+ subscribers
- **Personal Email**: `/api/send-personal.js` — branded personal messages
- **Daily Brief API**: `/api/daily-brief.js` + `/api/update-brief.js`
- **Cron**: Vercel Cron at 06:15 UTC daily
- **Prompt Caching**: ALWAYS ACTIVE. `cache_control: { type: 'ephemeral' }` on knowledge base injection. ~90% cost savings. NEVER remove.

## Key Rules — CRITICAL
1. All output is educational only — never financial advice
2. Disclaimer on market responses: "Educational only — not financial advice"
3. Keep code simple — owner is not a developer
4. **UAE CONTENT LAW**: ALL public content (website, chatbot, WhatsApp) must use MARKET LANGUAGE ONLY. No geopolitics, no war commentary, no political leaders' statements, no conflict details. Frame everything as: "ongoing risk premium," "supply disruption," "diplomatic framework." Full analysis only in EMAIL (private, subscriber-only). UAE Federal Decree-Law No. 34 of 2021 can jail people for political social media content.
5. **NEVER send email without explicit user approval**. Always show data → wait for "send" → then send.
6. **NEVER use stale prices**. Verify with 3+ sources (Kitco, Investing.com, JM Bullion, TradingEconomics). If a source shows "Closed" or prior date, discard it.
7. Always include BOTH gold AND silver in every market update
8. Check ALL futures/markets FIRST before any reading or assessment
9. Deep dive research across 8+ sources (FT, WSJ, Bloomberg, NYT, Economist, Yahoo, CNBC, Reuters) before every update

## The 8 Theses (track daily)
- A: DXY structural floor 96-97
- B: 4D Chess — Warsh blocked, Powell stays, QE continues
- C: BOJ hike path to 1.25-1.5% by July-August 2026
- D: Gold structural bull — $5,500-$6,300 year-end target
- E: Peace Dividend Trade — ACTIVATED (ceasefire April 8)
- F: Cyclical vs Structural — classify each day's move
- G: Supply Chain — locked in, thawing post-ceasefire
- H: Structural Demand / Iran Incentive dynamics

## The 14 Signals
1: DXY<98 BULLISH | 2: DXY>101 BEARISH | 3: 10Y<4% BULLISH | 4: 10Y>4.5% BEARISH
5: Oil<$80 BULLISH | 6: Oil>$110 BEARISH | 7: Ceasefire ACTIVATE | 8: BOJ hike BULLISH
9: Fed cut BULLISH | 10: Warsh confirmed BEARISH | 11: G/S>75 silver cheap
12: Shanghai premium>$10 structural | 13: COMEX silver<80Moz stress | 14: Gold+Dollar up = decoupling

## Compounding Intelligence Engine
The knowledge base is NOT a database — it is a BRAIN that fires 24/7. Contains:
- 34+ lessons (accumulated rules from errors and discoveries)
- 9+ patterns (documented repeating behaviors)
- 24+ predictions (scored, with accuracy tracking)
- Convergence Matrix connecting all domains
- 7 Laws of Compounding Intelligence
- Daily snapshots from Feb 5 - present
- Autonomous Firing Protocol (8-step scan on every interaction)

## File Structure
```
index.html                — main site (single page, redesigned ssscript.app style)
daily.html                — daily reading page with brief + subscribe
api/chat.js               — chatbot proxy with prompt caching
api/knowledge.js          — 21-section knowledge base (the brain)
api/run-daily.js          — autonomous daily cron (Claude + web search + email)
api/send-newsletter.js    — newsletter sender (Resend API)
api/send-personal.js      — personal branded email sender
api/update-brief.js       — manual brief update endpoint
api/daily-brief.js        — brief reader endpoint
api/subscribe.js          — subscriber management
api/unsubscribe.js        — unsubscribe handler
vercel.json               — routes + cron schedule
CLAUDE.md                 — this file
```

## VIP Recognition (chatbot)
The chatbot recognizes and warmly welcomes:
- **Saira Khurram** (wife) — Head of School, City School. Loves cooking. Help with recipes.
- **Yusuf Khurram** (son) — Birthday June 10. Black belt. O-Levels. Drives. Basketball.
- **Dina Khurram** (daughter) — Birthday Nov 1. Black belt. Photography diploma. Cat Chandi.
- **Rania Khurram** (daughter) — Birthday May 18. Chess. Ballet. French. Yellow belt.
- **Zubair Sheikh** — SMI mentor's son
- **Bilal Khan** — Major (R), Siachen x2, St Patrick's '91, Bilal Brothers
- **Khurram Zafar** — PMEX founder
- **Azfar Ahsan** — Nutshell Group, St Patrick's '93
- **Nayla Al Khaja** — UAE's first female film director
- **Shamaeel Ansari** — luxury fashion designer
- **Dr. Ishrat Hussain** — former SBP Governor, mentor
- **Nadia Khan**, **Shoaib Akhtar**

## VIP Welcome Links (for WhatsApp sharing)
`khurrambadar.com/?welcome=bilal` (or ishrat, kzafar, azfar, nayla, saira, yusuf, dina, rania, etc.)

## WhatsApp Channel
`whatsapp.com/channel/0029Vb7pkVi8kyyUhjU06q2H` — KRM Daily Brief
Content: STRICTLY market data, prices, signals. NO geopolitics. Link not yet promoted (waiting for content).

## Email System
- Newsletter: `/api/send-newsletter` (cron header auth)
- Personal: `/api/send-personal` (cron header auth)
- Brief update: `/api/update-brief` (cron header auth)
- All accept `x-vercel-cron: 1` header for authentication

## How To Update
- **Daily update**: Fetch prices from 3+ sources → update knowledge.js + index.html live context → push brief → send newsletter (AFTER user approval)
- **Add luminary**: Edit index.html luminaries section
- **Add story**: Edit index.html stories section
- **Update knowledge base**: Edit api/knowledge.js
- **Update chatbot prompt**: Edit KRM_SYSTEM in index.html
- **Send personal email**: POST to /api/send-personal with to, subject, message, recipient_name
- **Add VIP welcome**: Add to VIP_WELCOMES object in index.html + chatbot system prompt

## Environment Variables (Vercel)
- `ANTHROPIC_API_KEY` — for chatbot + daily updates
- `RESEND_API_KEY` — for email sending
- `KBAI_API_KEY` — Bearer token auth
- `KV_REST_API_URL` + `KV_REST_API_TOKEN` — Vercel KV storage

## Active Ventures (reference)
- STRATEMA AM GmbH — $110M solar hydroponic campus
- Mr. TCS AI — 5-language chatbot for Pakistan's largest logistics company
- New World Navigator — $49 education programme (ESG, Web3, fintech, blockchain, tokenization, AI)
- newworld.education — autonomous AI education platform, KG to A-Level
- Spotlight FZE — RAKEZ, approaching 20 years
- khurrambadar.com — this platform, the compounding intelligence brain
- TitanTrader — autonomous market maker framework (educational)
- 20+ digital domain portfolio
