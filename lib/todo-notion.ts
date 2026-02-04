import { Client } from '@notionhq/client';
import { NotionTodo, TodoPriority, TodoStatus } from '@/types/todo';

const notion = new Client({
  auth: process.env.NOTION_SECRET
});

const databaseId = process.env.NOTION_TODO_DB_ID!;

/**
 * Create a new todo in Notion database
 */
export async function createTodo(
  title: string,
  priority: TodoPriority = 'Medium'
): Promise<{ success: boolean; pageId?: string; todo?: NotionTodo; error?: string }> {
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Title: {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        },
        Status: {
          select: {
            name: 'Pending'
          }
        },
        Priority: {
          select: {
            name: priority
          }
        },
        Created: {
          date: {
            start: new Date().toISOString()
          }
        }
      }
    });

    const todo = extractTodoFromPage(response);
    return { success: true, pageId: response.id, todo };
  } catch (error) {
    console.error('Error creating todo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all pending todos from Notion
 */
export async function getPendingTodos(): Promise<NotionTodo[]> {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Status',
        select: {
          equals: 'Pending'
        }
      },
      sorts: [
        {
          property: 'Created',
          direction: 'descending'
        }
      ]
    });

    return response.results.map(page => extractTodoFromPage(page));
  } catch (error) {
    console.error('Error getting pending todos:', error);
    return [];
  }
}

/**
 * Update todo title
 */
export async function updateTodoTitle(
  pageId: string,
  newTitle: string
): Promise<{ success: boolean; todo?: NotionTodo; error?: string }> {
  try {
    const response = await notion.pages.update({
      page_id: pageId,
      properties: {
        Title: {
          title: [
            {
              text: {
                content: newTitle
              }
            }
          ]
        }
      }
    });

    const todo = extractTodoFromPage(response);
    return { success: true, todo };
  } catch (error) {
    console.error('Error updating todo title:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update todo priority
 */
export async function updateTodoPriority(
  pageId: string,
  priority: TodoPriority
): Promise<{ success: boolean; todo?: NotionTodo; error?: string }> {
  try {
    const response = await notion.pages.update({
      page_id: pageId,
      properties: {
        Priority: {
          select: {
            name: priority
          }
        }
      }
    });

    const todo = extractTodoFromPage(response);
    return { success: true, todo };
  } catch (error) {
    console.error('Error updating todo priority:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Mark todo as done
 */
export async function markTodoDone(
  pageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        Status: {
          select: {
            name: 'Done'
          }
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking todo as done:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a todo (archive)
 */
export async function deleteTodo(pageId: string): Promise<boolean> {
  try {
    await notion.pages.update({
      page_id: pageId,
      archived: true
    });
    return true;
  } catch (error) {
    console.error('Error deleting todo:', error);
    return false;
  }
}

/**
 * Extract todo data from Notion page object
 */
function extractTodoFromPage(page: any): NotionTodo {
  const properties = page.properties;

  // Extract title
  let title = 'Untitled';
  if (properties.Title?.title?.[0]?.text?.content) {
    title = properties.Title.title[0].text.content;
  }

  // Extract status
  let status: TodoStatus = 'Pending';
  if (properties.Status?.select?.name) {
    status = properties.Status.select.name as TodoStatus;
  }

  // Extract priority
  let priority: TodoPriority = 'Medium';
  if (properties.Priority?.select?.name) {
    priority = properties.Priority.select.name as TodoPriority;
  }

  // Extract created time
  let created = '';
  if (properties.Created?.created_time) {
    created = properties.Created.created_time;
  } else if (properties.Created?.date?.start) {
    created = properties.Created.date.start;
  }

  return {
    id: page.id,
    title,
    status,
    priority,
    created
  };
}

/**
 * Format date for display
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
