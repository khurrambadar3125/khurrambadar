---
name: email
description: Send a branded personal email from Khurram Badar with recipient personalization
user-invocable: true
---

# Send Branded Personal Email

Send a branded, personalized email from Khurram Badar. Each email features a gold "Prepared for [Name]" banner with the recipient's title, a personalized CTA button linking to their welcome page, and a subscribe CTA for the daily brief.

## Usage:
User says: `/email bilalkhan25@gmail.com "Let's catch up at GT Cafe tomorrow"`

## API Endpoint:
POST https://khurrambadar.com/api/send-personal with x-vercel-cron: 1 header

## Parameters:
- `to` — recipient email (required)
- `subject` — email subject (required)
- `message` — message body (required)
- `recipient_name` — display name for the "Prepared for" banner
- `recipient_title` — their role/title shown under name
- `recipient_welcome` — welcome key for CTA button (e.g. "bilal" → khurrambadar.com/?welcome=bilal)
- `cta_text` — custom CTA button text (default: "Visit Your Personalized Profile")
- `cta_url` — custom CTA URL (overrides welcome link)

## VIP Directory (auto-populate from email):
- bilalkhan25@gmail.com → name: "Bilal bhai", title: "Major (R) Pakistan Army · Founder, Advance Fitness · St. Patrick's '91", welcome: "bilal"
- kzafar@gmail.com → name: "Khurram Zafar", title: "Founder, PMEX · Venture Capital Pioneer", welcome: "kzafar"

## Email Design:
- Gold header: "Khurram Badar — Personal Message"
- Recipient banner: "PREPARED FOR [Name]" with title below
- Message body in elegant serif typography
- Gold CTA button: "Visit Your Personalized Profile" → welcome link
- Subscribe CTA for KRM Daily Brief
- Full signature with both phone numbers + WhatsApp
- Footer with personal message disclaimer

## Steps:
1. Look up recipient in VIP directory to auto-populate name/title/welcome
2. If not in directory, ask user for recipient name
3. Compose the curl command with all branded fields
4. Send and confirm delivery

## Rules:
- Use market-neutral language for any market content
- Warm, personal tone matching Khurram's voice
- Always include the welcome link CTA if recipient has a welcome key
