/**
 * Electric Sync SharedWorker
 * 
 * A SharedWorker that manages PGlite with Electric sync extension.
 * Benefits:
 * - Single database instance shared across all tabs
 * - Single WebSocket connection to Electric
 * - Efficient memory usage
 * - Automatic cross-tab synchronization
 * - Background sync operations
 * - Change event broadcasting (insert/update/delete)
 * - Schema versioning with auto-clear on mismatch
 */

import { PGlite } from '@electric-sql/pglite'
import { electricSync } from '@electric-sql/pglite-sync'

// ============================================
// Types
// ============================================

interface WorkerState {
  db: any | null // PGlite with Electric extension
  isReady: boolean
  isInitializing: boolean
  ports: Set<MessagePort>
  error: string | null
  activeShapes: Map<string, ShapeState>
  schemaVersion: string | null
}

interface ShapeState {
  shape: any
  tableName: string
  previousData: Map<string, any> // id -> record for diffing
}

interface WorkerMessage {
  type: string
  id: number
  [key: string]: any
}

interface DataChange {
  type: 'DATA_CHANGE'
  shapeName: string
  tableName: string
  changes: {
    insert: any[]
    update: Array<{ old: any; new: any }>
    delete: any[]
  }
}

interface SchemaVersionResponse {
  version: string
  tables: string[]
}

// ============================================
// Constants
// ============================================

const DB_NAME = 'idb://docpal-electric'
const SCHEMA_VERSION_KEY = 'docpal_schema_version'

// ============================================
// State
// ============================================

const state: WorkerState = {
  db: null,
  isReady: false,
  isInitializing: false,
  ports: new Set(),
  error: null,
  activeShapes: new Map(),
  schemaVersion: null,
}

// ============================================
// Schema Version Management
// ============================================

async function fetchSchemaVersion(): Promise<SchemaVersionResponse | null> {
  try {
    const response = await fetch(`${self.location.origin}/api/schema/version`)
    if (!response.ok) {
      console.warn('[Electric Worker] Failed to fetch schema version:', response.status)
      return null
    }
    return await response.json()
  } catch (error) {
    console.warn('[Electric Worker] Error fetching schema version:', error)
    return null
  }
}

function getLocalSchemaVersion(): string | null {
  try {
    return localStorage.getItem(SCHEMA_VERSION_KEY)
  } catch {
    return null
  }
}

function setLocalSchemaVersion(version: string): void {
  try {
    localStorage.setItem(SCHEMA_VERSION_KEY, version)
  } catch (error) {
    console.warn('[Electric Worker] Failed to save schema version:', error)
  }
}

function clearLocalSchemaVersion(): void {
  try {
    localStorage.removeItem(SCHEMA_VERSION_KEY)
  } catch {
    // Ignore
  }
}

async function deleteDatabase(): Promise<void> {
  console.log('[Electric Worker] Deleting PGLite database...')
  
  // Delete IndexedDB database
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('docpal-electric')
    request.onsuccess = () => {
      console.log('[Electric Worker] Database deleted successfully')
      resolve()
    }
    request.onerror = () => {
      console.error('[Electric Worker] Failed to delete database')
      reject(request.error)
    }
    request.onblocked = () => {
      console.warn('[Electric Worker] Database deletion blocked')
      // Still resolve, will try again on next init
      resolve()
    }
  })
}

async function checkSchemaVersion(): Promise<{ needsReset: boolean; newVersion: string | null }> {
  const serverSchema = await fetchSchemaVersion()
  
  if (!serverSchema) {
    // Can't reach server, proceed with existing data
    return { needsReset: false, newVersion: null }
  }
  
  const localVersion = getLocalSchemaVersion()
  const serverVersion = serverSchema.version
  
  console.log('[Electric Worker] Schema versions:', { local: localVersion, server: serverVersion })
  
  if (localVersion !== serverVersion) {
    console.log('[Electric Worker] Schema version mismatch! Will reset database.')
    return { needsReset: true, newVersion: serverVersion }
  }
  
  return { needsReset: false, newVersion: serverVersion }
}

// ============================================
// Database Initialization
// ============================================

