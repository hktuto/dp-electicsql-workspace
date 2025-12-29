import { db } from 'hub:db'
import { users } from '~~/server/db/schema/users'
import { companies } from '~~/server/db/schema/companies'
import { companyMembers } from '~~/server/db/schema/company-members'
import { hashPassword } from '~~/server/utils/password'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * Reset endpoint - clears all data and reseeds
 * POST /api/dev/reset
 */
export default defineEventHandler(async () => {
  // Delete in correct order (foreign key constraints)
  await db.delete(companyMembers)
  await db.delete(companies)
  await db.delete(users)

  // Reseed
  const adminId = generateUUID()
  const hashedPassword = await hashPassword('admin123')

  await db.insert(users).values({
    id: adminId,
    email: 'admin@docpal.app',
    name: 'Super Admin',
    password: hashedPassword,
    isSuperAdmin: true,
    emailVerifiedAt: new Date(),
  })

  const companyId = generateUUID()
  await db.insert(companies).values({
    id: companyId,
    name: 'Demo Company',
    slug: 'demo',
    description: 'A demo company for testing',
    companyUsers: [adminId],
    createdBy: adminId,
  })

  await db.insert(companyMembers).values({
    id: generateUUID(),
    companyId: companyId,
    userId: adminId,
    role: 'owner',
  })

  return {
    message: 'Reset and reseeded successfully',
    data: {
      adminEmail: 'admin@docpal.app',
      adminPassword: 'admin123',
      companySlug: 'demo',
    },
  }
})
