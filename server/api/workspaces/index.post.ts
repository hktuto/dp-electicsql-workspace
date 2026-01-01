import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth, getUpdateToken } from '~~/server/utils/auth'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * POST /api/workspaces
 * Create a new workspace
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { name, companyId, description, icon } = body

  // Validate required fields
  if (!name || !companyId) {
    throw createError({
      statusCode: 400,
      message: 'Name and companyId are required',
    })
  }

  // Auto-generate slug from name
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // Check if user is a member of the company
  const membership = await db
    .select({ role: schema.companyMembers.role })
    .from(schema.companyMembers)
    .where(
      and(
        eq(schema.companyMembers.companyId, companyId),
        eq(schema.companyMembers.userId, user.userId)
      )
    )
    .limit(1)

  if (membership.length === 0 && !user.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      message: 'You are not a member of this company',
    })
  }

  // Check if user has admin/owner role
  const userRole = membership[0]?.role
  if (!['owner', 'admin'].includes(userRole) && !user.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Only company admins can create workspaces',
    })
  }

  // Check if slug is unique within company, if not, append number
  let finalSlug = slug
  let counter = 1
  
  while (true) {
    const existing = await db
      .select({ id: schema.workspaces.id })
      .from(schema.workspaces)
      .where(
        and(
          eq(schema.workspaces.companyId, companyId),
          eq(schema.workspaces.slug, finalSlug)
        )
      )
      .limit(1)

    if (existing.length === 0) break
    
    finalSlug = `${slug}-${counter}`
    counter++
  }

  // Get all company members to initialize workspaceUsers
  const companyMembers = await db
    .select({ userId: schema.companyMembers.userId })
    .from(schema.companyMembers)
    .where(eq(schema.companyMembers.companyId, companyId))

  const workspaceUsers = companyMembers.map(m => m.userId)

  // Get update token from headers
  const updateToken = getUpdateToken(event)

  // Create workspace
  const workspaceId = generateUUID()
  
  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name,
    slug: finalSlug,
    description: description || null,
    icon: icon || null,
    menu: [],
    companyId,
    workspaceUsers,
    createdBy: user.userId,
    updateToken,
  })

  // Fetch created workspace
  const [workspace] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))

  return { workspace }
})

