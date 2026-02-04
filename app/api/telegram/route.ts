import { NextRequest, NextResponse } from 'next/server';
import type { TelegramUpdate } from '@/types/telegram';
import {
  sendMessage,
  sendCategoryButtons,
  answerCallbackQuery,
  isUrl,
  extractUrl,
  sendHelpMessage,
  formatLink,
  createDeleteButton
} from '@/lib/telegram';
import {
  saveToNotion,
  checkDuplicateUrl,
  getRecentLinks,
  searchLinks,
  deleteLink,
  formatDate,
  addCategory
} from '@/lib/notion';
import {
  storeTempLink,
  getTempLink,
  removeTempLink,
  isRateLimited,
  recordRequest,
  getRemainingRequests,
  enableSearchMode,
  disableSearchMode,
  isInSearchMode,
  enableNewCategoryMode,
  disableNewCategoryMode,
  isInNewCategoryMode
} from '@/lib/memory';
import { isUserAuthorized } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();

    // Handle message
    if (update.message) {
      await handleMessage(update);
    }

    // Handle callback query (button press)
    if (update.callback_query) {
      await handleCallbackQuery(update);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error processing update:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/**
 * Handle incoming messages
 */
async function handleMessage(update: TelegramUpdate) {
  const message = update.message!;
  const chatId = message.chat.id;
  const userId = message.from?.id;
  const text = message.text?.trim() || '';

  // Check authorization
  if (!userId || !isUserAuthorized(userId)) {
    await sendMessage(
      chatId,
      '🚫 Unauthorized. You are not allowed to use this bot.'
    );
    return;
  }

  // Check rate limit
  if (isRateLimited(userId)) {
    const remaining = getRemainingRequests(userId);
    await sendMessage(
      chatId,
      `⏱️ Rate limit exceeded. Please try again later.\nRemaining requests: ${remaining}`
    );
    return;
  }

  // Record request
  recordRequest(userId);

  // Handle commands
  if (text.startsWith('/')) {
    await handleCommand(chatId, text, userId);
    return;
  }

  // Handle search mode
  if (isInSearchMode(chatId)) {
    await handleSearchQuery(chatId, text);
    return;
  }

  // Handle new category mode
  if (isInNewCategoryMode(chatId)) {
    await handleNewCategoryInput(chatId, text);
    return;
  }

  // Handle URL
  if (isUrl(text)) {
    await handleUrlMessage(chatId, text);
    return;
  }

  // Extract URL from text
  const url = extractUrl(text);
  if (url) {
    await handleUrlMessage(chatId, url);
    return;
  }

  // Default response
  await sendMessage(
    chatId,
    '❓ Please send a URL or use /help to see available commands.'
  );
}

/**
 * Handle commands
 */
async function handleCommand(chatId: number, command: string, userId: number) {
  const cmd = command.toLowerCase().split(' ')[0];

  switch (cmd) {
    case '/start':
      await sendHelpMessage(chatId);
      break;

    case '/help':
      await sendHelpMessage(chatId);
      break;

    case '/list':
      await handleListCommand(chatId);
      break;

    case '/search':
      await handleSearchCommand(chatId);
      break;

    case '/delete':
      await sendMessage(
        chatId,
        '⚠️ Delete functionality is available via the buttons when listing links. Use /list to see your links.'
      );
      break;

    default:
      await sendMessage(
        chatId,
        '❓ Unknown command. Use /help to see available commands.'
      );
  }
}

/**
 * Handle URL message
 */
async function handleUrlMessage(chatId: number, url: string) {
  try {
    // Check for duplicate
    const isDuplicate = await checkDuplicateUrl(url);

    if (isDuplicate) {
      await sendMessage(
        chatId,
        '⚠️ This URL already exists in your database!\n\nDo you want to save it again?',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Yes, save anyway', callback_data: `force_save:${url}` },
                { text: '❌ Cancel', callback_data: 'cancel' }
              ]
            ]
          }
        }
      );
      return;
    }

    // Store URL temporarily
    storeTempLink(chatId, url);

    // Send category buttons
    await sendCategoryButtons(chatId, '📎 URL received! Choose a category:');
  } catch (error) {
    console.error('Error handling URL:', error);
    await sendMessage(chatId, '❌ Error processing URL. Please try again.');
  }
}

