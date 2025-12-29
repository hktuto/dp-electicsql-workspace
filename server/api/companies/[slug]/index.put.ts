import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * PUT /api/companies/:slug
 * Update company (owner/admin only)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Company slug is required',
    })
  }

  // Find company
  const [company] = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.slug, slug))

  if (!company) {
    throw createError({
      statusCode: 404,
      message: 'Company not found',
    })
  }

  // Check permission (super admin, owner, or admin)
  if (!user.isSuperAdmin) {
    const [membership] = await db
      .select()
      .from(schema.companyMembers)
      .where(
        and(
          eq(schema.companyMembers.companyId, company.id),
          eq(schema.companyMembers.userId, user.userId)
        )
      )

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw createError({
        statusCode: 403,
        message: 'Only owners and admins can update company settings',
      })
    }
  }

  const body = await readBody(event)
  const { name, description, logo } = body

  // Validate required fields
  if (!name) {
    throw createError({
      statusCode: 400,
      message: 'Name is required',
    })
  }

  // Update company
  await db
    .update(schema.companies)
    .set({
      name,
      description: description || null,
      logo: logo || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.companies.id, company.id))

  // Fetch updated company
  const [updated] = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, company.id))

  return { company: updated }
})

