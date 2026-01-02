<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import type { UploadProps, UploadUserFile } from 'element-plus'

const { componentState, bucketRoot } = useDynamicRenderContext()
const { user } = useAuth()

// File manager composable
const fileManager = useFileManager()

// View mode: grid or list
const viewMode = ref<'grid' | 'list'>('grid')

// Removed folder navigation - not needed in current state

// Filter by file type
const fileTypeFilter = ref<string>('all')
const fileTypes = [
  { label: 'All Files', value: 'all', icon: 'mdi:file' },
  { label: 'System Files', value: 'system', icon: 'mdi:package-variant' },
  { label: 'Images', value: 'image/', icon: 'mdi:file-image' },
  { label: 'Documents', value: 'application/', icon: 'mdi:file-document' },
  { label: 'Videos', value: 'video/', icon: 'mdi:file-video' },
  { label: 'Audio', value: 'audio/', icon: 'mdi:file-music' },
]

// Upload dialog
const uploadDialogVisible = ref(false)
const fileList = ref<UploadUserFile[]>([])
const uploadDescription = ref('')
const isDraggingOver = ref(false)

// Image preview
const previewDialogVisible = ref(false)
const previewImageUrl = ref('')
const previewFileName = ref('')

// Load files
async function loadFiles() {
  const params: any = {
    // No workspaceId - files are scoped by bucketRoot
    search: fileManager.searchQuery.value || undefined,
  }
  
  // Handle filter types
  if (fileTypeFilter.value === 'system') {
    // Show seeded system files
    params.ownerType = 'system'
  } else if (fileTypeFilter.value !== 'all') {
    // Show files by mime type
    params.mimeType = fileTypeFilter.value
  }
  
  await fileManager.listFiles(params)
}

// Files are already filtered by the API, no need for client-side filtering

// Search files
const searchDebounce = ref<NodeJS.Timeout>()
function handleSearch(value: string) {
  clearTimeout(searchDebounce.value)
  searchDebounce.value = setTimeout(() => {
    loadFiles()
  }, 300)
}

// Filter by type
function handleTypeFilter(type: string | number | boolean | undefined) {
  if (typeof type === 'string') {
    fileTypeFilter.value = type
    loadFiles()
  }
}

// Upload file
const handleUploadChange: UploadProps['onChange'] = (uploadFile, uploadFiles) => {
  fileList.value = uploadFiles
}

const handleUploadRemove: UploadProps['onRemove'] = (uploadFile, uploadFiles) => {
  fileList.value = uploadFiles
}

async function handleUploadConfirm() {
  if (fileList.value.length === 0) {
    ElMessage.warning('Please select at least one file')
    return
  }
  
  try {
    for (const fileItem of fileList.value) {
      if (fileItem.raw) {
        await fileManager.uploadFile({
          file: fileItem.raw as any, // Browser File object from element-plus
          ownerType: 'system', // Dynamic components use system owner type
          ownerId: user.value?.id, // Pass user ID so backend can set ownerId and uploadedBy
          folder: bucketRoot.value, // Upload to bucket root
          description: uploadDescription.value || undefined,
          isPublic: true, // Dynamic component files are public
        })
      }
    }
    
    // Reset and reload
    uploadDialogVisible.value = false
    fileList.value = []
    uploadDescription.value = ''
    await loadFiles()
  } catch (error) {
    console.error('[Files] Upload error:', error)
  }
}

