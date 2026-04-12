---
name: update
description: Run the daily market update — fetch prices, deep dive news, update knowledge base, chatbot, and prepare email brief for approval
user-invocable: true
---

# Daily Market Update

Run the complete daily market intelligence update for khurrambadar.com.

## Steps:
1. **Fetch ALL futures/market prices** from 3+ sources (Kitco, Investing.com, JM Bullion, TradingEconomics, WebSearch). Verify each price against multiple sources. NEVER use stale/closed prices.
2. **Deep dive news research** across FT, WSJ, Bloomberg, NYT, Economist, Yahoo, CNBC, Reuters — at least 10-15 searches covering: diplomatic developments, Fed/central bank policy, BOJ, oil supply, earnings, macro data.
3. **Update knowledge base** (api/knowledge.js): add daily snapshot, new lessons, patterns, predictions. Score previous predictions.
4. **Update chatbot live context** (index.html): market-language only, UAE-safe. No geopolitics/war/politics on public content.
5. **Update CLAUDE.md** current context section.
6. **Present email data** to user in a table for verification. Include all prices, key headlines, thesis status, scenarios.
7. **WAIT for explicit "send" approval** before pushing brief or sending newsletter.

## Rules:
- ALL public content must use market language (ongoing risk premium, supply disruption, diplomatic framework — NOT war/political details)
- Full geopolitical analysis only in email (private, subscriber-only)
- Verify prices from 3+ sources before presenting
- Always include BOTH gold AND silver
- If Friday → label as "Weekend Edition"
- If Sunday → label as "Sunday Edition" with Monday predictions
- NEVER send without explicit user approval
