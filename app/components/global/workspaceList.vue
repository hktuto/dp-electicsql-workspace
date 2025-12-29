<script setup lang="ts">
import type { Workspace } from '~/composables/useWorkspaceSync'
import { useAutoAnimate } from '@formkit/auto-animate/vue'
const { user } = useAuth()
const router = useRouter()
const workspaceSync = useWorkspaceSync()
const companySync = useCompanySync()
const { currentCompany } = useCompanyContext()
const breakpoint = useBreakpoint()

// Local state for this component only
const workspaces = ref<Workspace[]>([])
const loadingWorkspaces = ref(false)
const showCreateDialog = ref(false)
const searchQuery = ref('')
const isFilterActive = ref(false) // Stage 2: committed filter

// Form data
const createForm = ref({
  name: '',
  description: '',
  icon: '',
})

// Helper function to check if workspace matches query
function matchesSearch(workspace: Workspace, query: string): boolean {
  if (!query) return true
  
  const lowerQuery = query.toLowerCase()
  return (
    workspace.name.toLowerCase().includes(lowerQuery) ||
    workspace.description?.toLowerCase().includes(lowerQuery) ||
    workspace.slug.toLowerCase().includes(lowerQuery)
  )
}

// Stage 1: Dimming preview (show all, but mark which match)
// Sort to show matches first
const workspacesWithMatchStatus = computed(() => {
  if (!searchQuery.value.trim() || isFilterActive.value) {
    return workspaces.value.map(w => ({ workspace: w, matches: true, dimmed: false }))
  }

  const withStatus = workspaces.value.map(workspace => ({
    workspace,
    matches: matchesSearch(workspace, searchQuery.value),
    dimmed: !matchesSearch(workspace, searchQuery.value),
  }))
  
  // Sort: matches first, then non-matches
  return withStatus.sort((a, b) => {
    if (a.matches && !b.matches) return -1
    if (!a.matches && b.matches) return 1
    return 0
  })
})

// Stage 2: Actual filtering (hide non-matching)
const filteredWorkspaces = computed(() => {
  if (!isFilterActive.value || !searchQuery.value.trim()) {
    return workspacesWithMatchStatus.value
  }

  return workspacesWithMatchStatus.value.filter(({ matches }) => matches)
})

// Apply filter (Stage 2)
function applyFilter() {
  if (searchQuery.value.trim()) {
    isFilterActive.value = true
  }
}

// Reset filter
function resetFilter() {
  searchQuery.value = ''
  isFilterActive.value = false
}

// Handle Enter key
function handleSearchEnter() {
  if (!searchQuery.value.trim()) return
  
  // Count matches
  const matches = workspacesWithMatchStatus.value.filter(item => item.matches)
  
  // If only one match, navigate directly to it
  if (matches.length === 1 && matches[0]) {
    const workspace = matches[0].workspace
    goToWorkspace(workspace.slug)
    // Optional: clear search after navigation
    resetFilter()
    return
  }
  
  // Otherwise, apply filter normally
  applyFilter()
}

// Handle Escape key
function handleSearchEscape() {
  if (isFilterActive.value) {
    resetFilter()
  } else if (searchQuery.value) {
    searchQuery.value = ''
  }
}

// Load workspaces from PGLite
async function loadWorkspaces() {
  if (!user.value) return
  loadingWorkspaces.value = true
  try {
    if (currentCompany.value?.id) {
      // Load workspaces for current company
      workspaces.value = await workspaceSync.getByCompanyId(currentCompany.value.id)
    } else {
      // Load all workspaces user has access to
      workspaces.value = await workspaceSync.getByUserId(user.value.id)
    }
  } finally {
    loadingWorkspaces.value = false
  }
}

// Start sync and load workspaces
onMounted(async () => {
  await Promise.all([
    companySync.startSync(),
    workspaceSync.startSync(),
  ])
  await loadWorkspaces()

  // Subscribe to workspace changes - re-load when data changes
  workspaceSync.onChange((changes) => {
    console.log('[WorkspaceList] Data changed:', changes)
    loadWorkspaces()
  })
})

// Watch current company changes
watch(() => currentCompany.value?.id, () => {
  loadWorkspaces()
})

