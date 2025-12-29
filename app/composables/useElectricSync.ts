/**
 * Electric SQL Sync Composable
 * 
 * Provides a reactive interface to the Electric SQL SharedWorker.
 * Handles shape subscriptions, change events, and schema versioning.
 */

interface ElectricStatus {
  isReady: boolean
  isInitializing: boolean
  error: string | null
  connectedTabs: number
  activeShapes: string[]
  schemaVersion: string | null
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
let worker: SharedWorker | null = null
let messageId = 0
const pendingRequests = new Map<number, PendingRequest>()

// Global event emitters
const changeListeners = new Map<string, Set<(changes: DataChange['changes']) => void>>()
const schemaResetListeners = new Set<(event: SchemaResetEvent) => void>()

// Reactive worker connected state
const workerConnected = ref(false)

export function useElectricSync() {
  const status = ref<ElectricStatus>({
    isReady: false,
    isInitializing: false,
    error: null,
    connectedTabs: 0,
    activeShapes: [],
    schemaVersion: null,
  })

  const isConnected = computed(() => workerConnected.value && status.value.isReady)

  // Initialize worker connection
  const connect = () => {
    if (worker) return

    if (typeof SharedWorker === 'undefined') {
      console.warn('[useElectricSync] SharedWorker not supported, falling back to regular Worker')
      status.value.error = 'SharedWorker not supported'
      return
    }

    try {
      worker = new SharedWorker(
        new URL('../workers/electric-sync.worker.ts', import.meta.url),
        { type: 'module', name: 'electric-sync' }
      )

      worker.port.onmessage = (event) => {
        handleMessage(event.data)
      }

      worker.port.onmessageerror = (event) => {
        console.error('[useElectricSync] Message error:', event)
      }

      worker.onerror = (event) => {
        console.error('[useElectricSync] Worker error:', event)
        status.value.error = event.message
      }

      worker.port.start()
      workerConnected.value = true
      console.log('[useElectricSync] Connected to SharedWorker')
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
        break

      case 'DB_READY':
        status.value.isReady = true
        status.value.isInitializing = false
        status.value.schemaVersion = message.schemaVersion
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
        if (type.endsWith('_RESULT') || type === 'ERROR') {
          const pending = pendingRequests.get(id)
          if (pending) {
            pendingRequests.delete(id)
            if (type === 'ERROR') {
              pending.reject(new Error(error))
            } else {
              pending.resolve(result)
            }
          }
        }
    }
  }

  // Send message to worker and wait for response
  const sendMessage = <T = any>(type: string, payload: Record<string, any> = {}): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!worker) {
        reject(new Error('Worker not connected'))
        return
      }

      const id = ++messageId
      pendingRequests.set(id, { resolve, reject })

      worker.port.postMessage({ type, id, ...payload })

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
    connect,
    init,
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
