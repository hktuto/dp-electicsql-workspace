import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * DELETE /api/workspaces/:id
 * Delete workspace
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Workspace ID is required',
    })
  }

  // Get workspace
  const [workspace] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, id))
    .limit(1)

  if (!workspace) {
    throw createError({
      statusCode: 404,
      message: 'Workspace not found',
    })
  }

  // Check if user has permission (company owner/admin)
  const membership = await db
    .select({ role: schema.companyMembers.role })
    .from(schema.companyMembers)
    .where(eq(schema.companyMembers.companyId, workspace.companyId))
    .where(eq(schema.companyMembers.userId, user.id))
    .limit(1)

  if (membership.length === 0 && !user.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      message: 'You are not a member of this company',
    })
  }

  const userRole = membership[0]?.role
  if (!['owner', 'admin'].includes(userRole) && !user.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Only company admins can delete workspaces',
    })
  }

  // Delete workspace (cascades to related records)
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, id))

  return { success: true }
})