// No need to generate slug on client - server handles it

const creating = ref(false)
async function handleCreate() {
  if (!currentCompany.value?.id) {
    ElMessage.error('Please select a company first')
    return
  }

  if (!createForm.value.name) {
    ElMessage.error('Name is required')
    return
  }

  creating.value = true
  try {
    const { $api } = useNuxtApp()
    await $api('/api/workspaces', {
      method: 'POST',
      body: {
        name: createForm.value.name,
        description: createForm.value.description || null,
        icon: createForm.value.icon || null,
        companyId: currentCompany.value.id,
      },
    })

    ElMessage.success('Workspace created successfully')
    popoverDialogRef.value?.close()
    createForm.value = { name: '', description: '', icon: '' }
    
    // Wait for Electric SQL to sync, then reload
    // Electric SQL uses HTTP streaming which can take 1-2 seconds to detect changes
    setTimeout(() => {
      console.log('[WorkspaceList] Manual reload after creation')
      loadWorkspaces()
    }, 2000)
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to create workspace')
  } finally {
    creating.value = false
  }
}

function goToWorkspace(slug: string) {
  router.push(`/workspaces/${slug}`)
}

  function goToWorkspaceSettings(slug: string) {
    router.push(`/workspaces/${slug}/setting`)
  }

// Popover control
const createWorkspaceButtonRef = ref<HTMLElement>()
const popoverDialogRef = ref()

function handleOpenCreate() {
  // Pass the button element as target for popover positioning
  const target = createWorkspaceButtonRef.value
  if (target) {
    // Handle both element and component refs
    const el = (target as any).$el || target
    popoverDialogRef.value?.open(el)
  }
}
const createWorkspaceButton2Ref = ref<HTMLElement>()

function handleOpenCreateInEmptyState() {
  const target = createWorkspaceButton2Ref.value
  if (target) {
    const el = (target as any).$el || target
    popoverDialogRef.value?.open(el)
  }
}

const [parent] = useAutoAnimate()
</script>

