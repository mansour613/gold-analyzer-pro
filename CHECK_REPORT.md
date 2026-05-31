# Check Report

Patched:
- OpenRouter response parsing fixed.
- Supports `choices[0].message.content` and fallback text parsing.
- Better OpenRouter error messages.
- Better fallback when model returns no content.
- AI page made smaller for mobile.
- Strategy controls and result cards are more compact.
- `.env.example` updated for OpenRouter.

Required local file:
`api-server/.env`

Required content:
```env
PORT=8080
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324:free
```

Restart backend after changing `.env`.
