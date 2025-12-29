import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * GET /api/companies/:slug
 * Get company details (company members only)
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

  // Check access (super admin or company member)
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

    if (!membership) {
      throw createError({
        statusCode: 403,
        message: 'You do not have access to this company',
      })
    }
  }

  return { company }
})

