import { NextRequest, NextResponse } from 'next/server';
import type { TelegramUpdate } from '@/types/telegram';
import {
  sendMessage,
  answerCallbackQuery,
  sendHelpMessage,
  formatTodoMessage,
  createTaskActionButtons,
  createEditOptionButtons,
  createPriorityButtons
} from '@/lib/todo-telegram';
import {
  createTodo,
  getPendingTodos,
  updateTodoTitle,
  updateTodoPriority,
  markTodoDone,
  deleteTodo
} from '@/lib/todo-notion';
import {
  isRateLimited,
  recordRequest,
  getRemainingRequests,
  enableEditMode,
  disableEditMode,
  getEditMode,
  isInEditMode
} from '@/lib/todo-memory';
import { isUserAuthorized } from '@/lib/config';
import { TodoPriority } from '@/types/todo';

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
    await handleCommand(chatId, text);
    return;
  }

  // Handle list command shortcut
  if (text.toLowerCase() === 'l') {
    await handleListCommand(chatId);
    return;
  }

  // Handle edit title mode
  if (isInEditMode(chatId)) {
    const editState = getEditMode(chatId);
    if (editState?.field === 'title') {
      await handleEditTitleInput(chatId, text, editState.pageId);
      return;
    }
  }

  // Default: Create new todo
  await handleCreateTask(chatId, text);
}

/**
 * Handle commands
 */
async function handleCommand(chatId: number, command: string) {
  const cmd = command.toLowerCase().split(' ')[0];

  switch (cmd) {
    case '/start':
      await sendHelpMessage(chatId);
      break;

    case '/help':
      await sendHelpMessage(chatId);
      break;

    case '/cancel':
      if (isInEditMode(chatId)) {
        disableEditMode(chatId);
        await sendMessage(chatId, '❌ Edit cancelled.');
      } else {
        await sendMessage(chatId, 'ℹ️ Nothing to cancel.');
      }
      break;

    default:
      await sendMessage(
        chatId,
        '❓ Unknown command. Use /help to see available commands.'
      );
  }
}

/**
 * Create new task
 */
async function handleCreateTask(chatId: number, text: string) {
  try {
    // Validate task text
    if (text.length === 0) {
      await sendMessage(chatId, '⚠️ Task cannot be empty.');
      return;
    }

    if (text.length > 500) {
      await sendMessage(chatId, '⚠️ Task is too long (max 500 characters).');
      return;
    }

    // Create todo with default Medium priority
    const result = await createTodo(text, 'Medium');

    if (result.success && result.todo) {
      const formattedTodo = formatTodoMessage(result.todo);
      await sendMessage(
        chatId,
        `✅ *Task created!*\n\n${formattedTodo}`,
        {
          parse_mode: 'Markdown',
          reply_markup: createTaskActionButtons(result.todo.id)
        }
      );
    } else {
      await sendMessage(
        chatId,
        `❌ Error creating task: ${result.error}\n\nPlease try again.`
      );
    }
  } catch (error) {
    console.error('Error creating task:', error);
    await sendMessage(chatId, '❌ Error creating task. Please try again.');
  }
}

/**
 * Handle list command ('l')
 */
async function handleListCommand(chatId: number) {
  try {
    const todos = await getPendingTodos();

    if (todos.length === 0) {
      await sendMessage(chatId, '📋 No pending tasks!');
      return;
    }

    await sendMessage(
      chatId,
      `📋 *Pending Tasks* (${todos.length})\n`,
      { parse_mode: 'Markdown' }
    );

    for (const todo of todos) {
      const formattedTodo = formatTodoMessage(todo);
      await sendMessage(
        chatId,
        formattedTodo,
        {
          parse_mode: 'Markdown',
          reply_markup: createTaskActionButtons(todo.id)
        }
      );
    }
  } catch (error) {
    console.error('Error listing tasks:', error);
    await sendMessage(chatId, '❌ Error fetching tasks. Please try again.');
  }
}

/**
 * Handle edit title input
 */