<template>
  <WrapperMain>
  <div class="workspace-list-page">
    <div class="workspace-container">
      <div class="page-header">
        <div>
          <h1>Workspaces</h1>
          <p class="subtitle" v-if="currentCompany">{{ currentCompany.name }}</p>
        </div>
        <el-button 
          ref="createWorkspaceButtonRef"
          type="primary" 
          :disabled="!currentCompany"
          @click="handleOpenCreate"
        >
          <Icon name="material-symbols:add" />
          New Workspace
        </el-button>
      </div>
      
      <!-- Responsive Popover/Dialog -->
      <CommonPopoverDialog
        ref="popoverDialogRef"
        title="Create Workspace"
        :width="420"
        placement="bottom-end"
      >
        <!-- Form Content (works for both popover and dialog) -->
        <template #default>
          <div class="create-form-content" :class="{ mobile: breakpoint.isMobile }">
            <h3 v-if="!breakpoint.isMobile" class="form-title">Create Workspace</h3>
              
              <el-form :model="createForm" label-position="top">
                <el-form-item label="Name" required>
                  <el-input 
                    v-model="createForm.name" 
                    placeholder="Enter workspace name"
                    @keyup.enter="handleCreate"
                  />
                </el-form-item>

              <el-form-item label="Icon">
                <CommonIconPickerInput 
                  v-model="createForm.icon" 
                  placeholder="Choose an icon"
                  :size="breakpoint.isMobile ? 'default' : 'small'"
                />
              </el-form-item>

              <el-form-item label="Description">
                <el-input 
                  v-model="createForm.description" 
                  type="textarea"
                  :rows="breakpoint.isMobile ? 3 : 2"
                  placeholder="Describe this workspace"
                />
              </el-form-item>
            </el-form>
            
            <div class="form-actions">
              <el-button @click="popoverDialogRef?.close()" :disabled="creating">
                Cancel
              </el-button>
                <el-button 
                  type="primary" 
                  @click="handleCreate" 
                  :loading="creating"
                >
                  Create
                </el-button>
            </div>
          </div>
        </template>
      </CommonPopoverDialog>

      <!-- Search Bar -->
      <div v-if="!loadingWorkspaces && currentCompany && workspaces.length > 0" class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="Search workspaces... (Press Enter to filter)"
          clearable
          size="large"
          @keyup.enter="handleSearchEnter"
          @keyup.esc="handleSearchEscape"
        >
          <template #prefix>
            <Icon name="material-symbols:search" />
          </template>
          <template #append>
            <el-button 
              v-if="!isFilterActive && searchQuery" 
              @click="applyFilter"
              type="primary"
            >
              Filter
            </el-button>
            <el-button 
              v-if="isFilterActive" 
              @click="resetFilter"
            >
              <Icon name="material-symbols:close" />
              Reset
            </el-button>
          </template>
        </el-input>
        
        <!-- Filter status indicator -->
        <div v-if="isFilterActive" class="filter-status">
          <Icon name="material-symbols:filter-alt" />
          <span>Showing {{ filteredWorkspaces.length }} of {{ workspaces.length }} workspaces</span>
        </div>
        <div v-else-if="searchQuery && !isFilterActive" class="filter-preview">
          <Icon name="material-symbols:visibility-outline" />
          <span>Preview: {{ workspacesWithMatchStatus.filter(w => w.matches).length }} matches</span>
          <span class="hint">• Press Enter or click Filter to apply</span>
        </div>
      </div>

      <div v-if="loadingWorkspaces" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>Loading workspaces...</span>
      </div>

      <div v-else-if="!currentCompany" class="no-company">
        <el-empty description="Please select a company first">
          <el-button type="primary" @click="router.push('/')">
            Go to Home
          </el-button>
        </el-empty>
      </div>

      <div v-else-if="workspaces.length === 0" class="no-workspaces">
        <el-empty description="No workspaces yet">
          <el-button ref="createWorkspaceButton2Ref" type="primary" @click="handleOpenCreateInEmptyState">
            Create Your First Workspace
          </el-button>
        </el-empty>
      </div>

      <div v-else-if="filteredWorkspaces.length === 0" class="no-results">
        <el-empty description="No workspaces found">
          <template #default>
            <p>Try adjusting your search query</p>
            <el-button @click="searchQuery = ''">Clear Search</el-button>
          </template>
        </el-empty>
      </div>

      <div v-else ref="parent" class="workspace-grid">
        <WorkspaceListCard
          v-for="item in filteredWorkspaces"
          :key="item.workspace.id"
          :workspace="item.workspace"
          :dimmed="item.dimmed"
          @click="goToWorkspace(item.workspace.slug)"
          @settings="goToWorkspaceSettings(item.workspace.slug)"
        />
      </div>
    </div>

  </div>
</WrapperMain>
</template>

<style scoped lang="scss">
.workspace-list-page {
  min-height: 100vh;
  padding: var(--app-space-l);
  background: var(--app-bg);
}

.workspace-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--app-space-l);

  h1 {
    margin: 0 0 var(--app-space-xs);
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
  }

  .subtitle {
    margin: 0;
    color: var(--app-text-color-secondary);
    font-size: var(--app-font-size-m);
  }
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-xs);
  padding: var(--app-space-xl);
  color: var(--app-text-color-secondary);
}

.search-bar {
  margin-bottom: var(--app-space-l);
  max-width: 600px;
}

.filter-status,
.filter-preview {
  display: flex;
  align-items: center;
  gap: var(--app-space-xs);
  margin-top: var(--app-space-xs);
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);
  
  .i-icon {
    font-size: var(--app-font-size-m);
  }
}

.filter-status {
  color: var(--el-color-primary);
  font-weight: 500;
}

.filter-preview {
  .hint {
    opacity: 0.7;
    font-style: italic;
  }
}

.no-company,
.no-workspaces,
.no-results {
  padding: var(--app-space-xl);
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--app-space-m);
}

// Create form styles
.create-form-content {
  padding: var(--app-space-s) 0;

  &.mobile {
    padding: 0;
  }
}

.form-title {
  margin: 0 0 var(--app-space-m);
  font-size: var(--app-font-size-l);
  font-weight: 600;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-space-s);
  margin-top: var(--app-space-m);
  padding-top: var(--app-space-m);
  border-top: 1px solid var(--app-border-color);
}
</style>

