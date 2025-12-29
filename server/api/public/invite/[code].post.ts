import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'
import { generateUUID } from '~~/server/utils/uuid'
import { hashPassword } from '~~/server/utils/password'

/**
 * POST /api/public/invite/:code
 * Accept invite
 * 
 * If user is logged in: adds them to the company
 * If not logged in: creates account and adds to company (requires password in body)
 */
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')

  if (!code) {
    throw createError({
      statusCode: 400,
      message: 'Invite code is required',
    })
  }

  // Find invite
  const [invite] = await db
    .select()
    .from(schema.companyInvites)
    .where(eq(schema.companyInvites.inviteCode, code))

  if (!invite) {
    throw createError({
      statusCode: 404,
      message: 'Invite not found',
    })
  }

  // Check if already accepted
  if (invite.acceptedAt) {
    throw createError({
      statusCode: 410,
      message: 'This invite has already been used',
    })
  }

  // Check if expired
  if (new Date(invite.expiresAt) < new Date()) {
    throw createError({
      statusCode: 410,
      message: 'This invite has expired',
    })
  }

  // Check if user is logged in
  let userId: string
  const existingUser = event.context.user

  if (existingUser) {
    // User is logged in - verify email matches
    if (existingUser.email !== invite.email) {
      throw createError({
        statusCode: 403,
        message: `This invite is for ${invite.email}. Please login with that account or logout first.`,
      })
    }
    userId = existingUser.id
  } else {
    // User not logged in - need to create account or find existing
    const body = await readBody(event)
    
    // Check if user already exists
    const [existingAccount] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, invite.email))

    if (existingAccount) {
      throw createError({
        statusCode: 401,
        message: 'An account with this email exists. Please login first to accept this invite.',
      })
    }

    // Create new account
    const { name, password } = body

    if (!password || password.length < 8) {
      throw createError({
        statusCode: 400,
        message: 'Password must be at least 8 characters',
      })
    }

    userId = generateUUID()
    const hashedPassword = await hashPassword(password)

    await db.insert(schema.users).values({
      id: userId,
      email: invite.email,
      name: name || invite.email.split('@')[0],
      password: hashedPassword,
      emailVerifiedAt: new Date(), // Verified via invite
    })
  }

  // Check if already a member
  const [existingMember] = await db
    .select()
    .from(schema.companyMembers)
    .where(
      and(
        eq(schema.companyMembers.companyId, invite.companyId),
        eq(schema.companyMembers.userId, userId)
      )
    )

  if (existingMember) {
    // Already a member, just mark invite as accepted
    await db
      .update(schema.companyInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(schema.companyInvites.id, invite.id))

    return { message: 'You are already a member of this company' }
  }

  // Add user to company
  await db.insert(schema.companyMembers).values({
    id: generateUUID(),
    companyId: invite.companyId,
    userId,
    role: invite.role,
  })

  // Update company's companyUsers array
  const [company] = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, invite.companyId))

  const updatedUsers = [...(company.companyUsers || []), userId]
  await db
    .update(schema.companies)
    .set({
      companyUsers: updatedUsers,
      updatedAt: new Date(),
    })
    .where(eq(schema.companies.id, invite.companyId))

  // Mark invite as accepted
  await db
    .update(schema.companyInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(schema.companyInvites.id, invite.id))

  // Get company details for response
  const [companyDetails] = await db
    .select({ name: schema.companies.name, slug: schema.companies.slug })
    .from(schema.companies)
    .where(eq(schema.companies.id, invite.companyId))

  return {
    message: 'Invite accepted successfully',
    company: companyDetails,
    isNewUser: !existingUser,
  }
})

