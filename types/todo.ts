/**
 * Type definitions for ToDo bot
 */

export interface NotionTodo {
  id: string;           // Notion page ID
  title: string;        // Task description
  status: 'Pending' | 'Done';
  priority: 'High' | 'Medium' | 'Low';
  created: string;      // ISO date string
  nr?: number;          // Auto-incrementing record number
}

export interface EditModeState {
  pageId: string;
  field: 'title' | 'priority' | 'choice';  // 'choice' = showing edit options
}

export type TodoPriority = 'High' | 'Medium' | 'Low';
export type TodoStatus = 'Pending' | 'Done';
