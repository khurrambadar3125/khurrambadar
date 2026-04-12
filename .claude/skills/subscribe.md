---
name: subscribe
description: Add a new email subscriber to the KRM Daily Brief
user-invocable: true
---

# Subscribe

Add someone to the KRM Daily Brief email list and optionally send today's brief immediately.

## Usage:
User says: `/subscribe bilalkhan25@gmail.com "Bilal Khan"`

## Steps:
1. Subscribe via: `curl -s -L -X POST https://khurrambadar.com/api/subscribe -H "Content-Type: application/json" -d '{"email":"EMAIL","name":"NAME"}'`
2. Confirm subscription
3. Ask user if they want to send today's brief to the new subscriber now
4. If yes, trigger newsletter send (note: sends to ALL subscribers)

## Rules:
- Never subscribe without user telling you to
- Confirm the email address before subscribing
