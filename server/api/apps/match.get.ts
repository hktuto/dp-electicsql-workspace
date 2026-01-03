import { apps } from '@/data/apps'

/**
 * GET /api/apps/match?url=/app1/workspace
 * 
 * Finds the first app where baseUrl matches the start of the provided URL.
 * Returns the app object or null if no match.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const url = query.url as string

  if (!url) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameter: url',
    })
  }

  // Normalize URL - ensure it starts with /
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`

  try {
    // Import apps from type-safe TypeScript file

    // Find first app where baseUrl matches the start of the URL
    // Sort by baseUrl length (longest first) to match more specific routes first
    const appsWithBaseUrl = apps
      .filter((app) => app.baseUrl)
      .map((app) => {
        const normalizedBaseUrl = app.baseUrl.startsWith('/') ? app.baseUrl : `/${app.baseUrl}`
        return { app, normalizedBaseUrl, length: normalizedBaseUrl.length }
      })
      .sort((a, b) => b.length - a.length) // Sort by length descending

    const matched = appsWithBaseUrl.find(({ normalizedBaseUrl }) => 
      normalizedUrl.startsWith(normalizedBaseUrl)
    )

    const matchedApp = matched?.app

    if (!matchedApp) {
      return { app: null }
    }

    return { app: matchedApp }
  } catch (error: any) {
    console.error('[Apps Match API] Error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to match app: ${error.message}`,
    })
  }
})

