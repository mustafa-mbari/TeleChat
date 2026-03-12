import { RATE_LIMIT } from './config';

/**
 * Temporary storage for pending URLs
 * Map structure: chatId -> url
 */
const tempLinks = new Map<number, string>();

/**
 * Store URL temporarily until user selects category
 */
export function storeTempLink(chatId: number, url: string): void {
  tempLinks.set(chatId, url);
}

/**
 * Get temporarily stored URL
 */
export function getTempLink(chatId: number): string | undefined {
  return tempLinks.get(chatId);
}

/**
 * Remove temporarily stored URL
 */
export function removeTempLink(chatId: number): void {
  tempLinks.delete(chatId);
}

/**
 * Clear all temporary links (for maintenance)
 */
export function clearAllTempLinks(): void {
  tempLinks.clear();
}

/**
 * Rate limiting implementation
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
 * Search state management
 * Map structure: chatId -> search mode (true/false)
 */
const searchMode = new Map<number, boolean>();

/**
 * Enable search mode for user
 */
export function enableSearchMode(chatId: number): void {
  searchMode.set(chatId, true);
}

/**
 * Disable search mode for user
 */
export function disableSearchMode(chatId: number): void {
  searchMode.delete(chatId);
}

/**
 * Check if user is in search mode
 */
export function isInSearchMode(chatId: number): boolean {
  return searchMode.get(chatId) || false;
}

/**
 * Delete state management
 * Map structure: chatId -> waiting for page ID
 */
const deleteMode = new Map<number, boolean>();

/**
 * Enable delete mode for user
 */
export function enableDeleteMode(chatId: number): void {
  deleteMode.set(chatId, true);
}

/**
 * Disable delete mode for user
 */
export function disableDeleteMode(chatId: number): void {
  deleteMode.delete(chatId);
}

/**
 * Check if user is in delete mode
 */
export function isInDeleteMode(chatId: number): boolean {
  return deleteMode.get(chatId) || false;
}

/**
 * New category mode - waiting for user to input new category name
 * Map structure: chatId -> true/false
 */
const newCategoryMode = new Map<number, boolean>();

/**
 * Enable new category mode for user
 */
export function enableNewCategoryMode(chatId: number): void {
  newCategoryMode.set(chatId, true);
}

/**
 * Disable new category mode for user
 */
export function disableNewCategoryMode(chatId: number): void {
  newCategoryMode.delete(chatId);
}

/**
 * Check if user is in new category mode
 */
export function isInNewCategoryMode(chatId: number): boolean {
  return newCategoryMode.get(chatId) || false;
}

/**
 * Get memory statistics (for debugging)
 */
export function getMemoryStats() {
  return {
    tempLinks: tempLinks.size,
    rateLimitedUsers: rateLimitMap.size,
    searchModeUsers: searchMode.size,
    deleteModeUsers: deleteMode.size,
    newCategoryModeUsers: newCategoryMode.size
  };
}
