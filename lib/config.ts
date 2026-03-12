/**
 * Bot Configuration
 */

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
