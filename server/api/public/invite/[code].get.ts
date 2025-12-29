import { eq, and, isNull, gt } from 'drizzle-orm'
import { db, schema } from 'hub:db'

/**
 * GET /api/public/invite/:code
 * Get invite details (public - for invite landing page)
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
    .select({
      id: schema.companyInvites.id,
      email: schema.companyInvites.email,
      role: schema.companyInvites.role,
      expiresAt: schema.companyInvites.expiresAt,
      acceptedAt: schema.companyInvites.acceptedAt,
      company: {
        id: schema.companies.id,
        name: schema.companies.name,
        slug: schema.companies.slug,
        logo: schema.companies.logo,
      },
      invitedBy: {
        name: schema.users.name,
      },
    })
    .from(schema.companyInvites)
    .innerJoin(schema.companies, eq(schema.companyInvites.companyId, schema.companies.id))
    .innerJoin(schema.users, eq(schema.companyInvites.invitedBy, schema.users.id))
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

  return {
    invite: {
      email: invite.email,
      role: invite.role,
      company: invite.company,
      invitedBy: invite.invitedBy.name,
      expiresAt: invite.expiresAt,
    },
  }
})

