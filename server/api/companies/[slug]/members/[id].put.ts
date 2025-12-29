import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * PUT /api/companies/:slug/members/:id
 * Update member role (admin only)
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

  // Check permission (super admin or admin)
  if (!user.isSuperAdmin) {
    const [userMembership] = await db
      .select()
      .from(schema.companyMembers)
      .where(
        and(
          eq(schema.companyMembers.companyId, company.id),
          eq(schema.companyMembers.userId, user.id)
        )
      )

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      throw createError({
        statusCode: 403,
        message: 'Only admins can update member roles',
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

  // Cannot change owner's role (unless you're super admin)
  if (targetMember.role === 'owner' && !user.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Cannot change the owner\'s role',
    })
  }

  const body = await readBody(event)
  const { role } = body

  // Validate role
  const validRoles = ['owner', 'admin', 'member']
  if (!role || !validRoles.includes(role)) {
    throw createError({
      statusCode: 400,
      message: `Role must be one of: ${validRoles.join(', ')}`,
    })
  }

  // Update member role
  await db
    .update(schema.companyMembers)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(eq(schema.companyMembers.id, memberId))

  return { message: 'Member role updated successfully' }
})

