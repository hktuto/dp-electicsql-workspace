import { eq } from 'drizzle-orm'
import { dataTables } from 'hub:db:schema'
import { generateDropTableSql, executeSql } from '~~/server/utils/dynamic-table'

export default defineEventHandler(async (event) => {
  // Auth check
  await requireAuth(event)
  
  const workspaceId = getRouterParam(event, 'workspaceId')
  const tableId = getRouterParam(event, 'id')
  
  if (!workspaceId || !tableId) {
    throw createError({ statusCode: 400, message: 'Workspace ID and Table ID are required' })
  }

  const db = hubDatabase()

  // Verify table exists and belongs to workspace
  const existing = await db.select()
    .from(dataTables)
    .where(eq(dataTables.id, tableId))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Table not found' })
  }

  if (existing.workspaceId !== workspaceId) {
    throw createError({ statusCode: 403, message: 'Table does not belong to this workspace' })
  }

  try {
    // Drop physical table
    const dropSql = generateDropTableSql(existing.tableName)
    await executeSql(dropSql)

    // Delete metadata (cascades to columns and migrations)
    await db.delete(dataTables).where(eq(dataTables.id, tableId))

    return {
      success: true,
      message: 'Table deleted successfully',
    }
  } catch (error: any) {
    console.error('Failed to delete table:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to delete table: ${error.message}`,
    })
  }
})

