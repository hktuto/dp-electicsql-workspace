/**
 * Electric Sync Worker
 * 
 * A Worker (SharedWorker or dedicated) that manages PGlite with Electric sync extension.
 * Supports both SharedWorker (multi-tab sync) and regular Worker (single-tab fallback).
 * 
 * Benefits:
 * - SharedWorker: Single database instance shared across all tabs
 * - Regular Worker: Per-tab fallback for browsers without SharedWorker support
 * - OPFS: Fast file-system based storage when available
 * - IndexedDB: Universal fallback storage
 * - Single WebSocket connection to Electric
 * - Background sync operations
 * - Change event broadcasting (insert/update/delete)
 * - Schema versioning with auto-clear on mismatch
 */

import { PGlite } from '@electric-sql/pglite'
import { electricSync } from '@electric-sql/pglite-sync'

// Worker context detection
const isSharedWorker = 'onconnect' in self

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

const SCHEMA_VERSION_KEY = 'docpal_schema_version'

// ============================================
// State
// ============================================

interface Capabilities {
  storageType: 'opfs' | 'indexeddb'
  workerType: 'shared' | 'dedicated'
}

let capabilities: Capabilities = {
  storageType: 'indexeddb', // Default fallback
  workerType: isSharedWorker ? 'shared' : 'dedicated'
}

// DB name will be set based on storage type
let DB_NAME = 'idb://docpal-electric' // Default to IndexedDB

// OPFS requires running in a Worker (which we are)
const OPFS_DB_NAME = 'opfs-ahp://docpal-electric'
const IDB_DB_NAME = 'idb://docpal-electric'

const state: WorkerState = {
  db: null,
  isReady: false,
  isInitializing: false,
  ports: new Set(),
  error: null,
  activeShapes: new Map(),
  schemaVersion: null,
}

// For dedicated worker, treat self as the message target
if (!isSharedWorker) {
  // Add a pseudo-port for dedicated worker
  const dedicatedPort = {
    postMessage: (data: any) => {
      (self as any).postMessage(data)
    }
  } as MessagePort
  state.ports.add(dedicatedPort)
}

// ============================================
// Schema Version Management (using IndexedDB since SharedWorker has no localStorage)
// ============================================

const SCHEMA_VERSION_DB_NAME = 'docpal-meta'
const SCHEMA_VERSION_STORE_NAME = 'schema-version'

async function openMetaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SCHEMA_VERSION_DB_NAME, 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(SCHEMA_VERSION_STORE_NAME)) {
        db.createObjectStore(SCHEMA_VERSION_STORE_NAME)
      }
    }
  })
}

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

async function getLocalSchemaVersion(): Promise<string | null> {
  try {
    const db = await openMetaDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SCHEMA_VERSION_STORE_NAME, 'readonly')
      const store = tx.objectStore(SCHEMA_VERSION_STORE_NAME)
      const request = store.get(SCHEMA_VERSION_KEY)
      
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
      request.onsuccess = () => {
        db.close()
        resolve(request.result || null)
      }
    })
  } catch (error) {
    console.warn('[Electric Worker] Failed to get schema version:', error)
    return null
  }
}

async function setLocalSchemaVersion(version: string): Promise<void> {
  try {
    const db = await openMetaDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SCHEMA_VERSION_STORE_NAME, 'readwrite')
      const store = tx.objectStore(SCHEMA_VERSION_STORE_NAME)
      const request = store.put(version, SCHEMA_VERSION_KEY)
      
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
      request.onsuccess = () => {
        db.close()
        resolve()
      }
    })
  } catch (error) {
    console.warn('[Electric Worker] Failed to save schema version:', error)
  }
}

async function clearLocalSchemaVersion(): Promise<void> {
  try {
    const db = await openMetaDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SCHEMA_VERSION_STORE_NAME, 'readwrite')
      const store = tx.objectStore(SCHEMA_VERSION_STORE_NAME)
      const request = store.delete(SCHEMA_VERSION_KEY)
      
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
      request.onsuccess = () => {
        db.close()
        resolve()
      }
    })
  } catch (error) {
    // Ignore
  }
}

async function deleteDatabase(): Promise<void> {
  console.log('[Electric Worker] Deleting all PGLite/Electric databases...')
  
  // PGlite with idb:// prefix creates databases with different naming patterns
  // We need to delete all of them
  const dbsToDelete = [
    'docpal-electric',           // Main PGlite database
    '/pglite/docpal-electric',   // Alternative PGlite path format
    'pglite-docpal-electric',    // Another possible format
  ]
  
  // Also try to list all IndexedDB databases and delete any that match our pattern
  if (typeof indexedDB.databases === 'function') {
    try {
      const allDbs = await indexedDB.databases()
      for (const db of allDbs) {
        if (db.name && (
          db.name.includes('docpal-electric') || 
          db.name.includes('pglite') ||
          db.name.includes('electric')
        )) {
          if (!dbsToDelete.includes(db.name)) {
            dbsToDelete.push(db.name)
          }
        }
      }
      console.log('[Electric Worker] Found databases to delete:', dbsToDelete)
    } catch (e) {
      console.warn('[Electric Worker] Could not list databases:', e)
    }
  }
  
  // Delete all identified databases
  const deletePromises = dbsToDelete.map(dbName => {
    return new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(dbName)
      request.onsuccess = () => {
        console.log(`[Electric Worker] Deleted database: ${dbName}`)
        resolve()
      }
      request.onerror = () => {
        console.warn(`[Electric Worker] Failed to delete database: ${dbName}`)
        resolve() // Don't reject, continue with others
      }
      request.onblocked = () => {
        console.warn(`[Electric Worker] Database deletion blocked: ${dbName}`)
        resolve()
      }
    })
  })
  
  await Promise.all(deletePromises)
  console.log('[Electric Worker] All databases deleted')
}