async function initDB(): Promise<any> {
  if (state.db) return state.db
  
  if (state.isInitializing) {
    // Wait for initialization to complete
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (state.db) {
          clearInterval(check)
          resolve(state.db)
        }
        if (state.error) {
          clearInterval(check)
          reject(new Error(state.error))
        }
      }, 100)
    })
  }
  
  state.isInitializing = true
  console.log('[Electric Worker] Initializing PGlite with Electric sync...')
  
  try {
    // Check schema version first
    const { needsReset, newVersion } = await checkSchemaVersion()
    
    if (needsReset) {
      const oldVersion = getLocalSchemaVersion()
      
      // Clear existing database
      await deleteDatabase()
      clearLocalSchemaVersion()
      
      // Notify all tabs about schema reset
      broadcast({
        type: 'SCHEMA_RESET',
        reason: 'version_mismatch',
        oldVersion,
        newVersion,
      })
    }
    
    // Create PGlite instance with Electric sync extension
    state.db = await PGlite.create({
      dataDir: DB_NAME,
      extensions: {
        electric: electricSync(),
      },
    })

    console.log('[Electric Worker] PGlite initialized')
    
    // Preload table schemas from server
    await fetchAllTableSchemas()
    
    // Save schema version after successful init
    if (newVersion) {
      setLocalSchemaVersion(newVersion)
      state.schemaVersion = newVersion
    }
    
    state.isReady = true
    state.isInitializing = false
    
    console.log('[Electric Worker] ✅ Ready!')
    broadcast({ type: 'DB_READY', schemaVersion: state.schemaVersion })
    
    return state.db
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    state.error = errorMessage
    state.isInitializing = false
    
    console.error('[Electric Worker] Failed to initialize:', error)
    broadcast({ type: 'DB_ERROR', error: errorMessage })
    
    throw error
  }
}

// ============================================
// Change Detection
// ============================================

function detectChanges(
  shapeName: string,
  tableName: string,
  newRecords: any[],
  previousData: Map<string, any>
): DataChange['changes'] {
  const changes: DataChange['changes'] = {
    insert: [],
    update: [],
    delete: [],
  }
  
  const newDataMap = new Map<string, any>()
  
  // Process new records
  for (const record of newRecords) {
    const id = record.id
    if (!id) continue
    
    newDataMap.set(id, record)
    
    const oldRecord = previousData.get(id)
    if (!oldRecord) {
      // New record - insert
      changes.insert.push(record)
    } else {
      // Existing record - check for updates
      if (JSON.stringify(oldRecord) !== JSON.stringify(record)) {
        changes.update.push({ old: oldRecord, new: record })
      }
    }
  }
  
  // Check for deletions
  for (const [id, oldRecord] of previousData) {
    if (!newDataMap.has(id)) {
      changes.delete.push(oldRecord)
    }
  }
  
  return changes
}

function hasChanges(changes: DataChange['changes']): boolean {
  return changes.insert.length > 0 || 
         changes.update.length > 0 || 
         changes.delete.length > 0
}

// ============================================
// Table Schema Management
// ============================================

// Cache for fetched table schemas
const tableSchemaCache: Record<string, string> = {}

/**
 * Fetch table schema from server
 * The server generates CREATE TABLE SQL from the actual PostgreSQL schema
 */
async function fetchTableSchema(tableName: string): Promise<string | null> {
  // Check cache first
  if (tableSchemaCache[tableName]) {
    return tableSchemaCache[tableName]
  }

  try {
    const response = await fetch(`${self.location.origin}/api/schema/tables?table=${tableName}`)
    if (!response.ok) {
      console.warn(`[Electric Worker] Failed to fetch schema for ${tableName}:`, response.status)
      return null
    }
    
    const data = await response.json()
    const schema = data.schemas?.[tableName]
    
    if (schema) {
      tableSchemaCache[tableName] = schema
      console.log(`[Electric Worker] Fetched schema for ${tableName}`)
    }
    
    return schema || null
  } catch (error) {
    console.warn(`[Electric Worker] Error fetching schema for ${tableName}:`, error)
    return null
  }
}

/**
 * Fetch all table schemas from server (preload cache)
 */
async function fetchAllTableSchemas(): Promise<void> {
  try {
    const response = await fetch(`${self.location.origin}/api/schema/tables`)
    if (!response.ok) {
      console.warn('[Electric Worker] Failed to fetch all schemas:', response.status)
      return
    }
    
    const data = await response.json()
    for (const [tableName, schema] of Object.entries(data.schemas || {})) {
      tableSchemaCache[tableName] = schema as string
    }
    
    console.log('[Electric Worker] Preloaded schemas for:', Object.keys(tableSchemaCache))
  } catch (error) {
    console.warn('[Electric Worker] Error fetching all schemas:', error)
  }
}

// ============================================
// Shape Subscription
// ============================================

