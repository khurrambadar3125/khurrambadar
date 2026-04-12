---
name: add-vip
description: Add a new VIP to the chatbot recognition system with welcome link
user-invocable: true
---

# Add VIP Recognition

Add a new person to the KRM chatbot VIP recognition system so they get a warm personalized welcome.

## Usage:
User says: `/add-vip bilal "Major Bilal Khan" "St Patrick's '91, Siachen veteran, great friend"`

## Steps:
1. Add to VIP_WELCOMES object in index.html JavaScript (with proper escaping — use \' not \\')
2. Add to chatbot system prompt SPECIAL VIP RECOGNITION section in index.html
3. Add to luminaries section if appropriate
4. Verify JS syntax is clean: `node -e "..." ` check
5. Commit and push
6. Give user the welcome link: `khurrambadar.com/?welcome=KEY`

## Rules:
- Welcome greeting must be warm, personal, cite the relationship with Khurram
- Use \' for apostrophes in JS strings (NOT \\')
- Always verify JS syntax after editing
- Add to both VIP_WELCOMES AND the system prompt recognition rules
