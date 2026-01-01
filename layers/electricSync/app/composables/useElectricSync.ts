/**
 * Electric SQL Sync Composable
 * 
 * Provides a reactive interface to the Electric SQL Worker.
 * Supports both SharedWorker (multi-tab sync) and regular Worker (single-tab fallback).
 * Handles shape subscriptions, change events, and schema versioning.
 */

import { detectCapabilities, type EnvCapabilities } from '../utils/envDetect'
import { 
  createSharedWorkerAdapter, 
  createWorkerAdapter, 
  type WorkerAdapter 
} from '../utils/workerAdapter'

interface ElectricStatus {
  isReady: boolean
  isInitializing: boolean
  error: string | null
  connectedTabs: number
  activeShapes: string[]
  schemaVersion: string | null
  workerType: 'shared' | 'dedicated' | null
  storageType: 'opfs' | 'indexeddb' | null
  isSystemDataReady: boolean
}

interface DataChange {
  shapeName: string
  tableName: string
  changes: {
    insert: any[]
    update: Array<{ old: any; new: any }>
    delete: any[]
  }
}

interface SchemaResetEvent {
  reason: 'version_mismatch' | 'manual_reset'
  oldVersion: string | null
  newVersion: string | null
}

interface PendingRequest {
  resolve: (value: any) => void
  reject: (reason: any) => void
}

// Singleton worker instance
let workerAdapter: WorkerAdapter | null = null
let capabilities: EnvCapabilities | null = null
let messageId = 0
const pendingRequests = new Map<number, PendingRequest>()

// Global event emitters (these are client-side only, no SSR needed)
const changeListeners = new Map<string, Set<(changes: DataChange['changes']) => void>>()
const schemaResetListeners = new Set<(event: SchemaResetEvent) => void>()

// Global state using useState for SSR-safe reactivity
const useWorkerConnected = () => useState<boolean>('electricWorkerConnected', () => false)
const useElectricStatus = () => useState<ElectricStatus>('electricStatus', () => ({
  isReady: false,
  isInitializing: false,
  error: null,
  connectedTabs: 0,
  activeShapes: [],
  schemaVersion: null,
  workerType: null,
  storageType: null,
  isSystemDataReady: false,
}))

// Global state for system data ready (one-way flag, persists across sessions)
const useSystemDataReady = () => useState<boolean>('systemDataReady', () => false)

