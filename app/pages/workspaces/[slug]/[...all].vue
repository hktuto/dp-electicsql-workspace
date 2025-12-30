<script setup lang="ts">
import type { Workspace } from '#shared/types/db'

// Route params
const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)
const allParams = computed(() => {
  const all = route.params.all
  return Array.isArray(all) ? all : all ? [all] : []
})

// Determine view type based on route
const viewType = computed(() => {
  const params = allParams.value
  if (params.length === 0) return 'home'
  if (params[0] === 'setting') return 'settings'
  if (params[0] === 'folder' && params.length >= 2) {
    return params[2] === 'setting' ? 'folder-settings' : 'folder'
  }
  if (params[0] === 'view' && params.length >= 2) {
    return params[2] === 'setting' ? 'view-settings' : 'view'
  }
  if (params[0] === 'dashboard' && params.length >= 2) {
    return params[2] === 'setting' ? 'dashboard-settings' : 'dashboard'
  }
  return 'not-found'
})

// Sub-route slug (e.g., folder ID, view ID)
const subSlug = computed(() => allParams.value[1] || null)

// Sync & context
const { currentCompany, isAdmin: isCompanyAdmin } = useCompanyContext()
const workspaceSync = useWorkspaceSync()
const companySync = useCompanySync()

// Local state
const workspace = ref<Workspace | null>(null)
const loading = ref(true)

// Load workspace from PGLite
async function loadWorkspace() {
  if (!currentCompany.value?.id) return
  
  loading.value = workspace.value ? false : true
  try {
    workspace.value = await workspaceSync.findBySlug(currentCompany.value.id, slug.value)
    
    if (!workspace.value) {
      ElMessage.error('Workspace not found')
      router.push('/workspaces')
    }
  } finally {
    loading.value = false
  }
}

// Start sync and load workspace
onMounted(async () => {
  await Promise.all([
    companySync.startSync(),
    workspaceSync.startSync(),
  ])
  await loadWorkspace()

  // Subscribe to workspace changes
  workspaceSync.onChange((changes) => {
    if (changes.update.some((w: any) => w.new.slug === slug.value)) {
      loadWorkspace()
    }
    if (changes.delete.some((w: any) => w.slug === slug.value)) {
      ElMessage.warning('Workspace was deleted')
      router.push('/workspaces')
    }
  })
})

// Watch slug changes
watch(slug, () => {
  loadWorkspace()
})

// Navigation helpers
function goToSettings() {
  router.push(`/workspaces/${slug.value}/setting`)
}

function goBack() {
  router.push('/workspaces')
}

// Breadcrumb items
const breadcrumbs = computed(() => {
  const items = [
    { label: 'Workspaces', path: '/workspaces' },
    { label: workspace.value?.name || slug.value, path: `/workspaces/${slug.value}` },
  ]
  
  const params = allParams.value
  if (params[0] === 'setting') {
    items.push({ label: 'Settings', path: '' })
  } else if (params[0] === 'folder' && params[1]) {
    items.push({ label: 'Folder', path: '' })
    if (params[2] === 'setting') {
      items.push({ label: 'Settings', path: '' })
    }
  } else if (params[0] === 'view' && params[1]) {
    items.push({ label: 'View', path: '' })
    if (params[2] === 'setting') {
      items.push({ label: 'Settings', path: '' })
    }
  } else if (params[0] === 'dashboard' && params[1]) {
    items.push({ label: 'Dashboard', path: '' })
    if (params[2] === 'setting') {
      items.push({ label: 'Settings', path: '' })
    }
  }
  
  return items
})
</script>

