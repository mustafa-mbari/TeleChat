# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Local development
npm install              # Install dependencies
npm run dev             # Start development server (localhost:3000)
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Local testing with ngrok (optional)
ngrok http 3000
# Then set webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-ngrok-url.ngrok.io/api/telegram
```

## Architecture Overview

### Core Request Flow
```
Telegram Bot → POST /api/telegram → Route Handler → Memory/Notion → Response
```

The bot is entirely serverless - it responds to Telegram webhooks via a single Next.js API route at [app/api/telegram/route.ts](app/api/telegram/route.ts).

### State Management Pattern

This bot uses **in-memory state** for temporary data via [lib/memory.ts](lib/memory.ts). Memory resets on each serverless function invocation, which is expected behavior. The memory module manages:

- **Temporary links** (`Map<chatId, url>`) - URLs waiting for category selection
- **Rate limiting** (`Map<userId, timestamp[]>`) - Request timestamps per user
- **Search mode** (`Map<chatId, boolean>`) - Whether user is in search mode
- **Delete mode** (`Map<chatId, boolean>`) - Whether user is in delete mode

All persistent data lives in Notion via [lib/notion.ts](lib/notion.ts).

### Callback Data Protocol

The bot uses Telegram's inline keyboard callback_data to handle button interactions:

- `category:Work` - User selected "Work" category
- `delete:pageId` - User wants to delete link with this Notion page ID
- `force_save:url` - User confirmed saving a duplicate URL
- `cancel` - User cancelled the operation

These are parsed in the `handleCallbackQuery()` function in [app/api/telegram/route.ts](app/api/telegram/route.ts).

### Conversation State Machine

The bot maintains conversation state through memory flags:

1. **Normal mode**: Bot accepts URLs or commands
2. **Pending URL mode**: URL stored in memory, awaiting category selection
3. **Search mode**: Next message is treated as search keyword
4. **Delete mode**: Handled via inline buttons (not a separate mode)

Mode transitions are managed in [lib/memory.ts](lib/memory.ts) via `enableSearchMode()`, `disableSearchMode()`, etc.

## Module Responsibilities

### [lib/config.ts](lib/config.ts)
- Defines available categories (must match Notion database options)
- Rate limit configuration
- User authorization logic

**Important**: When adding categories, update both `CATEGORIES` array AND the Notion database's Category select property.

### [lib/memory.ts](lib/memory.ts)
- All in-memory state management
- Rate limiting logic (sliding window)
- Temporary URL storage before category selection
- User mode tracking (search/delete)

### [lib/notion.ts](lib/notion.ts)
- Notion API client wrapper
- CRUD operations: `saveToNotion()`, `getRecentLinks()`, `searchLinks()`, `deleteLink()`
- Duplicate detection: `checkDuplicateUrl()`
- Data extraction from Notion's complex response format

**Note**: Notion API has eventual consistency - duplicate detection may occasionally miss recent saves.

### [lib/telegram.ts](lib/telegram.ts)
- Telegram API wrapper functions
- Message formatting and button creation
- URL extraction and validation
- Inline keyboard builders

### [app/api/telegram/route.ts](app/api/telegram/route.ts)
- Main webhook endpoint
- Orchestrates message/callback handling
- Authorization and rate limit checks
- Command routing (`/start`, `/list`, `/search`, etc.)

## Environment Variables

Required variables (set in `.env.local` for local dev, in Vercel for production):

```env
BOT_TOKEN=             # From @BotFather
NOTION_SECRET=         # Notion integration token (starts with secret_)
NOTION_DB_ID=          # Notion database ID (from database URL)
ALLOWED_USER_IDS=      # Comma-separated user IDs (empty = allow all)
```

## Notion Database Schema

The bot expects a Notion database with these exact property names:

- **Title** (Title type) - Link title/hostname
- **URL** (URL type) - The actual link
- **Category** (Select type) - Must have options matching `CATEGORIES` in config
- **Created** (Created time type) - Auto-populated timestamp

Share the database with your Notion integration for the bot to access it.

## Testing Locally

1. Run `npm run dev`
2. Use ngrok to expose localhost: `ngrok http 3000`
3. Set Telegram webhook to ngrok URL
4. Message your bot on Telegram

Check Vercel function logs for debugging deployed version.

## Common Modifications

### Adding a new category
1. Update `CATEGORIES` in [lib/config.ts](lib/config.ts)
2. Add the same category to Notion database's Category select property

### Changing rate limit
Edit `RATE_LIMIT` in [lib/config.ts](lib/config.ts):
```typescript
export const RATE_LIMIT = {
  maxRequests: 20,    // New limit
  windowMs: 60000     // Time window (1 min)
};
```

### Adding a new command
1. Add case in `handleCommand()` in [app/api/telegram/route.ts](app/api/telegram/route.ts)
2. Implement handler function
3. Update help text in [lib/telegram.ts](lib/telegram.ts) `sendHelpMessage()`

## Deployment

This bot is designed for Vercel:

1. Push code to GitHub
2. Import repo in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy
5. Set webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.vercel.app/api/telegram`

Verify webhook: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
