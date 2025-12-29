import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'
import type { MenuItem } from '~~/server/db/schema/workspaces'

/**
 * PUT /api/workspaces/:id/menu
 * Update workspace menu structure
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

  const body = await readBody(event)
  const { menu } = body

  if (!Array.isArray(menu)) {
    throw createError({
      statusCode: 400,
      message: 'Menu must be an array',
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

  // Check if user has permission (company member with edit rights)
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

  // Update menu
  await db
    .update(schema.workspaces)
    .set({
      menu: menu as MenuItem[],
      updatedAt: new Date(),
    })
    .where(eq(schema.workspaces.id, id))

  // Fetch updated workspace
  const [updated] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, id))

  return { workspace: updated }
})

