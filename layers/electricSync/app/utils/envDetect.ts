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
  
  // Check OPFS (Origin Private File System) with sync access handles support
  // PGlite OPFS AHP requires createSyncAccessHandle API, not just OPFS
  let supportsOPFS = false
  try {
    console.log('[EnvDetect] Checking OPFS support...')
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      const root = await navigator.storage.getDirectory()
      // Test if sync access handles are available
      const testFile = await root.getFileHandle('__opfs_test__', { create: true })
      console.log('[EnvDetect] Test file created:', testFile)
      const accessHandle = await testFile.createSyncAccessHandle()
      console.log('[EnvDetect] OPFS sync access handles available:', accessHandle)
      if (accessHandle) {
        // Cleanup
        accessHandle.close()
        await root.removeEntry('__opfs_test__')
        supportsOPFS = true
      }
    }
    console.log('[EnvDetect] OPFS sync access handles not available:', supportsOPFS)
  } catch (error) {
    console.log('[EnvDetect] OPFS sync access handles not available:', error)
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

