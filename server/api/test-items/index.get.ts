/**
 * List Test Items
 * 
 * GET /api/test-items
 * 
 * Returns all test items directly from PostgreSQL.
 * Used for debugging to compare with PGLite data.
 */

import { db, schema } from 'hub:db'
import { desc } from 'drizzle-orm'

const { testItems } = schema

export default defineEventHandler(async () => {
  const items = await db
    .select()
    .from(testItems)
    .orderBy(desc(testItems.createdAt))
  
  return items
})