async function handleEditTitleInput(chatId: number, newTitle: string, pageId: string) {
  try {
    // Check for cancel
    if (newTitle.toLowerCase() === '/cancel') {
      disableEditMode(chatId);
      await sendMessage(chatId, '❌ Edit cancelled.');
      return;
    }

    // Validate title
    if (newTitle.length === 0) {
      await sendMessage(chatId, '⚠️ Title cannot be empty. Please try again or use /cancel to cancel.');
      return;
    }

    if (newTitle.length > 500) {
      await sendMessage(chatId, '⚠️ Title is too long (max 500 characters). Please try again or use /cancel to cancel.');
      return;
    }

    // Update title
    const result = await updateTodoTitle(pageId, newTitle);

    if (result.success && result.todo) {
      disableEditMode(chatId);
      const formattedTodo = formatTodoMessage(result.todo);
      await sendMessage(
        chatId,
        `✅ *Task updated!*\n\n${formattedTodo}`,
        {
          parse_mode: 'Markdown',
          reply_markup: createTaskActionButtons(result.todo.id)
        }
      );
    } else {
      await sendMessage(
        chatId,
        `❌ Error updating task: ${result.error}\n\nPlease try again or use /cancel to cancel.`
      );
    }
  } catch (error) {
    console.error('Error updating task title:', error);
    await sendMessage(chatId, '❌ Error updating task. Please try again or use /cancel to cancel.');
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
    disableEditMode(chatId);
    await answerCallbackQuery(callbackQuery.id, 'Cancelled');
    await sendMessage(chatId, '❌ Cancelled.');
    return;
  }

  // Handle mark as done
  if (data.startsWith('done:')) {
    const pageId = data.replace('done:', '');
    await handleMarkDone(chatId, pageId, callbackQuery.id);
    return;
  }

  // Handle delete
  if (data.startsWith('delete:')) {
    const pageId = data.replace('delete:', '');
    await handleDeleteTask(chatId, pageId, callbackQuery.id);
    return;
  }

  // Handle edit - show options
  if (data.startsWith('edit:')) {
    const pageId = data.replace('edit:', '');
    enableEditMode(chatId, pageId, 'choice');
    await answerCallbackQuery(callbackQuery.id);
    await sendMessage(
      chatId,
      '✏️ *What would you like to edit?*',
      {
        parse_mode: 'Markdown',
        reply_markup: createEditOptionButtons(pageId)
      }
    );
    return;
  }

  // Handle edit title
  if (data.startsWith('edit_title:')) {
    const pageId = data.replace('edit_title:', '');
    enableEditMode(chatId, pageId, 'title');
    await answerCallbackQuery(callbackQuery.id);
    await sendMessage(
      chatId,
      '📝 *Send new title for this task:*\n\nUse /cancel to cancel.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Handle edit priority - show priority buttons
  if (data.startsWith('edit_priority:')) {
    const pageId = data.replace('edit_priority:', '');
    enableEditMode(chatId, pageId, 'priority');
    await answerCallbackQuery(callbackQuery.id);
    await sendMessage(
      chatId,
      '🎯 *Select new priority:*',
      {
        parse_mode: 'Markdown',
        reply_markup: createPriorityButtons(pageId)
      }
    );
    return;
  }

  // Handle priority selection
  if (data.startsWith('priority:')) {
    const parts = data.split(':');
    if (parts.length === 3) {
      const pageId = parts[1];
      const priority = parts[2] as TodoPriority;
      await handlePrioritySelection(chatId, pageId, priority, callbackQuery.id);
      return;
    }
  }

  await answerCallbackQuery(callbackQuery.id);
}

/**
 * Handle mark task as done
 */
async function handleMarkDone(
  chatId: number,
  pageId: string,
  callbackQueryId: string
) {
  try {
    const result = await markTodoDone(pageId);

    if (result.success) {
      await answerCallbackQuery(callbackQueryId, 'Marked as done!');
      await sendMessage(chatId, '✅ Task marked as done!');
    } else {
      await answerCallbackQuery(callbackQueryId, 'Error');
      await sendMessage(
        chatId,
        `❌ Error marking task as done: ${result.error}\n\nPlease try again.`
      );
    }
  } catch (error) {
    console.error('Error marking task as done:', error);
    await answerCallbackQuery(callbackQueryId, 'Error');
    await sendMessage(chatId, '❌ Error marking task as done. Please try again.');
  }
}

/**
 * Handle delete task
 */
async function handleDeleteTask(
  chatId: number,
  pageId: string,
  callbackQueryId: string
) {
  try {
    const success = await deleteTodo(pageId);

    if (success) {
      await answerCallbackQuery(callbackQueryId, 'Deleted!');
      await sendMessage(chatId, '🗑️ Task deleted successfully!');
    } else {
      await answerCallbackQuery(callbackQueryId, 'Error');
      await sendMessage(chatId, '❌ Error deleting task. Please try again.');
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    await answerCallbackQuery(callbackQueryId, 'Error');
    await sendMessage(chatId, '❌ Error deleting task. Please try again.');
  }
}

/**
 * Handle priority selection
 */
async function handlePrioritySelection(
  chatId: number,
  pageId: string,
  priority: TodoPriority,
  callbackQueryId: string
) {
  try {
    const result = await updateTodoPriority(pageId, priority);

    if (result.success && result.todo) {
      disableEditMode(chatId);
      await answerCallbackQuery(callbackQueryId, 'Priority updated!');
      const formattedTodo = formatTodoMessage(result.todo);
      await sendMessage(
        chatId,
        `✅ *Priority updated!*\n\n${formattedTodo}`,
        {
          parse_mode: 'Markdown',
          reply_markup: createTaskActionButtons(result.todo.id)
        }
      );
    } else {
      await answerCallbackQuery(callbackQueryId, 'Error');
      await sendMessage(
        chatId,
        `❌ Error updating priority: ${result.error}\n\nPlease try again.`
      );
    }
  } catch (error) {
    console.error('Error updating priority:', error);
    await answerCallbackQuery(callbackQueryId, 'Error');
    await sendMessage(chatId, '❌ Error updating priority. Please try again.');
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    bot: 'todo'
  });
}