async function syncShape(
  shapeName: string,
  tableName: string,
  shapeUrl: string,
  customSchema?: string
): Promise<void> {
  const db = await initDB()
  
  // Check if already syncing
  if (state.activeShapes.has(shapeName)) {
    console.log(`[Electric Worker] Shape "${shapeName}" already syncing`)
    return
  }
  
  // Convert relative URLs to absolute URLs
  let fullUrl = shapeUrl
  if (shapeUrl.startsWith('/')) {
    fullUrl = `${self.location.origin}${shapeUrl}`
  }
  
  try {
    console.log(`[Electric Worker] Starting sync for "${shapeName}"...`, fullUrl)
    
    // Create table if it doesn't exist
    // Priority: customSchema > cached schema > fetch from server
    let schema: string | undefined = customSchema || tableSchemaCache[tableName]
    
    if (!schema) {
      schema = (await fetchTableSchema(tableName)) || undefined
    }
    
    if (schema) {
      console.log(`[Electric Worker] Creating table "${tableName}" if not exists...`)
      await db.exec(schema)
    } else {
      console.warn(`[Electric Worker] No schema found for table "${tableName}", sync may fail`)
    }
    
    // Initialize shape state
    const shapeState: ShapeState = {
      shape: null,
      tableName,
      previousData: new Map(),
    }
    
    // Subscribe to shape with onInitialSync callback
    const shape = await db.electric.syncShapeToTable({
      shape: {
        url: fullUrl,
      },
      table: tableName,
      primaryKey: ['id'],
      onInitialSync: async () => {
        console.log(`[Electric Worker] Initial sync complete for "${shapeName}"`)
        
        // Load initial data and store as previous state
        const result = await db.query(`SELECT * FROM ${tableName}`)
        const records = result.rows || []
        
        for (const record of records) {
          if (record.id) {
            shapeState.previousData.set(record.id, { ...record })
          }
        }
        
        // Broadcast initial load as inserts
        if (records.length > 0) {
          broadcast({
            type: 'DATA_CHANGE',
            shapeName,
            tableName,
            changes: {
              insert: records,
              update: [],
              delete: [],
            },
          } as DataChange)
        }
        
        broadcast({
          type: 'SHAPE_SYNCED',
          shapeName,
          tableName,
          recordCount: records.length,
        })
      },
    })
    
    shapeState.shape = shape
    state.activeShapes.set(shapeName, shapeState)
    
    // Setup change polling (Electric sync doesn't have native change callbacks)
    // Poll for changes every 500ms when shape is active
    setupChangePolling(shapeName, tableName)
    
    console.log(`[Electric Worker] ✅ Shape "${shapeName}" synced`)
    
  } catch (error) {
    console.error(`[Electric Worker] Failed to sync shape "${shapeName}":`, error)
    throw error
  }
}

// ============================================
// Change Polling
// ============================================

const pollingIntervals = new Map<string, number>()

function setupChangePolling(shapeName: string, tableName: string): void {
  // Clear existing interval if any
  const existing = pollingIntervals.get(shapeName)
  if (existing) {
    clearInterval(existing)
  }
  
  // Poll for changes every 500ms
  const intervalId = setInterval(async () => {
    try {
      await checkForChanges(shapeName, tableName)
    } catch (error) {
      console.error(`[Electric Worker] Error checking changes for "${shapeName}":`, error)
    }
  }, 500) as unknown as number
  
  pollingIntervals.set(shapeName, intervalId)
}

async function checkForChanges(shapeName: string, tableName: string): Promise<void> {
  const shapeState = state.activeShapes.get(shapeName)
  if (!shapeState || !state.db) return
  
  try {
    const result = await state.db.query(`SELECT * FROM ${tableName}`)
    const currentRecords = result.rows || []
    
    const changes = detectChanges(shapeName, tableName, currentRecords, shapeState.previousData)
    
    if (hasChanges(changes)) {
      console.log(`[Electric Worker] Changes detected in "${shapeName}":`, {
        insert: changes.insert.length,
        update: changes.update.length,
        delete: changes.delete.length,
      })
      
      // Update previous data
      shapeState.previousData.clear()
      for (const record of currentRecords) {
        if (record.id) {
          shapeState.previousData.set(record.id, { ...record })
        }
      }
      
      // Broadcast changes
      broadcast({
        type: 'DATA_CHANGE',
        shapeName,
        tableName,
        changes,
      } as DataChange)
    }
  } catch (error) {
    // Table might not exist yet, ignore
  }
}

// ============================================
// Stop Shape Sync
// ============================================

