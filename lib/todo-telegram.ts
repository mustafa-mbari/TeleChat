import type {
  TelegramSendMessageOptions,
  TelegramInlineKeyboardMarkup,
  TelegramInlineKeyboardButton
} from '@/types/telegram';
import { NotionTodo, TodoPriority } from '@/types/todo';
import { formatDate } from './todo-notion';

const BOT_TOKEN = process.env.BOT_TOKEN_TODO;
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
 * Get priority badge emoji
 */
function getPriorityBadge(priority: TodoPriority): string {
  switch (priority) {
    case 'High':
      return '🔴';
    case 'Medium':
      return '🟡';
    case 'Low':
      return '🟢';
    default:
      return '⚪';
  }
}

/**
 * Format todo for display
 */
export function formatTodoMessage(todo: NotionTodo): string {
  const priorityBadge = getPriorityBadge(todo.priority);
  const date = formatDate(todo.created);

  return `${priorityBadge} *${todo.priority}* | ${todo.title}\n📅 ${date}`;
}

/**
 * Create task action buttons (Mark Done, Edit, Delete)
 */
export function createTaskActionButtons(pageId: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ Mark Done',
          callback_data: `done:${pageId}`
        },
        {
          text: '✏️ Edit',
          callback_data: `edit:${pageId}`
        }
      ],
      [
        {
          text: '🗑️ Delete',
          callback_data: `delete:${pageId}`
        }
      ]
    ]
  };
}

/**
 * Create edit option buttons (Edit Title, Edit Priority, Cancel)
 */
export function createEditOptionButtons(pageId: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '📝 Edit Title',
          callback_data: `edit_title:${pageId}`
        },
        {
          text: '🎯 Edit Priority',
          callback_data: `edit_priority:${pageId}`
        }
      ],
      [
        {
          text: '❌ Cancel',
          callback_data: 'cancel'
        }
      ]
    ]
  };
}

/**
 * Create priority selection buttons (High, Medium, Low, Cancel)
 */
export function createPriorityButtons(pageId: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '🔴 High',
          callback_data: `priority:${pageId}:High`
        },
        {
          text: '🟡 Medium',
          callback_data: `priority:${pageId}:Medium`
        }
      ],
      [
        {
          text: '🟢 Low',
          callback_data: `priority:${pageId}:Low`
        }
      ],
      [
        {
          text: '❌ Cancel',
          callback_data: 'cancel'
        }
      ]
    ]
  };
}

/**
 * Send help message
 */
export async function sendHelpMessage(chatId: number): Promise<boolean> {
  const helpText = `
*ToDo Bot - Notion Task Manager*

*Quick Commands:*
• Send any text → Create a new task
• Send *l* → List all pending tasks
• /start or /help → Show this message
• /cancel → Cancel current operation

*Priority Levels:*
🔴 High - Urgent tasks
🟡 Medium - Normal tasks (default)
🟢 Low - Non-urgent tasks

*Task Actions:*
Each task has buttons to:
✅ Mark as done
✏️ Edit (title or priority)
🗑️ Delete

*How to use:*
1️⃣ Send a task description
2️⃣ Task created with Medium priority
3️⃣ Use buttons to manage your tasks

*Examples:*
\`Buy groceries\` - Creates a task
\`l\` - Lists all pending tasks

_Bot Version 1.0_
  `.trim();

  return await sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}
