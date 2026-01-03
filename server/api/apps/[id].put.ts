import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { apps as defaultApps } from '@/data/apps'
import type { AppNode } from '@/utils/type/apps'

/**
 * PUT /api/apps/:id
 * 
 * Updates an app by id. Reads from apps.ts (or apps.json if it exists for runtime modifications).
 * Writes updates back to apps.json (runtime modifications layer).
 * Body should contain the full app object to replace.
 */
export default defineEventHandler(async (event) => {
  const appId = getRouterParam(event, 'id')

  if (!appId) {
    throw createError({
      statusCode: 400,
      message: 'Missing app id',
    })
  }

  const body = await readBody(event)
  const appContent = body as AppNode

  if (!appContent) {
    throw createError({
      statusCode: 400,
      message: 'Missing app content in body',
    })
  }

  // Ensure the id in the content matches the URL param
  if (appContent.id && appContent.id !== appId) {
    throw createError({
      statusCode: 400,
      message: 'App id in body does not match URL parameter',
    })
  }

  // Set id if not provided
  if (!appContent.id) {
    appContent.id = appId
  }

  try {
    const appsJsonPath = join(process.cwd(), 'app', 'data', 'apps.json')

    // Read existing apps: prefer JSON (runtime modifications) over TS (default)
    let apps: AppNode[] = [...defaultApps]
    try {
      const fileContent = await readFile(appsJsonPath, 'utf-8')
      apps = JSON.parse(fileContent) as AppNode[]
    } catch (error: any) {
      // If JSON doesn't exist, use default from TS file
      if (error.code !== 'ENOENT') {
        throw error
      }
    }

    // Find app index
    const appIndex = apps.findIndex((app) => app.id === appId)

    if (appIndex === -1) {
      // App not found, add it
      apps.push(appContent)
    } else {
      // Update existing app
      apps[appIndex] = appContent
    }

    // Write back to JSON file (runtime modifications layer)
    await writeFile(appsJsonPath, JSON.stringify(apps, null, 2), 'utf-8')

    return {
      success: true,
      app: appContent,
    }
  } catch (error: any) {
    console.error('[Apps Update API] Error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to update app: ${error.message}`,
    })
  }
})

