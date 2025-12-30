import { eq, and } from 'drizzle-orm'
import { db } from 'hub:db'
import { dataTables, dataTableColumns, tableMigrations, workspaces } from 'hub:db:schema'
import { generateTableName, generateCreateTableSql, executeSql, validateTableName } from '~~/server/utils/dynamic-table'

export default defineEventHandler(async (event) => {
  // Get user from context (set by auth middleware)
  const user = event.context.user
  
  const workspaceId = getRouterParam(event, 'workspaceId')
  if (!workspaceId) {
    throw createError({ statusCode: 400, message: 'Workspace ID is required' })
  }

  const body = await readBody(event)
  let { name, slug, description, icon, columns } = body

  if (!name) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }

  // Auto-generate slug from name if not provided
  if (!slug) {
    slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/-+/g, '-')           // Replace multiple hyphens with single
      .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw createError({
      statusCode: 400,
      message: 'Slug must be lowercase alphanumeric with hyphens only',
    })
  }

  // Get workspace to verify access and get companyId
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  if (!workspace) {
    throw createError({ statusCode: 404, message: 'Workspace not found' })
  }

  // TODO: Check user has permission to create tables in this workspace
  // For now, we'll allow any authenticated user

  // Check if slug already exists in this workspace and make it unique
  let finalSlug = slug
  let slugAttempts = 0
  while (slugAttempts < 10) {
    const [existing] = await db.select()
      .from(dataTables)
      .where(and(
        eq(dataTables.workspaceId, workspaceId),
        eq(dataTables.slug, finalSlug)
      ))
      .limit(1)
    
    if (!existing) break
    
    slugAttempts++
    finalSlug = `${slug}-${slugAttempts}`
  }

  if (slugAttempts === 10) {
    throw createError({ statusCode: 500, message: 'Failed to generate unique slug' })
  }

  slug = finalSlug

  // Generate unique physical table name
  let tableName = generateTableName()
  let attempts = 0
  while (attempts < 10) {
    const [existing] = await db.select().from(dataTables).where(eq(dataTables.tableName, tableName)).limit(1)
    if (!existing) break
    tableName = generateTableName()
    attempts++
  }

  if (attempts === 10) {
    throw createError({ statusCode: 500, message: 'Failed to generate unique table name' })
  }

  if (!validateTableName(tableName)) {
    throw createError({ statusCode: 400, message: 'Invalid table name generated' })
  }

  try {
    // Create physical table in PostgreSQL
    const createTableSql = generateCreateTableSql(tableName)
    await executeSql(createTableSql)

    // Create metadata record
    const [newTable] = await db.insert(dataTables).values({
      name,
      slug,
      tableName,
      workspaceId,
      companyId: workspace.companyId,
      description,
      icon,
      createdBy: user?.userId || null,
    }).returning()

    // Store migration history
    await db.insert(tableMigrations).values({
      dataTableId: newTable.id,
      companyId: workspace.companyId,
      version: 1,
      migrationSql: createTableSql,
      rollbackSql: `DROP TABLE IF EXISTS ${tableName} CASCADE;`,
      description: `Initial table creation: ${name}`,
    })

    // If initial columns are provided, add them
    if (columns && Array.isArray(columns) && columns.length > 0) {
      for (const col of columns) {
        await db.insert(dataTableColumns).values({
          dataTableId: newTable.id,
          workspaceId,
          companyId: workspace.companyId,
          name: col.name,
          label: col.label,
          type: col.type,
          required: col.required || false,
          order: col.order || 0,
          defaultValue: col.defaultValue,
          isUnique: col.isUnique || false,
          isHidden: col.isHidden || false,
          isPrimaryDisplay: col.isPrimaryDisplay || false,
          config: col.config,
          validationRules: col.validationRules,
        })
      }
    }

    return {
      success: true,
      table: newTable,
    }
  } catch (error: any) {
    console.error('Failed to create table:', error)
    
    // Cleanup: try to drop the physical table if it was created
    try {
      await executeSql(`DROP TABLE IF EXISTS ${tableName} CASCADE;`)
    } catch (cleanupError) {
      console.error('Failed to cleanup table:', cleanupError)
    }

    throw createError({
      statusCode: 500,
      message: `Failed to create table: ${error.message}`,
    })
  }
})

