# Telegram → Notion Bot (Next.js + Vercel)

---

# 🎯 Goal

Build a serverless Telegram bot using Next.js API routes that:

- receives URLs
- shows category buttons
- saves links to Notion database
- deployed free on Vercel
- no Express
- no traditional database

---

# 🧠 Architecture

User
↓
Telegram Bot
↓
Vercel (Next.js API route webhook)
↓
Notion API
↓
Notion Database

---

# 🧰 Tech Stack

- Next.js 14+ (App Router)
- TypeScript (optional but recommended)
- @notionhq/client
- Telegram Bot API (fetch)
- Vercel hosting (free)

---

# 📁 Project Structure

app/
│
├── api/
│   └── telegram/
│       └── route.ts     # webhook
│
├── lib/
│   ├── notion.ts
│   ├── telegram.ts
│   └── memory.ts
│
├── types/
│   └── telegram.ts
│
├── .env.local
└── package.json

---

# 🔐 Environment Variables

.env.local

BOT_TOKEN=xxxx
NOTION_SECRET=xxxx
NOTION_DB_ID=xxxx

---

# 🗄️ Notion Database Schema

Create table:

Name: Links

Columns:

- Title (Title)
- URL (URL)
- Category (Select)
- Created (Created time)

---

# 📦 Dependencies

npm install:

@notionhq/client

(no axios needed, use native fetch)

---

# 🚀 Implementation Plan

---

## Step 1 — Create Next.js project

npx create-next-app@latest telegram-notion-bot

Select:
- TypeScript = yes
- App Router = yes

---

## Step 2 — Create webhook route

File:

app/api/telegram/route.ts

Must:

- accept POST
- parse body
- handle Telegram updates
- return 200

---

## Step 3 — Create Telegram helpers

lib/telegram.ts

Functions:

- sendMessage(chatId, text)
- sendCategoryButtons(chatId)
- answerCallbackQuery(id)

Use:

fetch("https://api.telegram.org/bot<TOKEN>/METHOD")

---

## Step 4 — Create Notion client

lib/notion.ts

Functions:

- saveToNotion(url, category)

Use:

@notionhq/client

Create page in database with properties:
- Title
- URL
- Category

---

## Step 5 — Temporary memory

lib/memory.ts

Use:

Map<number, string>

Purpose:
Store URL until category is chosen

Example:

tempLinks.set(chatId, url)

---

## Step 6 — Webhook logic

Inside route.ts:

IF message.text startsWith http
    store URL
    send category buttons

IF callback_query
    get category
    get URL
    save to Notion
    send confirmation

---

## Step 7 — Category buttons

Use inline keyboard:

reply_markup.inline_keyboard

Default:

Work | Study
Video | Other

---

## Step 8 — Deploy

Push to GitHub

Import project in Vercel

Add ENV variables

Deploy

---

## Step 9 — Set webhook

Open:

https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.vercel.app/api/telegram

---

# ✅ Required Features

- receive URL
- inline buttons
- save to Notion
- confirmation message
- multi user support
- serverless

---

# ⭐ Optional Features

- /list
- /search
- /delete
- auto detect category
- duplicate check
- tags
- dashboard page
- authentication
- logging
- rate limiting

---

# 🧪 Example Flow

User:
https://youtube.com/xyz

Bot:
Choose category:
[ Work ] [ Study ]
[ Video ] [ Other ]

User clicks:
Video

Bot:
Saved successfully ✅

---

# 🎯 Final Result

Telegram handles input
Notion stores data
Next.js only runs API
Hosting cost = 0$

---

# END