/**
 * Handle callback query (button press)
 */
async function handleCallbackQuery(update: TelegramUpdate) {
  const callbackQuery = update.callback_query!;
  const chatId = callbackQuery.message?.chat.id!;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data || '';

  // Check authorization
  if (!isUserAuthorized(userId)) {
    await answerCallbackQuery(callbackQuery.id, 'Unauthorized');
    return;
  }

  // Handle cancel
  if (data === 'cancel') {
    removeTempLink(chatId);
    await answerCallbackQuery(callbackQuery.id, 'Cancelled');
    await sendMessage(chatId, '❌ Cancelled.');
    return;
  }

  // Handle force save
  if (data.startsWith('force_save:')) {
    const url = data.replace('force_save:', '');
    storeTempLink(chatId, url);
    await sendCategoryButtons(chatId, '📎 Choose a category:');
    await answerCallbackQuery(callbackQuery.id);
    return;
  }

  // Handle category selection
  if (data.startsWith('category:')) {
    const category = data.replace('category:', '');

    // Check if user wants to create a new category
    if (category === '__other__') {
      enableNewCategoryMode(chatId);
      await answerCallbackQuery(callbackQuery.id);
      await sendMessage(
        chatId,
        '✏️ *Enter new category name:*\n\nType the name for your new category.\nUse /cancel to cancel.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await handleCategorySelection(chatId, category, callbackQuery.id);
    return;
  }

  // Handle delete
  if (data.startsWith('delete:')) {
    const pageId = data.replace('delete:', '');
    await handleDeleteLink(chatId, pageId, callbackQuery.id);
    return;
  }

  await answerCallbackQuery(callbackQuery.id);
}

/**
 * Handle category selection
 */
async function handleCategorySelection(
  chatId: number,
  category: string,
  callbackQueryId: string
) {
  const url = getTempLink(chatId);

  if (!url) {
    await answerCallbackQuery(callbackQueryId, 'URL not found. Please send it again.');
    await sendMessage(chatId, '❌ Session expired. Please send the URL again.');
    return;
  }

  // Save to Notion
  const result = await saveToNotion(url, category);

  if (result.success) {
    await answerCallbackQuery(callbackQueryId, 'Saved successfully!');
    await sendMessage(
      chatId,
      `✅ *Link saved successfully!*\n\n📂 Category: ${category}\n🌐 ${url}`,
      { parse_mode: 'Markdown' }
    );
    removeTempLink(chatId);
  } else {
    await answerCallbackQuery(callbackQueryId, 'Error saving');
    await sendMessage(
      chatId,
      `❌ Error saving to Notion: ${result.error}\n\nPlease try again.`
    );
  }
}

/**
 * Handle new category name input
 */
async function handleNewCategoryInput(chatId: number, categoryName: string) {
  // Check for cancel
  if (categoryName.toLowerCase() === '/cancel') {
    disableNewCategoryMode(chatId);
    removeTempLink(chatId);
    await sendMessage(chatId, '❌ Cancelled.');
    return;
  }

  // Validate category name
  const trimmedName = categoryName.trim();
  if (trimmedName.length === 0) {
    await sendMessage(chatId, '⚠️ Category name cannot be empty. Please try again or use /cancel to cancel.');
    return;
  }

  if (trimmedName.length > 50) {
    await sendMessage(chatId, '⚠️ Category name is too long (max 50 characters). Please try again or use /cancel to cancel.');
    return;
  }

  // Get the stored URL
  const url = getTempLink(chatId);
  if (!url) {
    disableNewCategoryMode(chatId);
    await sendMessage(chatId, '❌ Session expired. Please send the URL again.');
    return;
  }

  // Add category to Notion database
  const categoryAdded = await addCategory(trimmedName);
  if (!categoryAdded) {
    await sendMessage(chatId, '❌ Error adding category to database. Please try again or use /cancel to cancel.');
    return;
  }

  // Save to Notion with new category
  const result = await saveToNotion(url, trimmedName);

  if (result.success) {
    await sendMessage(
      chatId,
      `✅ *Link saved successfully!*\n\n📂 Category: ${trimmedName} (NEW)\n🌐 ${url}`,
      { parse_mode: 'Markdown' }
    );
    disableNewCategoryMode(chatId);
    removeTempLink(chatId);
  } else {
    await sendMessage(
      chatId,
      `❌ Error saving to Notion: ${result.error}\n\nPlease try again or use /cancel to cancel.`
    );
  }
}

/**
 * Handle /list command
 */
async function handleListCommand(chatId: number) {
  try {
    const links = await getRecentLinks(10);

    if (links.length === 0) {
      await sendMessage(chatId, '📭 No links found in your database.');
      return;
    }

    await sendMessage(chatId, `📚 *Recent Links* (${links.length})\n`, {
      parse_mode: 'Markdown'
    });

    for (const link of links) {
      const formattedDate = formatDate(link.created);
      const text = `🔗 *${link.title}*\n📂 ${link.category}\n📅 ${formattedDate}\n🌐 ${link.url}`;

      await sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: createDeleteButton(link.id),
        disable_web_page_preview: true
      });
    }
  } catch (error) {
    console.error('Error listing links:', error);
    await sendMessage(chatId, '❌ Error fetching links. Please try again.');
  }
}

