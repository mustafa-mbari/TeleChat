# 🤖 Telegram → Notion Bot

A serverless Telegram bot built with Next.js that saves links to your Notion database. Features include categorization, search, duplicate detection, rate limiting, and user authentication.

## ✨ Features

- 📎 **Save URLs**: Send any URL and categorize it
- 🏷️ **Categories**: Work, Study, Video, Other (easily customizable)
- 🔍 **Search**: Search saved links by keyword
- 📋 **List**: View recent links
- 🗑️ **Delete**: Remove links from database
- ✅ **Duplicate Detection**: Warns before saving duplicate URLs
- ⏱️ **Rate Limiting**: 10 requests per minute per user
- 🔒 **User Authentication**: Restrict bot access to authorized users
- 🚀 **Serverless**: Deploy free on Vercel
- 💾 **No Database**: Uses Notion as database

## 🏗️ Architecture

```
User → Telegram Bot → Vercel (Next.js API) → Notion API → Notion Database
```

## 📋 Prerequisites

1. **Telegram Bot Token**
   - Message [@BotFather](https://t.me/botfather) on Telegram
   - Send `/newbot` and follow instructions
   - Save your bot token

2. **Notion Integration**
   - Go to [Notion Integrations](https://www.notion.so/my-integrations)
   - Create new integration
   - Save your integration token (starts with `secret_`)

3. **Notion Database**
   - Create a new database in Notion with these properties:
     - **Title** (Title type)
     - **URL** (URL type)
     - **Category** (Select type with options: Work, Study, Video, Other)
     - **Created** (Created time type)
   - Share the database with your integration
   - Copy the database ID from the URL: `notion.so/workspace/[DATABASE_ID]?v=...`

4. **Get Your Telegram User ID**
   - Message [@userinfobot](https://t.me/userinfobot) on Telegram
   - Save your user ID

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local` file:

```env
# Telegram Bot Token (from @BotFather)
BOT_TOKEN=your_bot_token_here

# Notion Integration Token
NOTION_SECRET=secret_xxxxx

# Notion Database ID
NOTION_DB_ID=xxxxx

# Allowed User IDs (comma-separated)
ALLOWED_USER_IDS=123456789,987654321
```

### 3. Run Locally

```bash
npm run dev
```

The app will start on `http://localhost:3000`

### 4. Test Webhook (Optional - Local Testing)

For local testing, use [ngrok](https://ngrok.com/):

```bash
ngrok http 3000
```

Then set webhook:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-ngrok-url.ngrok.io/api/telegram
```

## 🌐 Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/telegram-notion-bot.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables:
   - `BOT_TOKEN`
   - `NOTION_SECRET`
   - `NOTION_DB_ID`
   - `ALLOWED_USER_IDS`
4. Deploy

### 3. Set Telegram Webhook

After deployment, set your webhook:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.vercel.app/api/telegram
```

Replace:
- `<YOUR_BOT_TOKEN>` with your actual bot token
- `your-app.vercel.app` with your Vercel domain

### 4. Verify Webhook

Check webhook status:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

## 📱 How to Use

### Basic Usage

1. **Start the bot**: Send `/start` or `/help`
2. **Save a link**: Send any URL
3. **Choose category**: Click a category button
4. **Done!** ✅ Link saved to Notion

### Commands

- `/start` - Start the bot and see help
- `/help` - Show help message
- `/list` - List recent links (last 10)
- `/search` - Search links by keyword
- `/delete` - Instructions for deleting links

### Example Flow

```
You: https://youtube.com/watch?v=example

Bot: 📎 URL received! Choose a category:
     [ Work ] [ Study ]
     [ Video ] [ Other ]

You: *clicks Video*

Bot: ✅ Link saved successfully!
     📂 Category: Video
     🌐 https://youtube.com/watch?v=example
```

### Search

```
You: /search

Bot: 🔍 Search Mode Enabled
     Send a keyword to search for links.

You: react

Bot: 🔍 Search Results (3)
     Keyword: react

     🔗 React Documentation
     📂 Study
     🌐 https://react.dev
     [🗑️ Delete]
     ...
```

## ⚙️ Configuration

### Adding New Categories

Edit `lib/config.ts`:

```typescript
export const CATEGORIES = [
  'Work',
  'Study',
  'Video',
  'Other',
  'Shopping',  // Add new category
  'Recipes'    // Add new category
] as const;
```

**Important**: Also add these categories to your Notion database's Category select property!

### Rate Limiting

Edit `lib/config.ts`:

```typescript
export const RATE_LIMIT = {
  maxRequests: 10,    // Max requests per window
  windowMs: 60000     // Window in milliseconds (1 minute)
};
```

### User Authentication

Add user IDs to `.env.local`:

```env
ALLOWED_USER_IDS=123456789,987654321,555555555
```

To allow all users, leave it empty:
```env
ALLOWED_USER_IDS=
```

## 📁 Project Structure

```
telegram-notion-bot/
├── app/
│   ├── api/
│   │   └── telegram/
│   │       └── route.ts          # Webhook endpoint
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage
├── lib/
│   ├── config.ts                 # Configuration
│   ├── memory.ts                 # Temporary storage & rate limiting
│   ├── notion.ts                 # Notion API client
│   └── telegram.ts               # Telegram API helpers
├── types/
│   └── telegram.ts               # TypeScript types
├── .env.local.example            # Environment variables template
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 API Endpoints

### `POST /api/telegram`
Webhook endpoint for Telegram updates

### `GET /api/telegram`
Health check endpoint

## 🐛 Troubleshooting

### Bot not responding

1. Check webhook status:
   ```
   https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

2. Verify environment variables are set correctly

3. Check Vercel function logs

### "Unauthorized" error

- Make sure your user ID is in `ALLOWED_USER_IDS`
- Get your user ID from [@userinfobot](https://t.me/userinfobot)

### Links not saving to Notion

1. Verify Notion integration has access to the database
2. Check database ID is correct
3. Ensure database has all required properties:
   - Title (Title)
   - URL (URL)
   - Category (Select)
   - Created (Created time)

### Duplicate detection not working

- Notion API has eventual consistency
- Wait a few seconds and try again

## 📊 Memory Usage

The bot uses in-memory storage for:
- Temporary link storage (until category is selected)
- Rate limiting counters
- Search/delete mode state

**Note**: Memory resets on each serverless function invocation. This is normal for serverless deployments.

## 🔒 Security

- ✅ User authentication via whitelist
- ✅ Rate limiting per user
- ✅ Environment variables for secrets
- ✅ Input validation
- ✅ No SQL injection risk (using Notion API)
- ✅ HTTPS only (Vercel default)

## 📈 Cost

**$0/month** 🎉

- Vercel: Free tier (Hobby plan)
- Notion: Free tier
- Telegram: Free

## 🤝 Contributing

Feel free to submit issues and pull requests!

## 📄 License

MIT

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Notion API](https://developers.notion.com/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Vercel](https://vercel.com/)

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section
2. Review Vercel function logs
3. Open an issue on GitHub

---

Made with ❤️ for productivity enthusiasts
