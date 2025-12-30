import { eq } from 'drizzle-orm'
import { db } from 'hub:db'
import { users } from '~~/server/db/schema/users'
import { companies } from '~~/server/db/schema/companies'
import { companyMembers } from '~~/server/db/schema/company-members'
import { workspaces } from '~~/server/db/schema/workspaces'
import { hashPassword } from '~~/server/utils/password'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * Seed endpoint - creates super admin and dummy company
 * POST /api/dev/seed
 */
export default defineEventHandler(async () => {
  // Check if super admin already exists
  console.log("start seeding")
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@docpal.app'))
    .limit(1)

  if (existingAdmin.length > 0) {
    return { message: 'Super admin already exists', seeded: false }
  }

  // Create super admin
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

  // Create dummy company
  const companyId = generateUUID()
  await db.insert(companies).values({
    id: companyId,
    name: 'Demo Company',
    slug: 'demo',
    description: 'A demo company for testing',
    companyUsers: [adminId],
    createdBy: adminId,
  })

  // Add admin as company owner
  await db.insert(companyMembers).values({
    id: generateUUID(),
    companyId: companyId,
    userId: adminId,
    role: 'owner',
  })

  // Create a default workspace
  const workspaceId = generateUUID()
  await db.insert(workspaces).values({
    id: workspaceId,
    name: 'Main Workspace',
    slug: 'main',
    description: 'Default workspace for testing',
    icon: 'mdi:folder',
    menu: [],
    companyId: companyId,
    createdBy: adminId,
  })

  return {
    message: 'Seeded successfully',
    seeded: true,
    data: {
      adminEmail: 'admin@docpal.app',
      adminPassword: 'admin123',
      companySlug: 'demo',
      workspaceSlug: 'main',
    },
  }
})
