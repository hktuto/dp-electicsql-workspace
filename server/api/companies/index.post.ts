import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * POST /api/companies
 * Create a new company (super admin only)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Only super admins can create companies
  if (!user.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Only super admins can create companies',
    })
  }

  const body = await readBody(event)
  const { name, slug, description, logo } = body

  // Validate required fields
  if (!name || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Name and slug are required',
    })
  }

  // Validate slug format (lowercase, alphanumeric, hyphens)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw createError({
      statusCode: 400,
      message: 'Slug must be lowercase alphanumeric with hyphens only',
    })
  }

  // Check if slug is unique
  const existing = await db
    .select({ id: schema.companies.id })
    .from(schema.companies)
    .where(eq(schema.companies.slug, slug))
    .limit(1)

  if (existing.length > 0) {
    throw createError({
      statusCode: 409,
      message: 'A company with this slug already exists',
    })
  }

  // Create company
  const companyId = generateUUID()
  
  await db.insert(schema.companies).values({
    id: companyId,
    name,
    slug,
    description: description || null,
    logo: logo || null,
    companyUsers: [user.userId],
    createdBy: user.userId,
  })

  // Add creator as owner
  await db.insert(schema.companyMembers).values({
    id: generateUUID(),
    companyId,
    userId: user.userId,
    role: 'owner',
  })

  // Fetch created company
  const [company] = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, companyId))

  return { company }
})

