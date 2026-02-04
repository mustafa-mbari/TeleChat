import { RATE_LIMIT } from './config';
import { EditModeState } from '@/types/todo';

/**
 * Edit mode state management
 * Map structure: chatId -> { pageId, field }
 */
const editMode = new Map<number, EditModeState>();

/**
 * Enable edit mode for a specific task
 */
export function enableEditMode(chatId: number, pageId: string, field: 'title' | 'priority' | 'choice'): void {
  editMode.set(chatId, { pageId, field });
}

/**
 * Disable edit mode for user
 */
export function disableEditMode(chatId: number): void {
  editMode.delete(chatId);
}

/**
 * Get edit mode state for user
 */
export function getEditMode(chatId: number): EditModeState | undefined {
  return editMode.get(chatId);
}

/**
 * Check if user is in edit mode
 */
export function isInEditMode(chatId: number): boolean {
  return editMode.has(chatId);
}

/**
 * Rate limiting implementation for ToDo bot
 * Map structure: userId -> array of timestamps
 */
const rateLimitMap = new Map<number, number[]>();

/**
 * Check if user has exceeded rate limit
 */
export function isRateLimited(userId: number): boolean {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];

  // Remove expired timestamps
  const validRequests = userRequests.filter(
    timestamp => now - timestamp < RATE_LIMIT.windowMs
  );

  // Update the map
  rateLimitMap.set(userId, validRequests);

  // Check if limit exceeded
  return validRequests.length >= RATE_LIMIT.maxRequests;
}

/**
 * Record a request for rate limiting
 */
export function recordRequest(userId: number): void {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];

  // Remove expired timestamps
  const validRequests = userRequests.filter(
    timestamp => now - timestamp < RATE_LIMIT.windowMs
  );

  // Add current request
  validRequests.push(now);

  // Update the map
  rateLimitMap.set(userId, validRequests);
}

/**
 * Get remaining requests for user
 */
export function getRemainingRequests(userId: number): number {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];

  // Remove expired timestamps
  const validRequests = userRequests.filter(
    timestamp => now - timestamp < RATE_LIMIT.windowMs
  );

  return Math.max(0, RATE_LIMIT.maxRequests - validRequests.length);
}

/**
 * Clear rate limit for a user (for admin/testing purposes)
 */
export function clearRateLimit(userId: number): void {
  rateLimitMap.delete(userId);
}

/**
 * Get memory statistics (for debugging)
 */
export function getMemoryStats() {
  return {
    editModeUsers: editMode.size,
    rateLimitedUsers: rateLimitMap.size
  };
}