/**
 * Handle /search command
 */
async function handleSearchCommand(chatId: number) {
  enableSearchMode(chatId);
  await sendMessage(
    chatId,
    '🔍 *Search Mode Enabled*\n\nSend a keyword to search for links.\nUse /cancel to exit search mode.',
    { parse_mode: 'Markdown' }
  );
}

/**
 * Handle search query
 */
async function handleSearchQuery(chatId: number, keyword: string) {
  if (keyword.toLowerCase() === '/cancel') {
    disableSearchMode(chatId);
    await sendMessage(chatId, '❌ Search mode cancelled.');
    return;
  }

  try {
    const links = await searchLinks(keyword);

    disableSearchMode(chatId);

    if (links.length === 0) {
      await sendMessage(
        chatId,
        `🔍 No links found for: *${keyword}*`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await sendMessage(
      chatId,
      `🔍 *Search Results* (${links.length})\nKeyword: *${keyword}*\n`,
      { parse_mode: 'Markdown' }
    );

    for (const link of links) {
      const formattedDate = formatDate(link.created);
      const text = `🔗 *${link.title}*\n📂 ${link.category}\n📅 ${formattedDate}\n🌐 ${link.url}`;

      await sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: createDeleteButton(link.id),
        disable_web_page_preview: true
      });
    }
  } catch (error) {
    console.error('Error searching links:', error);
    disableSearchMode(chatId);
    await sendMessage(chatId, '❌ Error searching. Please try again.');
  }
}

/**
 * Handle delete link
 */
async function handleDeleteLink(
  chatId: number,
  pageId: string,
  callbackQueryId: string
) {
  try {
    const success = await deleteLink(pageId);

    if (success) {
      await answerCallbackQuery(callbackQueryId, 'Deleted successfully!');
      await sendMessage(chatId, '🗑️ Link deleted successfully!');
    } else {
      await answerCallbackQuery(callbackQueryId, 'Error deleting');
      await sendMessage(chatId, '❌ Error deleting link. Please try again.');
    }
  } catch (error) {
    console.error('Error deleting link:', error);
    await answerCallbackQuery(callbackQueryId, 'Error');
    await sendMessage(chatId, '❌ Error deleting link. Please try again.');
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram bot webhook is running'
  });
}
