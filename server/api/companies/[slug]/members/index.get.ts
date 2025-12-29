import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * GET /api/companies/:slug/members
 * List company members
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

  // Check access
  if (!user.isSuperAdmin) {
    const [membership] = await db
      .select()
      .from(schema.companyMembers)
      .where(
        and(
          eq(schema.companyMembers.companyId, company.id),
          eq(schema.companyMembers.userId, user.id)
        )
      )

    if (!membership) {
      throw createError({
        statusCode: 403,
        message: 'You do not have access to this company',
      })
    }
  }

  // Get members with user details
  const members = await db
    .select({
      id: schema.companyMembers.id,
      role: schema.companyMembers.role,
      createdAt: schema.companyMembers.createdAt,
      user: {
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        avatar: schema.users.avatar,
      },
    })
    .from(schema.companyMembers)
    .innerJoin(schema.users, eq(schema.companyMembers.userId, schema.users.id))
    .where(eq(schema.companyMembers.companyId, company.id))

  return { members }
})

