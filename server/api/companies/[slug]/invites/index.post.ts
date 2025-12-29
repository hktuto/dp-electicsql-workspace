import { eq, and, isNull, gt } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * POST /api/companies/:slug/invites
 * Create invite (admin only)
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

  // Check permission
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
        message: 'Only admins can create invites',
      })
    }
  }

  const body = await readBody(event)
  const { email, role } = body

  // Validate
  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required',
    })
  }

  const validRoles = ['admin', 'member']
  if (!role || !validRoles.includes(role)) {
    throw createError({
      statusCode: 400,
      message: `Role must be one of: ${validRoles.join(', ')}`,
    })
  }

  // Check if user already a member
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))

  if (existingUser) {
    const [existingMember] = await db
      .select()
      .from(schema.companyMembers)
      .where(
        and(
          eq(schema.companyMembers.companyId, company.id),
          eq(schema.companyMembers.userId, existingUser.id)
        )
      )

    if (existingMember) {
      throw createError({
        statusCode: 409,
        message: 'User is already a member of this company',
      })
    }
  }

  // Check for existing pending invite
  const [existingInvite] = await db
    .select()
    .from(schema.companyInvites)
    .where(
      and(
        eq(schema.companyInvites.companyId, company.id),
        eq(schema.companyInvites.email, email),
        isNull(schema.companyInvites.acceptedAt),
        gt(schema.companyInvites.expiresAt, new Date())
      )
    )

  if (existingInvite) {
    throw createError({
      statusCode: 409,
      message: 'A pending invite for this email already exists',
    })
  }

  // Generate invite code (URL-safe random string)
  const inviteCode = generateInviteCode()

  // Create invite (expires in 7 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const inviteId = generateUUID()
  await db.insert(schema.companyInvites).values({
    id: inviteId,
    companyId: company.id,
    email,
    role,
    inviteCode,
    invitedBy: user.userId,
    expiresAt,
  })

  // TODO: Send invite email

  return {
    invite: {
      id: inviteId,
      email,
      role,
      inviteCode,
      expiresAt,
      // Include invite link for now (in production, send via email)
      inviteLink: `/auth/invited?code=${inviteCode}`,
    },
  }
})

/**
 * Generate a URL-safe invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 32; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

