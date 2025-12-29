import { eq, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * GET /api/companies
 * List user's companies
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Super admin can see all companies
  if (user.isSuperAdmin) {
    const allCompanies = await db
      .select({
        id: schema.companies.id,
        name: schema.companies.name,
        slug: schema.companies.slug,
        logo: schema.companies.logo,
        description: schema.companies.description,
        createdAt: schema.companies.createdAt,
      })
      .from(schema.companies)
      .orderBy(schema.companies.name)

    return { companies: allCompanies }
  }

  // Regular users see only companies they belong to
  const memberships = await db
    .select({ companyId: schema.companyMembers.companyId })
    .from(schema.companyMembers)
    .where(eq(schema.companyMembers.userId, user.userId))

  if (memberships.length === 0) {
    return { companies: [] }
  }

  const companyIds = memberships.map((m) => m.companyId)

  const companies = await db
    .select({
      id: schema.companies.id,
      name: schema.companies.name,
      slug: schema.companies.slug,
      logo: schema.companies.logo,
      description: schema.companies.description,
      createdAt: schema.companies.createdAt,
    })
    .from(schema.companies)
    .where(inArray(schema.companies.id, companyIds))
    .orderBy(schema.companies.name)

  return { companies }
})

