/**
 * File Manager Composable
 * 
 * Handles file operations for the dynamic page editor
 * - List files from Minio
 * - Upload files
 * - Delete files
 * - Get file URLs
 */

import type { File } from '#shared/types/db'

export interface FileListParams {
  workspaceId?: string
  ownerType?: 'system' | 'user' | 'workspace' | 'app'
  ownerId?: string
  mimeType?: string
  search?: string
  limit?: number
  offset?: number
}

export interface UploadFileParams {
  file: File // Browser File object
  ownerType?: 'system' | 'user' | 'workspace' | 'app'
  ownerId?: string
  workspaceId?: string
  folder?: string
  description?: string
  tags?: string[]
  isPublic?: boolean
}

export function useFileManager() {
  const { $api } = useNuxtApp()
  const { user } = useAuth()
  
  // State
  const files = ref<File[]>([])
  const loading = ref(false)
  const uploading = ref(false)
  const currentFolder = ref<string>('')
  const searchQuery = ref<string>('')
  const selectedFiles = ref<Set<string>>(new Set())
  
  // Pagination
  const pagination = ref({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false,
  })

  /**
   * List files
   */
  async function listFiles(params: FileListParams = {}) {
    if (!user.value) return

    loading.value = true
    try {
      const queryParams = new URLSearchParams()
      
      if (params.workspaceId) queryParams.append('workspaceId', params.workspaceId)
      if (params.ownerType) queryParams.append('ownerType', params.ownerType)
      if (params.ownerId) queryParams.append('ownerId', params.ownerId)
      if (params.mimeType) queryParams.append('mimeType', params.mimeType)
      if (params.search) queryParams.append('search', params.search)
      if (params.limit) queryParams.append('limit', params.limit.toString())
      if (params.offset) queryParams.append('offset', params.offset.toString())

      const response = await $api<{
        success: boolean
        files: File[]
        pagination: {
          limit: number
          offset: number
          total: number
          hasMore: boolean
        }
      }>(`/files?${queryParams.toString()}`)

      if (response.success) {
        files.value = response.files
        pagination.value = response.pagination
      }
    } catch (error) {
      console.error('[useFileManager] Error listing files:', error)
      ElMessage.error('Failed to load files')
    } finally {
      loading.value = false
    }
  }

  /**
   * Upload a file
   */
  async function uploadFile(params: UploadFileParams) {
    if (!user.value) return null

    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', params.file as any) // Browser File object
      
      if (params.ownerType) formData.append('ownerType', params.ownerType)
      if (params.ownerId) formData.append('ownerId', params.ownerId)
      if (params.workspaceId) formData.append('workspaceId', params.workspaceId)
      if (params.folder) formData.append('folder', params.folder)
      if (params.description) formData.append('description', params.description)
      if (params.tags) formData.append('tags', JSON.stringify(params.tags))
      if (params.isPublic !== undefined) formData.append('isPublic', params.isPublic.toString())

      const response = await $api<{
        success: boolean
        file: {
          id: string
          fileName: string
          mimeType: string
          size: number
          objectKey: string
          isPublic: boolean
          createdAt: string
        }
      }>('/files/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.success) {
        ElMessage.success('File uploaded successfully')
        return response.file
      }
      
      return null
    } catch (error) {
      console.error('[useFileManager] Error uploading file:', error)
      ElMessage.error('Failed to upload file')
      return null
    } finally {
      uploading.value = false
    }
  }

  /**
   * Delete a file
   */
  async function deleteFile(fileId: string) {
    if (!user.value) return false

    try {
      await $api(`/files/${fileId}`, {
        method: 'DELETE',
      })

      ElMessage.success('File deleted successfully')
      
      // Remove from local list
      files.value = files.value.filter(f => f.id !== fileId)
      selectedFiles.value.delete(fileId)
      
      return true
    } catch (error) {
      console.error('[useFileManager] Error deleting file:', error)
      ElMessage.error('Failed to delete file')
      return false
    }
  }

  /**
   * Get file download URL
   */
  async function getFileUrl(fileId: string): Promise<string | null> {
    if (!user.value) return null

    try {
      const response = await $api<{
        success: boolean
        action: string
        url: string
        expiresIn: number
        file: {
          id: string
          fileName: string
          mimeType: string
          size: number
        }
      }>('/files/presign', {
        method: 'POST',
        body: {
          action: 'download',
          fileId,
          expirySeconds: 3600,
        },
      })

      if (response.success) {
        return response.url
      }
      
      return null
    } catch (error) {
      console.error('[useFileManager] Error getting file URL:', error)
      return null
    }
  }

  /**
   * Get public file URL (for display)
   */
  function getPublicFileUrl(fileId: string): string {
    return `/api/files/${fileId}`
  }

  /**
   * Toggle file selection
   */
  function toggleFileSelection(fileId: string) {
    if (selectedFiles.value.has(fileId)) {
      selectedFiles.value.delete(fileId)
    } else {
      selectedFiles.value.add(fileId)
    }
  }

  /**
   * Clear selection
   */
  function clearSelection() {
    selectedFiles.value.clear()
  }

  /**
   * Select all files
   */
  function selectAll() {
    files.value.forEach(file => selectedFiles.value.add(file.id))
  }

  /**
   * Get file icon based on mime type
   */
  function getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'mdi:file-image'
    if (mimeType.startsWith('video/')) return 'mdi:file-video'
    if (mimeType.startsWith('audio/')) return 'mdi:file-music'
    if (mimeType.includes('pdf')) return 'mdi:file-pdf-box'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'mdi:file-word'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'mdi:file-excel'
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'mdi:file-powerpoint'
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return 'mdi:folder-zip'
    if (mimeType.includes('text')) return 'mdi:file-document'
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript')) return 'mdi:file-code'
    return 'mdi:file'
  }

  /**
   * Format file size
   */
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  /**
   * Check if file is an image
   */
  function isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  /**
   * Refresh file list
   */
  async function refresh(params?: FileListParams) {
    await listFiles(params)
  }

  return {
    // State
    files: readonly(files),
    loading: readonly(loading),
    uploading: readonly(uploading),
    currentFolder,
    searchQuery,
    selectedFiles: readonly(selectedFiles),
    pagination: readonly(pagination),
    
    // Actions
    listFiles,
    uploadFile,
    deleteFile,
    getFileUrl,
    getPublicFileUrl,
    toggleFileSelection,
    clearSelection,
    selectAll,
    refresh,
    
    // Helpers
    getFileIcon,
    formatFileSize,
    isImage,
  }
}

