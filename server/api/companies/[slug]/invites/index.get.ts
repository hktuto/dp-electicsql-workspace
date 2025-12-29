import { eq, and, isNull } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * GET /api/companies/:slug/invites
 * List pending invites (admin only)
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

  // Check permission (super admin or admin)
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

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw createError({
        statusCode: 403,
        message: 'Only admins can view invites',
      })
    }
  }

  // Get pending invites (not accepted)
  const invites = await db
    .select({
      id: schema.companyInvites.id,
      email: schema.companyInvites.email,
      role: schema.companyInvites.role,
      expiresAt: schema.companyInvites.expiresAt,
      createdAt: schema.companyInvites.createdAt,
      invitedBy: {
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
      },
    })
    .from(schema.companyInvites)
    .innerJoin(schema.users, eq(schema.companyInvites.invitedBy, schema.users.id))
    .where(
      and(
        eq(schema.companyInvites.companyId, company.id),
        isNull(schema.companyInvites.acceptedAt)
      )
    )

  return { invites }
})

