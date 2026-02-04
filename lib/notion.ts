import { Client } from '@notionhq/client';
import type { Category } from './config';

const notion = new Client({
  auth: process.env.NOTION_SECRET
});

const databaseId = process.env.NOTION_DB_ID!;

/**
 * Get the maximum Nr value from the database
 */
async function getMaxNr(): Promise<number> {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 1,
      sorts: [
        {
          property: 'Nr',
          direction: 'descending'
        }
      ]
    });

    if (response.results.length > 0) {
      const page = response.results[0] as any;
      const nrValue = page.properties.Nr?.number;
      return nrValue || 0;
    }

    return 0;
  } catch (error) {
    console.error('Error getting max Nr:', error);
    return 0;
  }
}

export interface NotionLink {
  id: string;
  title: string;
  url: string;
  category: string;
  created: string;
  nr?: number;
}

/**
 * Save a link to Notion database
 */
export async function saveToNotion(
  url: string,
  category: string,
  title?: string
): Promise<{ success: boolean; pageId?: string; error?: string }> {
  try {
    // Use URL as title if no title provided
    const pageTitle = title || new URL(url).hostname;

    // Get the next Nr value
    const maxNr = await getMaxNr();
    const nextNr = maxNr + 1;

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
        },
        Created: {
          date: {
            start: new Date().toISOString()
          }
        },
        Nr: {
          number: nextNr
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
 * Get all available categories from Notion database
 */
export async function getCategories(): Promise<string[]> {
  try {
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });

    const categoryProperty = (database as any).properties.Category;

    if (categoryProperty?.type === 'select' && categoryProperty.select?.options) {
      return categoryProperty.select.options.map((option: any) => option.name);
    }

    return [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Add a new category to Notion database
 */
export async function addCategory(categoryName: string): Promise<boolean> {
  try {
    // First, get current categories
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });

    const categoryProperty = (database as any).properties.Category;

    if (categoryProperty?.type !== 'select') {
      console.error('Category property is not a select type');
      return false;
    }

    const currentOptions = categoryProperty.select?.options || [];

    // Check if category already exists
    const exists = currentOptions.some((opt: any) =>
      opt.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (exists) {
      return true; // Already exists, consider it success
    }

    // Add new category option
    const updatedOptions = [
      ...currentOptions,
      { name: categoryName }
    ];

    await notion.databases.update({
      database_id: databaseId,
      properties: {
        Category: {
          select: {
            options: updatedOptions
          }
        }
      }
    });

    return true;
  } catch (error) {
    console.error('Error adding category:', error);
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

  // Extract created time (supports both created_time and date types)
  let created = '';
  if (properties.Created?.created_time) {
    created = properties.Created.created_time;
  } else if (properties.Created?.date?.start) {
    created = properties.Created.date.start;
  }

  // Extract Nr
  let nr: number | undefined;
  if (properties.Nr?.number !== undefined && properties.Nr?.number !== null) {
    nr = properties.Nr.number;
  }

  return {
    id: page.id,
    title,
    url,
    category,
    created,
    nr
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