<template>
  <div v-if="loading" class="loading-state">
    <el-icon class="is-loading"><Loading /></el-icon>
    <span>Loading workspace...</span>
  </div>

  <div v-else-if="!workspace" class="error-state">
    <el-empty description="Workspace not found">
      <el-button type="primary" @click="goBack">
        Back to Workspaces
      </el-button>
    </el-empty>
  </div>

  <WrapperWorkspace v-else>
    <!-- Sidebar: Workspace Menu -->
    <template #sidebar>
      <div class="sidebar-header">
        <div class="workspace-info">
          <div class="workspace-icon">
            <Icon v-if="workspace.icon" :name="workspace.icon" size="24" />
            <el-avatar v-else :size="32" shape="square">
              {{ workspace.name.charAt(0).toUpperCase() }}
            </el-avatar>
          </div>
          <div class="workspace-name">{{ workspace.name }}</div>
        </div>
      </div>
      
      <div class="sidebar-body">
        <WorkspaceMenu
          :workspace-id="workspace.id"
          :initial-menu="workspace.menu || []"
          :is-admin="isCompanyAdmin"
        />
      </div>
      
      <div class="sidebar-footer">
        <div class="footer-item" @click="goToSettings">
          <Icon name="material-symbols:settings-outline-rounded" />
          <span>Settings</span>
        </div>
      </div>
    </template>

    <!-- Breadcrumb -->
    <template #breadcrumb>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item 
          v-for="(item, index) in breadcrumbs" 
          :key="index"
          :to="item.path ? { path: item.path } : undefined"
        >
          {{ item.label }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </template>

    <!-- Actions (teleport target) -->
    <template #actions>
      <el-button v-if="viewType === 'home'" @click="goToSettings">
        <Icon name="material-symbols:settings-outline" />
        Settings
      </el-button>
    </template>

    <!-- Main Content -->
    <div class="workspace-view">
      <!-- Home View -->
      <template v-if="viewType === 'home'">
        <div class="welcome-content">
          <el-empty 
            description="Welcome to your workspace"
            :image-size="200"
          >
            <template #description>
              <p>This workspace is ready to go!</p>
              <p>Add tables, views, and dashboards from the menu.</p>
            </template>
          </el-empty>
        </div>
      </template>

      <!-- Settings View -->
      <template v-else-if="viewType === 'settings'">
        <WorkspaceSettings :slug="slug" />
      </template>

      <!-- Folder View -->
      <template v-else-if="viewType === 'folder'">
        <div class="placeholder-view">
          <el-empty description="Folder View">
            <template #description>
              <p>Folder: {{ subSlug }}</p>
              <p>Coming in Phase 4</p>
            </template>
          </el-empty>
        </div>
      </template>

      <!-- View (Table) View -->
      <template v-else-if="viewType === 'view'">
        <div class="placeholder-view">
          <el-empty description="Table View">
            <template #description>
              <p>View: {{ subSlug }}</p>
              <p>Coming in Phase 5</p>
            </template>
          </el-empty>
        </div>
      </template>

      <!-- Dashboard View -->
      <template v-else-if="viewType === 'dashboard'">
        <div class="placeholder-view">
          <el-empty description="Dashboard View">
            <template #description>
              <p>Dashboard: {{ subSlug }}</p>
              <p>Coming in Phase 6</p>
            </template>
          </el-empty>
        </div>
      </template>

      <!-- Not Found -->
      <template v-else>
        <div class="placeholder-view">
          <el-empty description="Page not found">
            <el-button type="primary" @click="router.push(`/workspaces/${slug}`)">
              Go to Workspace Home
            </el-button>
          </el-empty>
        </div>
      </template>
    </div>
  </WrapperWorkspace>
</template>

<style scoped lang="scss">
.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: var(--app-space-xs);
  color: var(--app-text-color-secondary);
  background: var(--app-bg);
}

// Sidebar styles
.sidebar-header {
  padding: var(--app-space-m);
  border-bottom: 1px solid var(--app-border-color);
}

.workspace-info {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
}

.workspace-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.workspace-name {
  font-weight: 600;
  font-size: var(--app-font-size-m);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-footer {
  padding: var(--app-space-s);
  border-top: 1px solid var(--app-border-color);
}

.footer-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-s);
  border-radius: var(--app-border-radius-s);
  cursor: pointer;
  color: var(--app-text-color-secondary);
  transition: all 0.15s ease;

  &:hover {
    background: var(--app-fill-color);
    color: var(--app-text-color-primary);
  }
}

// Content views
.workspace-view {
  height: 100%;
}

.welcome-content,
.placeholder-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--app-space-l);
}
</style>

