import { eq } from 'drizzle-orm'
import { dataTables } from 'hub:db:schema'

export default defineEventHandler(async (event) => {
  // Auth check
  await requireAuth(event)
  
  const workspaceId = getRouterParam(event, 'workspaceId')
  const tableId = getRouterParam(event, 'id')
  
  if (!workspaceId || !tableId) {
    throw createError({ statusCode: 400, message: 'Workspace ID and Table ID are required' })
  }

  const body = await readBody(event)
  const { name, slug, description, icon, formJson, cardJson, dashboardJson, listJson } = body

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

  // Update metadata (not physical table)
  const updated = await db.update(dataTables)
    .set({
      ...(name && { name }),
      ...(slug && { slug }),
      ...(description !== undefined && { description }),
      ...(icon !== undefined && { icon }),
      ...(formJson !== undefined && { formJson }),
      ...(cardJson !== undefined && { cardJson }),
      ...(dashboardJson !== undefined && { dashboardJson }),
      ...(listJson !== undefined && { listJson }),
      updatedAt: new Date(),
    })
    .where(eq(dataTables.id, tableId))
    .returning()
    .get()

  return {
    success: true,
    table: updated,
  }
})

