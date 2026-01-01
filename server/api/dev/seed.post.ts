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
  // Check if super admins already exist
  console.log("start seeding")
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@docpal.app'))
    .limit(1)

  if (existingAdmin.length > 0) {
    return { message: 'Super admins already exist', seeded: false }
  }

  // Create first super admin
  const adminId1 = generateUUID()
  const hashedPassword = await hashPassword('admin123')

  await db.insert(users).values({
    id: adminId1,
    email: 'admin@docpal.app',
    name: 'Super Admin 1',
    password: hashedPassword,
    isSuperAdmin: true,
    emailVerifiedAt: new Date(),
  })

  // Create second super admin
  const adminId2 = generateUUID()
  const hashedPassword2 = await hashPassword('admin123')

  await db.insert(users).values({
    id: adminId2,
    email: 'admin2@docpal.app',
    name: 'Super Admin 2',
    password: hashedPassword2,
    isSuperAdmin: true,
    emailVerifiedAt: new Date(),
  })

  // Create first dummy company with first admin
  const companyId1 = generateUUID()
  await db.insert(companies).values({
    id: companyId1,
    name: 'Demo Company 1',
    slug: 'demo',
    description: 'A demo company for testing',
    companyUsers: [adminId1],
    createdBy: adminId1,
  })

  // Add first admin as company 1 owner
  await db.insert(companyMembers).values({
    id: generateUUID(),
    companyId: companyId1,
    userId: adminId1,
    role: 'owner',
  })

  // Create a default workspace for first company
  const workspaceId1 = generateUUID()
  await db.insert(workspaces).values({
    id: workspaceId1,
    name: 'Main Workspace 1',
    slug: 'main',
    description: 'Default workspace for testing',
    icon: 'mdi:folder',
    menu: [],
    companyId: companyId1,
    createdBy: adminId1,
  })

  // Create second dummy company with second admin
  const companyId2 = generateUUID()
  await db.insert(companies).values({
    id: companyId2,
    name: 'Demo Company 2',
    slug: 'demo2',
    description: 'Second demo company for testing',
    companyUsers: [adminId2],
    createdBy: adminId2,
  })

  // Add second admin as company 2 owner
  await db.insert(companyMembers).values({
    id: generateUUID(),
    companyId: companyId2,
    userId: adminId2,
    role: 'owner',
  })

  // Create a default workspace for second company
  const workspaceId2 = generateUUID()
  await db.insert(workspaces).values({
    id: workspaceId2,
    name: 'Main Workspace 2',
    slug: 'main2',
    description: 'Default workspace for testing',
    icon: 'mdi:folder',
    menu: [],
    companyId: companyId2,
    createdBy: adminId2,
  })
  console.log("seeded successfully")
  return {
    message: 'Seeded successfully',
    seeded: true,
    data: {
      admins: [
        {
          email: 'admin@docpal.app',
          password: 'admin123',
        },
        {
          email: 'admin2@docpal.app',
          password: 'admin123',
        }
      ],
      companies: [
        {
          name: 'Demo Company 1',
          slug: 'demo',
        },
        {
          name: 'Demo Company 2',
          slug: 'demo2',
        }
      ],
      workspaces: [
        {
          name: 'Main Workspace 1',
          slug: 'main',
        },
        {
          name: 'Main Workspace 2',
          slug: 'main2',
        }
      ]
    },
  }
})
