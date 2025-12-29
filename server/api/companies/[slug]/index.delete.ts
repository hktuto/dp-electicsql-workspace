import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * DELETE /api/companies/:slug
 * Delete company (owner only)
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

  // Check permission (super admin or owner only)
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

    if (!membership || membership.role !== 'owner') {
      throw createError({
        statusCode: 403,
        message: 'Only the owner can delete a company',
      })
    }
  }

  // Delete company (cascade will delete members, invites, etc.)
  await db
    .delete(schema.companies)
    .where(eq(schema.companies.id, company.id))

  return { message: 'Company deleted successfully' }
})

