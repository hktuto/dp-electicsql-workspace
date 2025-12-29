import { db } from 'hub:db'
import { sql } from 'drizzle-orm'
import { users } from '~~/server/db/schema/users'
import { companies } from '~~/server/db/schema/companies'
import { companyMembers } from '~~/server/db/schema/company-members'
import { companyInvites } from '~~/server/db/schema/company-invites'
import { hashPassword } from '~~/server/utils/password'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * Reset endpoint - clears all data and reseeds
 * POST /api/dev/reset
 * 
 * This is a "quick reset" that only deletes rows, not tables.
 * For full reset (drop tables, regenerate schema), use: pnpm db:reset
 */
export default defineEventHandler(async () => {
  // Get all non-system tables
  const tablesResult = await db.execute(sql`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE '_hub_%'
    AND tablename NOT LIKE 'pg_%'
  `)

  const tables = (tablesResult.rows as { tablename: string }[]).map(r => r.tablename)
  
  // Disable foreign key checks and truncate all tables
  await db.execute(sql`SET session_replication_role = 'replica'`)
  
  for (const table of tables) {
    await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`))
  }
  
  await db.execute(sql`SET session_replication_role = 'origin'`)

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
    truncatedTables: tables,
    data: {
      adminEmail: 'admin@docpal.app',
      adminPassword: 'admin123',
      companySlug: 'demo',
    },
  }
})
