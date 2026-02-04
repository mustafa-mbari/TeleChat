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
- **New category mode** (`Map<chatId, boolean>`) - Whether user is entering a new category name
- **Delete mode** (`Map<chatId, boolean>`) - Whether user is in delete mode

All persistent data lives in Notion via [lib/notion.ts](lib/notion.ts).

### Callback Data Protocol

The bot uses Telegram's inline keyboard callback_data to handle button interactions:

- `category:Work` - User selected "Work" category
- `category:__other__` - User wants to create a new category
- `delete:pageId` - User wants to delete link with this Notion page ID
- `force_save:url` - User confirmed saving a duplicate URL
- `cancel` - User cancelled the operation

These are parsed in the `handleCallbackQuery()` function in [app/api/telegram/route.ts](app/api/telegram/route.ts).

### Conversation State Machine

The bot maintains conversation state through memory flags:

1. **Normal mode**: Bot accepts URLs or commands
2. **Pending URL mode**: URL stored in memory, awaiting category selection
3. **Search mode**: Next message is treated as search keyword
4. **New category mode**: Next message is treated as new category name
5. **Delete mode**: Handled via inline buttons (not a separate mode)

Mode transitions are managed in [lib/memory.ts](lib/memory.ts) via `enableSearchMode()`, `disableSearchMode()`, `enableNewCategoryMode()`, `disableNewCategoryMode()`, etc.

## Module Responsibilities

### [lib/config.ts](lib/config.ts)
- Rate limit configuration
- User authorization logic

**Note**: Categories are now managed dynamically from Notion database. The `CATEGORIES` constant is no longer used.

### [lib/memory.ts](lib/memory.ts)
- All in-memory state management
- Rate limiting logic (sliding window)
- Temporary URL storage before category selection
- User mode tracking (search/delete/new category)

### [lib/notion.ts](lib/notion.ts)
- Notion API client wrapper
- CRUD operations: `saveToNotion()`, `getRecentLinks()`, `searchLinks()`, `deleteLink()`
- Category management: `getCategories()`, `addCategory()`
- Duplicate detection: `checkDuplicateUrl()`
- Data extraction from Notion's complex response format
- Auto-timestamp support for Created field

**Note**: Notion API has eventual consistency - duplicate detection may occasionally miss recent saves.

### [lib/telegram.ts](lib/telegram.ts)
- Telegram API wrapper functions
- Message formatting and button creation
- URL extraction and validation
- Dynamic inline keyboard builders (fetches categories from Notion)
- "Other" option for creating new categories

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
- **Category** (Select type) - Dynamically managed by the bot. Users can create new categories on-the-fly via the "Other" option
- **Created** (Date type) - Timestamp set by the bot when link is saved

**Important**:
- The bot fetches categories dynamically from the database's Category select property
- New categories are automatically added to the database when users create them
- The Created field must be a "Date" type (not "Created time") for the bot to set it explicitly

Share the database with your Notion integration for the bot to access it.

## Testing Locally

1. Run `npm run dev`
2. Use ngrok to expose localhost: `ngrok http 3000`
3. Set Telegram webhook to ngrok URL
4. Message your bot on Telegram

Check Vercel function logs for debugging deployed version.

## Common Modifications

### Adding a new category
Categories are now managed dynamically! Users can create new categories directly through the bot:
1. Send a URL to the bot
2. Select "➕ Other (Create New)" from the category buttons
3. Enter the new category name
4. The category is automatically added to Notion and available for all future saves

Alternatively, you can add categories manually in Notion:
1. Open your Notion database
2. Click on the Category property settings
3. Add a new option to the Select property

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
