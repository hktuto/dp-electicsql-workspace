/**
 * Worker Adapter
 * Provides a unified interface for SharedWorker and regular Worker
 */

export interface WorkerAdapter {
  postMessage: (message: any) => void
  onMessage: (handler: (data: any) => void) => void
  onError: (handler: (error: any) => void) => void
  terminate: () => void
  type: 'shared' | 'dedicated'
}

/**
 * Create adapter for SharedWorker
 */
export function createSharedWorkerAdapter(worker: SharedWorker): WorkerAdapter {
  return {
    postMessage: (message: any) => {
      worker.port.postMessage(message)
    },
    onMessage: (handler: (data: any) => void) => {
      worker.port.onmessage = (event) => handler(event.data)
    },
    onError: (handler: (error: any) => void) => {
      worker.onerror = handler
      worker.port.onmessageerror = handler
    },
    terminate: () => {
      worker.port.close()
    },
    type: 'shared' as const
  }
}

/**
 * Create adapter for regular Worker
 */
export function createWorkerAdapter(worker: Worker): WorkerAdapter {
  return {
    postMessage: (message: any) => {
      worker.postMessage(message)
    },
    onMessage: (handler: (data: any) => void) => {
      worker.onmessage = (event) => handler(event.data)
    },
    onError: (handler: (error: any) => void) => {
      worker.onerror = handler
    },
    terminate: () => {
      worker.terminate()
    },
    type: 'dedicated' as const
  }
}

