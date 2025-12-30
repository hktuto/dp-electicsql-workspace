/**
 * Environment capability detection for Electric Sync
 * Detects browser support for SharedWorker and OPFS
 */

export interface EnvCapabilities {
  supportsSharedWorker: boolean
  supportsOPFS: boolean
  storageType: 'opfs' | 'indexeddb'
  workerType: 'shared' | 'dedicated'
}

/**
 * Detect browser capabilities
 * @returns Promise<EnvCapabilities> - Detected capabilities
 */
export async function detectCapabilities(): Promise<EnvCapabilities> {
  // Check SharedWorker support
  const supportsSharedWorker = typeof SharedWorker !== 'undefined'
  
  // Check OPFS (Origin Private File System) support
  let supportsOPFS = false
  try {
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      // Try to access the directory to confirm it works
      await navigator.storage.getDirectory()
      supportsOPFS = true
    }
  } catch (error) {
    console.warn('[EnvDetect] OPFS not available:', error)
    supportsOPFS = false
  }
  
  const capabilities = {
    supportsSharedWorker,
    supportsOPFS,
    storageType: supportsOPFS ? 'opfs' : 'indexeddb' as const,
    workerType: supportsSharedWorker ? 'shared' : 'dedicated' as const
  }
  
  console.log('[EnvDetect] Browser capabilities:', capabilities)
  
  return capabilities
}

/**
 * Synchronous check for SharedWorker support
 * @returns boolean
 */
export function hasSharedWorker(): boolean {
  return typeof SharedWorker !== 'undefined'
}

/**
 * Synchronous check for OPFS support (rough check)
 * Note: Full OPFS check requires async, this is just a quick check
 * @returns boolean
 */
export function hasOPFSSync(): boolean {
  return 'storage' in navigator && 'getDirectory' in navigator.storage
}