export function useElectricSync() {
  const workerConnected = useWorkerConnected()
  const status = useElectricStatus()
  const systemDataReady = useSystemDataReady()

  const isConnected = computed(() => workerConnected.value && status.value.isReady)

  // Initialize worker connection
  const connect = async () => {
    if (workerAdapter) return

    try {
      // Detect browser capabilities
      if (!capabilities) {
        capabilities = await detectCapabilities()
        status.value.workerType = capabilities.workerType
        status.value.storageType = capabilities.storageType
      }

      const workerURL = new URL('../workers/electric-sync.worker.ts', import.meta.url)

      // Create appropriate worker type
      if (capabilities.supportsSharedWorker) {
        console.log('[useElectricSync] Using SharedWorker (multi-tab sync)')
        const sharedWorker = new SharedWorker(workerURL, { 
          type: 'module', 
          name: 'electric-sync' 
        })
        sharedWorker.port.start()
        workerAdapter = createSharedWorkerAdapter(sharedWorker)
      } else {
        console.log('[useElectricSync] Using Worker (single-tab, SharedWorker not supported)')
        const dedicatedWorker = new Worker(workerURL, { type: 'module' })
        workerAdapter = createWorkerAdapter(dedicatedWorker)
      }

      // Set up message handlers
      workerAdapter.onMessage((data) => {
        handleMessage(data)
      })

      workerAdapter.onError((error) => {
        console.error('[useElectricSync] Worker error:', error)
        status.value.error = error.message || String(error)
      })

      // Send capabilities to worker
      workerAdapter.postMessage({
        type: 'SET_CAPABILITIES',
        capabilities: {
          storageType: capabilities.storageType,
          workerType: capabilities.workerType
        }
      })

      workerConnected.value = true
      console.log('[useElectricSync] Worker connected:', {
        workerType: capabilities.workerType,
        storageType: capabilities.storageType
      })
    } catch (error) {
      console.error('[useElectricSync] Failed to create worker:', error)
      status.value.error = String(error)
      workerConnected.value = false
    }
  }

  // Handle messages from worker
  const handleMessage = (message: any) => {
    const { type, id, result, error } = message

    // Handle broadcast messages
    switch (type) {
      case 'CONNECTED':
        status.value.isReady = message.isReady
        status.value.isInitializing = message.isInitializing
        status.value.error = message.error
        status.value.connectedTabs = message.connectedTabs
        status.value.activeShapes = message.activeShapes || []
        status.value.schemaVersion = message.schemaVersion
        status.value.isSystemDataReady = message.isSystemDataReady || false
        break

      case 'DB_READY':
        status.value.isReady = true
        status.value.isInitializing = false
        status.value.schemaVersion = message.schemaVersion
        status.value.isSystemDataReady = message.isSystemDataReady || false
        break

      case 'SYSTEM_DATA_READY':
        status.value.isSystemDataReady = true
        const systemDataReady = useSystemDataReady()
        systemDataReady.value = true // Set one-way flag
        console.log('[useElectricSync] System data is ready!')
        break

      case 'DB_ERROR':
        status.value.error = message.error
        status.value.isInitializing = false
        break

      case 'SHAPE_SYNCED':
        console.log(`[useElectricSync] Shape "${message.shapeName}" synced with ${message.recordCount} records`)
        if (!status.value.activeShapes.includes(message.shapeName)) {
          status.value.activeShapes.push(message.shapeName)
        }
        break

      case 'SHAPE_STOPPED':
        status.value.activeShapes = status.value.activeShapes.filter(s => s !== message.shapeName)
        break

      case 'SCHEMA_RESET':
        console.log('[useElectricSync] Schema reset:', message.reason)
        // Notify all schema reset listeners
        for (const listener of schemaResetListeners) {
          try {
            listener({
              reason: message.reason,
              oldVersion: message.oldVersion,
              newVersion: message.newVersion,
            })
          } catch (err) {
            console.error('[useElectricSync] Schema reset listener error:', err)
          }
        }
        break

      case 'DATA_CHANGE':
        // Emit to listeners for this shape
        const listeners = changeListeners.get(message.shapeName)
        if (listeners) {
          for (const listener of listeners) {
            try {
              listener(message.changes)
            } catch (err) {
              console.error('[useElectricSync] Listener error:', err)
            }
          }
        }
        break

      default:
        // Handle request/response pattern
        console.log('[useElectricSync] Message received:', type)
        if (type.endsWith('_RESULT') || type === 'ERROR') {
          const pending = pendingRequests.get(id)
          if (pending) {
            pendingRequests.delete(id)
            if (type === 'ERROR') {
              pending.reject(error)
            } else {
              pending.resolve(result)
            }
          }
        }
    }
  }

  // Send message to worker and wait for response
  const sendMessage = <T = any>(type: string, payload: Record<string, any> = {}): Promise<T> => {
    return new Promise(async (resolve, reject) => {
      // Auto-connect if not connected (lazy initialization)
      if (!workerAdapter) {
        await connect()
      }
      
      // Still not connected after trying
      if (!workerAdapter) {
        reject(new Error('Worker not connected'))
        return
      }

      const id = ++messageId
      pendingRequests.set(id, { resolve, reject })

      workerAdapter.postMessage({ type, id, ...payload })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id)
          reject(new Error(`Request ${type} timed out`))
        }
      }, 30000)
    })
  }

  // Initialize the database
  const init = () => sendMessage<{ success: boolean; schemaVersion: string | null }>('INIT')

  // Sync system tables (users, companies, workspaces, data_tables, data_table_columns)
  const syncSystemTables = () => {
    return sendMessage<{ success: boolean; isSystemDataReady: boolean }>('SYNC_SYSTEM_TABLES')
  }

  // Subscribe to a shape
  // Optional schema parameter: provide CREATE TABLE SQL if table doesn't exist in worker's TABLE_SCHEMAS
  const syncShape = (shapeName: string, tableName: string, shapeUrl: string, schema?: string) => {
    return sendMessage('SYNC_SHAPE', { shapeName, tableName, shapeUrl, schema })
  }

  // Unsubscribe from a shape
  const stopShape = (shapeName: string) => {
    return sendMessage('STOP_SHAPE', { shapeName })
  }

  // Force reset the database (clears all data and re-syncs)
  const forceReset = () => {
    return sendMessage('FORCE_RESET')
  }

  // Execute a query
  const query = <T = any>(sql: string, params?: any[]): Promise<T[]> => {
    return sendMessage('QUERY', { sql, params })
  }

  // Execute SQL without returning results
  const exec = (sql: string): Promise<void> => {
    return sendMessage('EXEC', { sql })
  }

  // Get worker status
  const getStatus = (): Promise<ElectricStatus> => {
    return sendMessage('GET_STATUS')
  }

  // Ping worker
  const ping = (): Promise<{ pong: boolean; timestamp: number }> => {
    return sendMessage('PING')
  }

  // Subscribe to changes for a shape
  const onDataChange = (shapeName: string, callback: (changes: DataChange['changes']) => void) => {
    if (!changeListeners.has(shapeName)) {
      changeListeners.set(shapeName, new Set())
    }
    changeListeners.get(shapeName)!.add(callback)

    // Return unsubscribe function
    return () => {
      const listeners = changeListeners.get(shapeName)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          changeListeners.delete(shapeName)
        }
      }
    }
  }

  // Subscribe to schema reset events
  const onSchemaReset = (callback: (event: SchemaResetEvent) => void) => {
    schemaResetListeners.add(callback)

    // Return unsubscribe function
    return () => {
      schemaResetListeners.delete(callback)
    }
  }

  // Auto-connect on mount
  onMounted(() => {
    connect()
  })

  return {
    status: readonly(status),
    isConnected,
    systemDataReady: readonly(systemDataReady),
    connect,
    init,
    syncSystemTables,
    syncShape,
    stopShape,
    forceReset,
    query,
    exec,
    getStatus,
    ping,
    onDataChange,
    onSchemaReset,
  }
}
