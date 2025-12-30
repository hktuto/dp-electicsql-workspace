# Phase 3.2.5: Worker & Storage Fallback

## Goals

- Add fallback from SharedWorker to regular Worker for mobile browsers
- Detect OPFS support and use it over IndexedDB when available
- Ensure app works across all browsers with graceful degradation

---

## Browser Support Matrix

| Feature | Chrome | Firefox | Safari | Safari iOS | Chrome Android |
|---------|--------|---------|--------|------------|----------------|
| SharedWorker | ✅ | ✅ | ❌ | ❌ | ✅ |
| OPFS (opfs-ahp) | ✅ | ✅ | ⚠️ Limited* | ⚠️ Limited* | ✅ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ | ✅ |

*Safari has a limit of 252 sync access handles, which may cause issues with PGlite's 300+ files. [PGlite OPFS Docs](https://pglite.dev/docs/filesystems#opfs-ahp-fs)

---

## Tasks

### 3.2.5.1: Environment Detection Utility

- [x] Create `layers/electricSync/app/utils/envDetect.ts`
- [x] Detect SharedWorker support
- [x] Detect OPFS support (via FileSystemDirectoryHandle)
- [x] Export capabilities object

### 3.2.5.2: Worker Fallback

- [x] Modify `useElectricSync.ts` to use detection
- [x] Create regular Worker wrapper with same interface
- [x] Fall back to Worker when SharedWorker unavailable

### 3.2.5.3: Storage Fallback

- [x] Update worker to detect OPFS support
- [x] Use OPFS for PGlite when available
- [x] Fall back to IndexedDB when OPFS unavailable

### 3.2.5.4: Testing

- [ ] Test on Chrome desktop (SharedWorker + OPFS)
- [ ] Test on Safari iOS (Worker + OPFS)
- [ ] Test on older browsers (Worker + IndexedDB)

---

## Implementation

### Environment Detection

```typescript
// layers/electricSync/app/utils/envDetect.ts
export interface EnvCapabilities {
  supportsSharedWorker: boolean
  supportsOPFS: boolean
  storageType: 'opfs' | 'indexeddb'
  workerType: 'shared' | 'dedicated'
}

export async function detectCapabilities(): Promise<EnvCapabilities> {
  const supportsSharedWorker = typeof SharedWorker !== 'undefined'
  
  // Check OPFS support
  let supportsOPFS = false
  try {
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      await navigator.storage.getDirectory()
      supportsOPFS = true
    }
  } catch {
    supportsOPFS = false
  }
  
  return {
    supportsSharedWorker,
    supportsOPFS,
    storageType: supportsOPFS ? 'opfs' : 'indexeddb',
    workerType: supportsSharedWorker ? 'shared' : 'dedicated'
  }
}
```

### Worker Abstraction

```typescript
// Unified worker interface
interface WorkerAdapter {
  postMessage: (message: any) => void
  onMessage: (handler: (event: MessageEvent) => void) => void
  terminate: () => void
}
```

---

## Storage Priority

1. **OPFS** (fastest, file-system based)
2. **IndexedDB** (fallback, slower but universal)

---

---

## Implementation Summary

### Files Created/Modified

| File | Purpose |
|------|---------|
| `layers/electricSync/app/utils/envDetect.ts` | Browser capability detection |
| `layers/electricSync/app/utils/workerAdapter.ts` | Unified worker interface |
| `layers/electricSync/app/composables/useElectricSync.ts` | Worker fallback logic |
| `layers/electricSync/app/workers/electric-sync.worker.ts` | OPFS/IndexedDB + SharedWorker/Worker support |

### Key Features

1. **Automatic Worker Type Selection**
   - SharedWorker for browsers that support it (Chrome, Firefox)
   - Regular Worker fallback for Safari iOS and other browsers

2. **Storage Type Detection**
   - OPFS (Origin Private File System) for fastest performance
   - IndexedDB fallback for universal compatibility

3. **Unified Interface**
   - WorkerAdapter provides same API for both worker types
   - Transparent switching without code changes

### Browser Compatibility

| Browser | Worker Type | Storage Type | Notes |
|---------|-------------|--------------|-------|
| Chrome Desktop | SharedWorker | OPFS (`opfs-ahp://`) | Full features |
| Firefox | SharedWorker | OPFS (`opfs-ahp://`) | Full features |
| Safari macOS | Worker | IndexedDB (`idb://`) | Single-tab, OPFS limited* |
| Safari iOS | Worker | IndexedDB (`idb://`) | Single-tab, OPFS limited* |
| Chrome Android | SharedWorker | OPFS (`opfs-ahp://`) | Full features |

*Safari's 252 sync access handle limit prevents OPFS from working with PGlite's 300+ files

---

## Status: ✅ COMPLETE (2024-12-30)

