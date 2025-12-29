<script setup lang="ts">
import type { Workspace } from '~/composables/useWorkspaceSync'

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

// Form data
const createForm = ref({
  name: '',
  description: '',
  icon: '',
})

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
  workspaceSync.onChange(() => {
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
    
    // Data will auto-refresh via Electric SQL sync
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
                <IconPickerInput 
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

      <div v-else class="workspace-grid">
        <el-card 
          v-for="workspace in workspaces" 
          :key="workspace.id"
          class="workspace-card"
          shadow="hover"
        >
          <div class="workspace-header">
            <div class="workspace-icon">
              <Icon v-if="workspace.icon" :name="workspace.icon" size="32" />
              <el-avatar v-else :size="48" shape="square">
                {{ workspace.name.charAt(0).toUpperCase() }}
              </el-avatar>
            </div>
            <el-dropdown trigger="click" @command="(cmd: string) => cmd === 'settings' ? goToWorkspaceSettings(workspace.slug) : null">
              <el-button text circle>
                <Icon name="material-symbols:more-vert" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="settings">
                    <Icon name="material-symbols:settings-outline" />
                    Settings
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          
          <div class="workspace-info" @click="goToWorkspace(workspace.slug)">
            <h3>{{ workspace.name }}</h3>
            <p v-if="workspace.description">{{ workspace.description }}</p>
            <div class="workspace-meta">
              <el-tag size="small">{{ workspace.menu?.length || 0 }} items</el-tag>
            </div>
          </div>
        </el-card>
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

.no-company,
.no-workspaces {
  padding: var(--app-space-xl);
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--app-space-m);
}

.workspace-card {
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-m);
  }
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.workspace-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.workspace-info {
  flex: 1;
  cursor: pointer;

  h3 {
    margin: 0 0 var(--app-space-xs);
    font-size: var(--app-font-size-l);
    font-weight: 600;
  }

  p {
    margin: 0 0 var(--app-space-s);
    font-size: var(--app-font-size-s);
    color: var(--app-text-color-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.workspace-meta {
  display: flex;
  gap: var(--app-space-xs);
  align-items: center;
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