async function checkSchemaVersion(): Promise<{ needsReset: boolean; newVersion: string | null; oldVersion: string | null }> {
  const serverSchema = await fetchSchemaVersion()
  
  if (!serverSchema) {
    // Can't reach server, proceed with existing data
    return { needsReset: false, newVersion: null, oldVersion: null }
  }
  
  const localVersion = await getLocalSchemaVersion()
  const serverVersion = serverSchema.version
  
  console.log('[Electric Worker] Schema versions:', { local: localVersion, server: serverVersion })
  
  if (localVersion !== serverVersion) {
    console.log('[Electric Worker] Schema version mismatch! Will reset database.')
    return { needsReset: true, newVersion: serverVersion, oldVersion: localVersion }
  }
  
  return { needsReset: false, newVersion: serverVersion, oldVersion: localVersion }
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
    const { needsReset, newVersion, oldVersion } = await checkSchemaVersion()
    
    if (needsReset) {
      console.log('[Electric Worker] Schema mismatch detected, resetting database...')
      
      // Clear existing database
      await deleteDatabase()
      await clearLocalSchemaVersion()
      
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
      await setLocalSchemaVersion(newVersion)
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
  
  // Stop all polling intervals first
  for (const [shapeName, intervalId] of pollingIntervals) {
    clearInterval(intervalId)
    console.log(`[Electric Worker] Stopped polling for "${shapeName}"`)
  }
  pollingIntervals.clear()
  
  // Stop all shapes
  for (const shapeName of state.activeShapes.keys()) {
    const shapeState = state.activeShapes.get(shapeName)
    if (shapeState?.shape?.unsubscribe) {
      try {
        await shapeState.shape.unsubscribe()
      } catch (e) {
        console.warn(`[Electric Worker] Error unsubscribing shape "${shapeName}":`, e)
      }
    }
  }
  state.activeShapes.clear()
  
  // Close existing database
  if (state.db) {
    try {
      await state.db.close()
    } catch {
      // Ignore close errors
    }
    state.db = null
  }
  
  // Delete all databases
  await deleteDatabase()
  await clearLocalSchemaVersion()
  
  // Clear table schema cache
  for (const key of Object.keys(tableSchemaCache)) {
    delete tableSchemaCache[key]
  }
  
  // Reset state
  state.isReady = false
  state.isInitializing = false
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
      case 'SET_CAPABILITIES':
        if (payload.capabilities) {
          capabilities = payload.capabilities
          // Update DB_NAME based on storage type
          // OPFS: opfs-ahp:// prefix (Access Handle Pool, requires Worker context)
          // IndexedDB: idb:// prefix (universal fallback)
          DB_NAME = capabilities.storageType === 'opfs' 
            ? OPFS_DB_NAME
            : IDB_DB_NAME
          
          console.log('[Electric Worker] Capabilities set:', {
            storageType: capabilities.storageType,
            workerType: capabilities.workerType,
            dbName: DB_NAME
          })
        }
        result = { success: true, capabilities }
        break
        
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

function handlePortConnection(port: MessagePort) {
  state.ports.add(port)
  console.log('[Electric Worker] Tab connected. Total:', state.ports.size)
  
  port.onmessage = (event: MessageEvent) => {
    handleMessage(port, event.data)
  }
  
  port.onmessageerror = () => {
    console.log('[Electric Worker] Tab disconnected')
    state.ports.delete(port)
  }
  
  // Send initial status
  port.postMessage({
    type: 'CONNECTED',
    isReady: state.isReady,
    isInitializing: state.isInitializing,
    error: state.error,
    connectedTabs: state.ports.size,
    activeShapes: Array.from(state.activeShapes.keys()),
    schemaVersion: state.schemaVersion,
    workerType: capabilities.workerType,
    storageType: capabilities.storageType,
  })
}

if (isSharedWorker) {
  // SharedWorker mode: handle multiple connections
  // @ts-ignore - SharedWorker global scope
  self.onconnect = (e: MessageEvent) => {
    const port = e.ports?.[0]
    
    if (!port) {
      console.error('[Electric Worker] No port in connect event')
      return
    }
    
    port.start()
    handlePortConnection(port)
    
    // Auto-initialize if not already
    if (!state.db && !state.isInitializing) {
      initDB().catch(console.error)
    }
  }
  
  console.log('[Electric Worker] SharedWorker started')
} else {
  // Dedicated Worker mode: handle direct messages
  // @ts-ignore - Worker global scope
  self.onmessage = (event: MessageEvent) => {
    // Use the pseudo-port for dedicated worker
    const port = Array.from(state.ports)[0]
    if (port) {
      handleMessage(port, event.data)
    }
  }
  
  // Send initial CONNECTED message
  const port = Array.from(state.ports)[0]
  if (port) {
    handlePortConnection(port)
  }
  
  console.log('[Electric Worker] Dedicated Worker started')
}