// Delete file
async function handleDelete(fileId: string, fileName: string) {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete "${fileName}"?`,
      'Delete File',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    )
    
    await fileManager.deleteFile(fileId)
    await loadFiles()
  } catch (error) {
    // User cancelled
  }
}

// Copy file URL
async function handleCopyUrl(fileId: string) {
  const url = fileManager.getPublicFileUrl(fileId)
  const fullUrl = `${window.location.origin}${url}`
  
  try {
    await navigator.clipboard.writeText(fullUrl)
    ElMessage.success('URL copied to clipboard')
  } catch (error) {
    ElMessage.error('Failed to copy URL')
  }
}

// Preview image
async function handlePreview(file: any) {
  if (fileManager.isImage(file.mimeType)) {
    const url = await fileManager.getFileUrl(file.id)
    if (url) {
      previewImageUrl.value = url
      previewFileName.value = file.fileName
      previewDialogVisible.value = true
    }
  } else {
    // Download file
    const url = await fileManager.getFileUrl(file.id)
    if (url) {
      window.open(url, '_blank')
    }
  }
}

// Select file (for inserting into page)
function handleSelectFile(file: any) {
  fileManager.toggleFileSelection(file.id)
}

// Handle card context menu actions
function handleCardAction(command: string, file: any) {
  switch (command) {
    case 'preview':
      handlePreview(file)
      break
    case 'copy':
      handleCopyUrl(file.id)
      break
    case 'delete':
      handleDelete(file.id, file.fileName)
      break
  }
}

// Handle drag and drop
async function handleDrop(e: DragEvent) {
  isDraggingOver.value = false
  
  const droppedFiles = e.dataTransfer?.files
  if (!droppedFiles || droppedFiles.length === 0) return
  
  try {
    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i]
      if (file) {
        await fileManager.uploadFile({
          file: file as any,
          ownerType: 'system',
          ownerId: user.value?.id,
          folder: bucketRoot.value,
          isPublic: true,
        })
      }
    }
    
    ElMessage.success(`${droppedFiles.length} file(s) uploaded successfully`)
    await loadFiles()
  } catch (error) {
    console.error('[Files] Drop upload error:', error)
    ElMessage.error('Failed to upload files')
  }
}

// Format date
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

// Initialize
onMounted(() => {
  loadFiles()
})

// Watch for bucket root changes
watch(() => bucketRoot.value, () => {
  loadFiles()
})
</script>

<template>
    <div class="editorSection files">
    <!-- Header with search and actions -->
    <div class="files-header">
      <el-input
        v-model="fileManager.searchQuery.value"
        placeholder="Search files..."
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <Icon name="mdi:magnify" />
        </template>
      </el-input>
      
      <div class="files-actions">
        <el-button
          type="primary"
          size="small"
          @click="uploadDialogVisible = true"
        >
          <Icon name="mdi:upload" />
        </el-button>
        
        <el-button-group>
          <el-button
            :type="viewMode === 'grid' ? 'primary' : 'default'"
            size="small"
            @click="viewMode = 'grid'"
          >
            <Icon name="mdi:view-grid" />
          </el-button>
          <el-button
            :type="viewMode === 'list' ? 'primary' : 'default'"
            size="small"
            @click="viewMode = 'list'"
          >
            <Icon name="mdi:view-list" />
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- File type filter -->
    <div class="files-filter">
      <el-select
        v-model="fileTypeFilter"
        placeholder="Filter by type"
        @change="handleTypeFilter"
        style="width: 200px"
      >
        <el-option
          v-for="type in fileTypes"
          :key="type.value"
          :label="type.label"
          :value="type.value"
        >
          <div class="filter-option">
            <Icon :name="type.icon" />
            <span>{{ type.label }}</span>
          </div>
        </el-option>
      </el-select>
    </div>

    <!-- Loading state -->
    <div v-if="fileManager.loading.value" class="files-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Loading files...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="fileManager.files.value.length === 0" class="files-empty">
      <el-empty description="No files found">
        <el-button type="primary" size="small" @click="uploadDialogVisible = true">
          Upload
        </el-button>
      </el-empty>
    </div>

    <!-- Files grid view with drop zone -->
    <div 
      v-else-if="viewMode === 'grid'" 
      class="files-grid"
      @drop.prevent="handleDrop"
      @dragover.prevent
      @dragenter.prevent="isDraggingOver = true"
      @dragleave.prevent="isDraggingOver = false"
      :class="{ 'dragging-over': isDraggingOver }"
    >
      <div
        v-for="file in fileManager.files.value"
        :key="file.id"
        :class="['file-card', { selected: fileManager.selectedFiles.value.has(file.id) }]"
        @click="handleSelectFile(file)"
      >
        <!-- Image preview or icon -->
        <div class="file-preview">
          <img
            v-if="fileManager.isImage(file.mimeType)"
            :src="fileManager.getPublicFileUrl(file.id)"
            :alt="file.fileName"
            @click.stop="handlePreview(file)"
          />
          <div v-else class="file-icon">
            <Icon :name="fileManager.getFileIcon(file.mimeType)" size="48" />
          </div>
        </div>

        <!-- File info -->
        <div class="file-info">
          <div class="file-name" :title="file.fileName">
            {{ file.fileName }}
          </div>
          <div class="file-meta">
            {{ fileManager.formatFileSize(file.size) }}
          </div>
        </div>

        <!-- Context menu on card -->
        <el-dropdown 
          trigger="contextmenu"
          @command="(cmd: string) => handleCardAction(cmd, file)"
        >
          <div class="card-context-trigger" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="preview">
                <Icon name="mdi:eye" />
                Preview
              </el-dropdown-item>
              <el-dropdown-item command="copy">
                <Icon name="mdi:link" />
                Copy URL
              </el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <Icon name="mdi:delete" />
                Delete
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- Actions -->
        <div class="file-actions" @click.stop>
          <el-dropdown trigger="click">
            <el-button text circle size="small">
              <Icon name="mdi:dots-vertical" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handlePreview(file)">
                  <Icon name="mdi:eye" />
                  Preview
                </el-dropdown-item>
                <el-dropdown-item @click="handleCopyUrl(file.id)">
                  <Icon name="mdi:link" />
                  Copy URL
                </el-dropdown-item>
                <el-dropdown-item
                  divided
                  @click="handleDelete(file.id, file.fileName)"
                >
                  <Icon name="mdi:delete" />
                  Delete
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- Files list view with drop zone -->
    <div 
      v-else 
      class="files-list"
      @drop.prevent="handleDrop"
      @dragover.prevent
      @dragenter.prevent="isDraggingOver = true"
      @dragleave.prevent="isDraggingOver = false"
      :class="{ 'dragging-over': isDraggingOver }"
    >
      <el-table :data="fileManager.files.value as any" stripe>
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="Name" min-width="200">
          <template #default="{ row }">
            <div class="file-name-cell">
              <Icon :name="fileManager.getFileIcon(row.mimeType)" size="20" />
              <span>{{ row.fileName }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="Size" width="120">
          <template #default="{ row }">
            {{ fileManager.formatFileSize(row.size) }}
          </template>
        </el-table-column>
        
        <el-table-column label="Type" width="150">
          <template #default="{ row }">
            {{ row.mimeType }}
          </template>
        </el-table-column>
        
        <el-table-column label="Uploaded" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        
        <el-table-column label="Actions" width="80" fixed="right">
          <template #default="{ row }">
            <el-dropdown trigger="click" @command="(cmd: string) => handleCardAction(cmd, row)">
              <el-button text circle size="small">
                <Icon name="mdi:dots-vertical" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="preview">
                    <Icon name="mdi:eye" />
                    Preview
                  </el-dropdown-item>
                  <el-dropdown-item command="copy">
                    <Icon name="mdi:link" />
                    Copy URL
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <Icon name="mdi:delete" />
                    Delete
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Upload Dialog -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="Upload Files"
      width="600px"
    >
      <el-form label-width="100px">
        <el-form-item label="Files">
          <el-upload
            v-model:file-list="fileList"
            multiple
            :auto-upload="false"
            :on-change="handleUploadChange"
            :on-remove="handleUploadRemove"
            drag
          >
            <div class="upload-dragger">
              <Icon name="mdi:cloud-upload" size="48" />
              <div class="el-upload__text">
                Drop files here or <em>click to upload</em>
              </div>
            </div>
          </el-upload>
        </el-form-item>
        
        <el-form-item label="Description">
          <el-input
            v-model="uploadDescription"
            type="textarea"
            :rows="3"
            placeholder="Optional description"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="uploadDialogVisible = false">Cancel</el-button>
        <el-button
          type="primary"
          :loading="fileManager.uploading.value"
          @click="handleUploadConfirm"
        >
          Upload
        </el-button>
      </template>
    </el-dialog>

    <!-- Image Preview Dialog -->
    <el-dialog
      v-model="previewDialogVisible"
      :title="previewFileName"
      width="80%"
    >
      <div class="image-preview">
        <img :src="previewImageUrl" :alt="previewFileName" />
      </div>
    </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.editorSection.files {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-m);
  height: 100%;
}

.files-header {
  display: flex;
  gap: var(--app-space-s);
  align-items: center;
  
  .el-input {
    flex: 1;
  }
}

.files-actions {
  display: flex;
  gap: var(--app-space-s);
}

.files-filter {
  .filter-option {
    display: flex;
    align-items: center;
    gap: var(--app-space-s);
  }
}

.files-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-s);
  padding: var(--app-space-xl);
  color: var(--app-grey-600);
}

.files-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--app-space-xl);
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--app-space-m);
  overflow-y: auto;
  flex: 1;
  position: relative;
  border: 2px dashed transparent;
  border-radius: var(--app-border-radius-m);
  padding: var(--app-space-s);
  transition: all 0.2s ease;
  
  &.dragging-over {
    background: var(--app-primary-alpha-50);
    border-color: var(--app-primary-color);
    box-shadow: inset 0 0 0 2px var(--app-primary-alpha-100);
  }
}

.file-card {
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-m);
  padding: var(--app-space-s);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: var(--app-paper);
  
  &:hover {
    border-color: var(--app-primary-color);
    box-shadow: var(--app-shadow-s);
  }
  
  &.selected {
    border-color: var(--app-primary-color);
    background: var(--app-primary-alpha-50);
  }
  
  .card-context-trigger {
    position: absolute;
    inset: 0;
    z-index: 1;
  }
}

.file-preview {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--app-border-radius-s);
  overflow: hidden;
  background: var(--app-grey-100);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--app-space-s);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .file-icon {
    color: var(--app-grey-500);
  }
}

.file-info {
  .file-name {
    font-size: var(--app-font-size-s);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: var(--app-space-xs);
  }
  
  .file-meta {
    font-size: var(--app-font-size-xs);
    color: var(--app-grey-600);
  }
}

.file-actions {
  position: absolute;
  top: var(--app-space-xs);
  right: var(--app-space-xs);
  opacity: 0;
  transition: opacity 0.2s;
  
  .file-card:hover & {
    opacity: 1;
  }
}

.files-list {
  flex: 1;
  overflow-y: auto;
  position: relative;
  border: 2px dashed transparent;
  border-radius: var(--app-border-radius-m);
  padding: var(--app-space-s);
  transition: all 0.2s ease;
  
  &.dragging-over {
    background: var(--app-primary-alpha-50);
    border-color: var(--app-primary-color);
    box-shadow: inset 0 0 0 2px var(--app-primary-alpha-100);
  }
  
  .file-name-cell {
    display: flex;
    align-items: center;
    gap: var(--app-space-s);
  }
}

.upload-dragger {
  padding: var(--app-space-xl);
  text-align: center;
  
  .el-upload__text {
    margin-top: var(--app-space-s);
  }
}

.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 70vh;
  
  img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
  }
}
</style>