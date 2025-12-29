import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * DELETE /api/companies/:slug/members/:id
 * Remove member from company (admin only)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = getRouterParam(event, 'slug')
  const memberId = getRouterParam(event, 'id')

  if (!slug || !memberId) {
    throw createError({
      statusCode: 400,
      message: 'Company slug and member ID are required',
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
    const [userMembership] = await db
      .select()
      .from(schema.companyMembers)
      .where(
        and(
          eq(schema.companyMembers.companyId, company.id),
          eq(schema.companyMembers.userId, user.userId)
        )
      )

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      throw createError({
        statusCode: 403,
        message: 'Only admins can remove members',
      })
    }
  }

  // Find target member
  const [targetMember] = await db
    .select()
    .from(schema.companyMembers)
    .where(eq(schema.companyMembers.id, memberId))

  if (!targetMember || targetMember.companyId !== company.id) {
    throw createError({
      statusCode: 404,
      message: 'Member not found',
    })
  }

  // Cannot remove the owner
  if (targetMember.role === 'owner') {
    throw createError({
      statusCode: 403,
      message: 'Cannot remove the owner from the company',
    })
  }

  // Cannot remove yourself (use leave endpoint instead)
  if (targetMember.userId === user.userId) {
    throw createError({
      statusCode: 400,
      message: 'Cannot remove yourself. Use the leave endpoint instead.',
    })
  }

  // Remove member
  await db
    .delete(schema.companyMembers)
    .where(eq(schema.companyMembers.id, memberId))

  // Update company's companyUsers array
  const remainingMembers = await db
    .select({ userId: schema.companyMembers.userId })
    .from(schema.companyMembers)
    .where(eq(schema.companyMembers.companyId, company.id))

  await db
    .update(schema.companies)
    .set({
      companyUsers: remainingMembers.map((m) => m.userId),
      updatedAt: new Date(),
    })
    .where(eq(schema.companies.id, company.id))

  return { message: 'Member removed successfully' }
})

