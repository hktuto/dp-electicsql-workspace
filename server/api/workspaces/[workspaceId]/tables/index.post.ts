import { eq } from 'drizzle-orm'
import { dataTables, dataTableColumns, tableMigrations, workspaces } from 'hub:db:schema'
import { generateTableName, generateCreateTableSql, executeSql, validateTableName } from '~/server/utils/dynamic-table'

export default defineEventHandler(async (event) => {
  // Auth check
  const authUser = await requireAuth(event)
  
  const workspaceId = getRouterParam(event, 'workspaceId')
  if (!workspaceId) {
    throw createError({ statusCode: 400, message: 'Workspace ID is required' })
  }

  const body = await readBody(event)
  const { name, slug, description, icon, columns } = body

  if (!name || !slug) {
    throw createError({ statusCode: 400, message: 'Name and slug are required' })
  }

  const db = hubDatabase()

  // Get workspace to verify access and get companyId
  const workspace = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get()
  if (!workspace) {
    throw createError({ statusCode: 404, message: 'Workspace not found' })
  }

  // TODO: Check user has permission to create tables in this workspace
  // For now, we'll allow any authenticated user

  // Generate unique physical table name
  let tableName = generateTableName()
  let attempts = 0
  while (attempts < 10) {
    const existing = await db.select().from(dataTables).where(eq(dataTables.tableName, tableName)).get()
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
    const newTable = await db.insert(dataTables).values({
      name,
      slug,
      tableName,
      workspaceId,
      companyId: workspace.companyId,
      description,
      icon,
      createdBy: authUser.userId,
    }).returning().get()

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

