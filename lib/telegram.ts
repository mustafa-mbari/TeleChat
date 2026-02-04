import type {
  TelegramSendMessageOptions,
  TelegramInlineKeyboardMarkup,
  TelegramInlineKeyboardButton
} from '@/types/telegram';
import { CATEGORIES } from './config';

const BOT_TOKEN = process.env.BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Send a message to a chat
 */
export async function sendMessage(
  chatId: number,
  text: string,
  options?: TelegramSendMessageOptions
): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options
      })
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

/**
 * Create category buttons for inline keyboard
 */
export function createCategoryButtons(): TelegramInlineKeyboardButton[][] {
  const buttons: TelegramInlineKeyboardButton[][] = [];
  const buttonsPerRow = 2;

  for (let i = 0; i < CATEGORIES.length; i += buttonsPerRow) {
    const row = CATEGORIES.slice(i, i + buttonsPerRow).map(category => ({
      text: category,
      callback_data: `category:${category}`
    }));
    buttons.push(row);
  }

  return buttons;
}

/**
 * Send category selection buttons
 */
export async function sendCategoryButtons(
  chatId: number,
  message: string = 'Choose a category:'
): Promise<boolean> {
  const reply_markup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: createCategoryButtons()
  };

  return await sendMessage(chatId, message, { reply_markup });
}

/**
 * Answer callback query (acknowledge button press)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text
      })
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Error answering callback query:', error);
    return false;
  }
}

/**
 * Extract URLs from message text
 */
export function extractUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

/**
 * Check if text is a URL
 */
export function isUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

/**
 * Edit message text
 */
export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  options?: TelegramSendMessageOptions
): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        ...options
      })
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Error editing message:', error);
    return false;
  }
}

/**
 * Format link for display
 */
export function formatLink(title: string, url: string, category: string): string {
  return `🔗 *${title}*\n📂 Category: ${category}\n🌐 ${url}`;
}

/**
 * Create delete button for a link
 */
export function createDeleteButton(pageId: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [[
      {
        text: '🗑️ Delete',
        callback_data: `delete:${pageId}`
      }
    ]]
  };
}

/**
 * Send help message
 */
export async function sendHelpMessage(chatId: number): Promise<boolean> {
  const helpText = `
*Telegram → Notion Link Bot*

*Commands:*
/start - Start the bot
/help - Show this help message
/list - List recent links (last 10)
/search - Search links by keyword
/delete - Delete a link

*How to use:*
1️⃣ Send a URL
2️⃣ Choose a category
3️⃣ Link saved to Notion ✅

*Example:*
\`https://youtube.com/watch?v=example\`

Then select category: Work, Study, Video, or Other
  `.trim();

  return await sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}