async function stopShape(shapeName: string): Promise<void> {
  const shapeState = state.activeShapes.get(shapeName)
  if (!shapeState) {
    console.log(`[Electric Worker] Shape "${shapeName}" not found`)
    return
  }
  
  // Stop polling
  const intervalId = pollingIntervals.get(shapeName)
  if (intervalId) {
    clearInterval(intervalId)
    pollingIntervals.delete(shapeName)
  }
  
  // Unsubscribe from shape
  if (shapeState.shape?.unsubscribe) {
    await shapeState.shape.unsubscribe()
  }
  
  state.activeShapes.delete(shapeName)
  console.log(`[Electric Worker] Shape "${shapeName}" stopped`)
  
  broadcast({
    type: 'SHAPE_STOPPED',
    shapeName,
  })
}

// ============================================
// Force Reset Database
// ============================================

async function forceReset(): Promise<void> {
  console.log('[Electric Worker] Force resetting database...')
  
  // Stop all shapes
  for (const shapeName of state.activeShapes.keys()) {
    await stopShape(shapeName)
  }
  
  // Close existing database
  if (state.db) {
    try {
      await state.db.close()
    } catch {
      // Ignore close errors
    }
    state.db = null
  }
  
  // Delete database
  await deleteDatabase()
  clearLocalSchemaVersion()
  
  // Reset state
  state.isReady = false
  state.error = null
  state.schemaVersion = null
  
  broadcast({
    type: 'SCHEMA_RESET',
    reason: 'manual_reset',
    oldVersion: null,
    newVersion: null,
  })
  
  // Re-initialize
  await initDB()
}

// ============================================
// Query Execution
// ============================================

async function executeQuery(sql: string, params?: any[]): Promise<any[]> {
  const db = await initDB()
  
  try {
    const result = await db.query(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Electric Worker] Query error:', error)
    throw error
  }
}

async function executeExec(sql: string): Promise<void> {
  const db = await initDB()
  await db.exec(sql)
}

// ============================================
// Message Handler
// ============================================

async function handleMessage(port: MessagePort, message: WorkerMessage): Promise<void> {
  const { type, id, ...payload } = message
  
  console.log('[Electric Worker] Received:', type)
  
  try {
    let result: any
    
    switch (type) {
      case 'INIT':
        await initDB()
        result = { success: true, schemaVersion: state.schemaVersion }
        break
        
      case 'SYNC_SHAPE':
        await syncShape(payload.shapeName, payload.tableName, payload.shapeUrl, payload.schema)
        result = { success: true }
        break
        
      case 'STOP_SHAPE':
        await stopShape(payload.shapeName)
        result = { success: true }
        break
        
      case 'FORCE_RESET':
        await forceReset()
        result = { success: true }
        break
        
      case 'QUERY':
        result = await executeQuery(payload.sql, payload.params)
        break
        
      case 'EXEC':
        await executeExec(payload.sql)
        result = { success: true }
        break
        
      case 'GET_STATUS':
        result = {
          isReady: state.isReady,
          isInitializing: state.isInitializing,
          error: state.error,
          connectedTabs: state.ports.size,
          activeShapes: Array.from(state.activeShapes.keys()),
          schemaVersion: state.schemaVersion,
        }
        break
        
      case 'PING':
        result = { pong: true, timestamp: Date.now() }
        break
        
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
    
    port.postMessage({ type: `${type}_RESULT`, id, result })
    
  } catch (error) {
    console.error('[Electric Worker] Error handling message:', error)
    port.postMessage({ 
      type: 'ERROR', 
      id, 
      error: (error as Error).message 
    })
  }
}

// ============================================
// Broadcast to All Tabs
// ============================================

function broadcast(message: any): void {
  for (const port of state.ports) {
    try {
      port.postMessage(message)
    } catch {
      // Port might be closed, remove it
      state.ports.delete(port)
    }
  }
}

// ============================================
// Connection Handler
// ============================================

// @ts-ignore - SharedWorker global scope
self.onconnect = (e: MessageEvent) => {
  const port = e.ports?.[0]
  
  if (!port) {
    console.error('[Electric Worker] No port in connect event')
    return
  }
  
  state.ports.add(port)
  console.log('[Electric Worker] Tab connected. Total:', state.ports.size)
  
  port.onmessage = (event: MessageEvent) => {
    handleMessage(port, event.data)
  }
  
  port.onmessageerror = () => {
    console.log('[Electric Worker] Tab disconnected')
    state.ports.delete(port)
  }
  
  port.start()
  
  // Send initial status
  port.postMessage({
    type: 'CONNECTED',
    isReady: state.isReady,
    isInitializing: state.isInitializing,
    error: state.error,
    connectedTabs: state.ports.size,
    activeShapes: Array.from(state.activeShapes.keys()),
    schemaVersion: state.schemaVersion,
  })
  
  // Auto-initialize if not already
  if (!state.db && !state.isInitializing) {
    initDB().catch(console.error)
  }
}

console.log('[Electric Worker] SharedWorker started')
