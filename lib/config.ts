/**
 * Bot Configuration
 *
 * To add new categories:
 * 1. Add the category name to the CATEGORIES array below
 * 2. Make sure the same category exists in your Notion database's Category select property
 */

export const CATEGORIES = [
  'Work',
  'Study',
  'Video',
  'Other'
] as const;

export type Category = typeof CATEGORIES[number];

/**
 * Rate limiting configuration
 * maxRequests: Maximum number of requests per user
 * windowMs: Time window in milliseconds
 */
export const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60000 // 1 minute
};

/**
 * Get allowed user IDs from environment variable
 * Format: comma-separated list of user IDs
 * Example: ALLOWED_USER_IDS=123456789,987654321
 */
export function getAllowedUserIds(): number[] {
  const userIds = process.env.ALLOWED_USER_IDS || '';
  return userIds
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id));
}

/**
 * Check if user is authorized
 */
export function isUserAuthorized(userId: number): boolean {
  const allowedUsers = getAllowedUserIds();
  return allowedUsers.length === 0 || allowedUsers.includes(userId);
}
