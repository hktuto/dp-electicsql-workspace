import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * PUT /api/workspaces/:id
 * Update workspace
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
  const { name, slug, description, icon, menu } = body

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

  // Check if user has permission (company admin/owner)
  const membership = await db
    .select({ role: schema.companyMembers.role })
    .from(schema.companyMembers)
    .where(and(eq(schema.companyMembers.companyId, workspace.companyId), eq(schema.companyMembers.userId, user.userId)))
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
      message: 'Only company admins can update workspaces',
    })
  }

  // If slug is being changed, check uniqueness
  if (slug && slug !== workspace.slug) {
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw createError({
        statusCode: 400,
        message: 'Slug must be lowercase alphanumeric with hyphens only',
      })
    }

    const existing = await db
      .select({ id: schema.workspaces.id })
      .from(schema.workspaces)
      .where(and(eq(schema.workspaces.companyId, workspace.companyId), eq(schema.workspaces.slug, slug)))
      .limit(1)

    if (existing.length > 0) {
      throw createError({
        statusCode: 409,
        message: 'A workspace with this slug already exists in this company',
      })
    }
  }

  // Update workspace
  await db
    .update(schema.workspaces)
    .set({
      name: name || workspace.name,
      slug: slug || workspace.slug,
      description: description !== undefined ? description : workspace.description,
      icon: icon !== undefined ? icon : workspace.icon,
      menu: menu !== undefined ? menu : workspace.menu,
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

