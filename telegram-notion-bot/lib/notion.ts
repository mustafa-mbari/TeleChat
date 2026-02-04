import { Client } from '@notionhq/client';
import type { Category } from './config';

const notion = new Client({
  auth: process.env.NOTION_SECRET
});

const databaseId = process.env.NOTION_DB_ID!;

export interface NotionLink {
  id: string;
  title: string;
  url: string;
  category: string;
  created: string;
}

/**
 * Save a link to Notion database
 */
export async function saveToNotion(
  url: string,
  category: Category,
  title?: string
): Promise<{ success: boolean; pageId?: string; error?: string }> {
  try {
    // Use URL as title if no title provided
    const pageTitle = title || new URL(url).hostname;

    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Title: {
          title: [
            {
              text: {
                content: pageTitle
              }
            }
          ]
        },
        URL: {
          url: url
        },
        Category: {
          select: {
            name: category
          }
        }
      }
    });

    return { success: true, pageId: response.id };
  } catch (error) {
    console.error('Error saving to Notion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if URL already exists in database
 */
export async function checkDuplicateUrl(url: string): Promise<boolean> {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'URL',
        url: {
          equals: url
        }
      }
    });

    return response.results.length > 0;
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return false;
  }
}

/**
 * Get recent links from Notion
 */
export async function getRecentLinks(limit: number = 10): Promise<NotionLink[]> {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: limit,
      sorts: [
        {
          property: 'Created',
          direction: 'descending'
        }
      ]
    });

    return response.results.map(page => extractLinkFromPage(page));
  } catch (error) {
    console.error('Error getting recent links:', error);
    return [];
  }
}

/**
 * Search links by keyword
 */
export async function searchLinks(keyword: string): Promise<NotionLink[]> {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        or: [
          {
            property: 'Title',
            title: {
              contains: keyword
            }
          },
          {
            property: 'URL',
            url: {
              contains: keyword
            }
          }
        ]
      }
    });

    return response.results.map(page => extractLinkFromPage(page));
  } catch (error) {
    console.error('Error searching links:', error);
    return [];
  }
}

/**
 * Delete a link from Notion
 */
export async function deleteLink(pageId: string): Promise<boolean> {
  try {
    await notion.pages.update({
      page_id: pageId,
      archived: true
    });
    return true;
  } catch (error) {
    console.error('Error deleting link:', error);
    return false;
  }
}

/**
 * Extract link data from Notion page object
 */
function extractLinkFromPage(page: any): NotionLink {
  const properties = page.properties;

  // Extract title
  let title = 'Untitled';
  if (properties.Title?.title?.[0]?.text?.content) {
    title = properties.Title.title[0].text.content;
  }

  // Extract URL
  let url = '';
  if (properties.URL?.url) {
    url = properties.URL.url;
  }

  // Extract category
  let category = 'Other';
  if (properties.Category?.select?.name) {
    category = properties.Category.select.name;
  }

  // Extract created time
  let created = '';
  if (properties.Created?.created_time) {
    created = properties.Created.created_time;
  }

  return {
    id: page.id,
    title,
    url,
    category,
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
