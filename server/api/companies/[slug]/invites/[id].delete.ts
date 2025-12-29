import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * DELETE /api/companies/:slug/invites/:id
 * Cancel invite (admin only)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = getRouterParam(event, 'slug')
  const inviteId = getRouterParam(event, 'id')

  if (!slug || !inviteId) {
    throw createError({
      statusCode: 400,
      message: 'Company slug and invite ID are required',
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

  // Check permission
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
        message: 'Only admins can cancel invites',
      })
    }
  }

  // Find invite
  const [invite] = await db
    .select()
    .from(schema.companyInvites)
    .where(eq(schema.companyInvites.id, inviteId))

  if (!invite || invite.companyId !== company.id) {
    throw createError({
      statusCode: 404,
      message: 'Invite not found',
    })
  }

  // Delete invite
  await db
    .delete(schema.companyInvites)
    .where(eq(schema.companyInvites.id, inviteId))

  return { message: 'Invite cancelled successfully' }
})

