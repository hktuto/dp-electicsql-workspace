<template>
  <WrapperMain>
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

    <div v-else ref="wrapperRef" :class="['workspace-wrapper', { 'mobile-view': isMobileView }]">
      <!-- Mobile Menu Toggle -->
      <button 
        class="workspace-menu-toggle"
        @click="toggleWorkspaceMenu"
      >
        <Icon :name="isMenuOpen ? 'material-symbols:close' : 'material-symbols:menu'" />
      </button>

      <!-- Overlay for mobile -->
      <Transition name="fade">
        <div 
          v-if="isMenuOpen" 
          class="workspace-overlay"
          @click="isMenuOpen = false"
        />
      </Transition>

      <!-- Workspace Sidebar -->
      <aside :class="['workspace-sidebar', { open: isMenuOpen }]">
        <!-- Header: Workspace Info -->
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
        
        <!-- Body: Menu -->
        <div class="sidebar-body">
          <WorkspaceMenu
            :workspace-id="workspace.id"
            :initial-menu="workspace.menu || []"
            :is-admin="isCompanyAdmin"
          />
        </div>
        
        <!-- Footer: Actions -->
        <div class="sidebar-footer">
          <div class="footer-item" @click="goToSettings">
            <Icon name="material-symbols:settings-outline-rounded" />
            <span>Settings</span>
          </div>
        </div>
      </aside>

      <!-- Workspace Content -->
      <div class="workspace-content">
        <!-- Header -->
        <header class="workspace-header">
          <div class="header-left">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item 
                v-for="(item, index) in breadcrumbs" 
                :key="index"
                :to="item.path ? { path: item.path } : undefined"
              >
                {{ item.label }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div id="workspace-header-actions" class="header-right">
            <!-- Actions based on view -->
            <el-button v-if="viewType === 'home'" @click="goToSettings">
              <Icon name="material-symbols:settings-outline" />
              Settings
            </el-button>
          </div>
        </header>

        <!-- Main Content - Route-based rendering -->
        <main class="workspace-main">
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
        </main>
      </div>
    </div>
  </WrapperMain>
</template>

<script setup lang="ts">
import type { Workspace } from '#shared/types/db'

interface Props {
  slug: string
  route?: string[] // The sub-route path segments, e.g. ['setting'] or ['folder', 'abc']
}

const props = withDefaults(defineProps<Props>(), {
  route: () => []
})

const router = useRouter()

// Sync & context
const { currentCompany, isAdmin: isCompanyAdmin } = useCompanyContext()
const workspaceSync = useWorkspaceSync()
const companySync = useCompanySync()

// Responsive state
const wrapperRef = ref<HTMLElement | null>(null)
const isMobileView = ref(false)
let resizeObserver: ResizeObserver | null = null

// Menu state
const isMenuOpen = ref(false)

// Workspace data
const workspace = ref<Workspace | null>(null)
const loading = ref(true)

// Parse route to determine view
const viewType = computed(() => {
  const params = props.route
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
const subSlug = computed(() => props.route[1] || null)

// Breadcrumb items
const breadcrumbs = computed(() => {
  const items = [
    { label: 'Workspaces', path: '/workspaces' },
    { label: workspace.value?.name || props.slug, path: `/workspaces/${props.slug}` },
  ]
  
  const params = props.route
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

// Load workspace
async function loadWorkspace() {
  if (!currentCompany.value?.id) return
  
  loading.value = workspace.value ? false : true
  try {
    workspace.value = await workspaceSync.findBySlug(currentCompany.value.id, props.slug)
    
    if (!workspace.value) {
      ElMessage.error('Workspace not found')
      router.push('/workspaces')
    }
  } finally {
    loading.value = false
  }
}

// Navigation
function toggleWorkspaceMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function goToSettings() {
  router.push(`/workspaces/${props.slug}/setting`)
}

function goBack() {
  router.push('/workspaces')
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    companySync.startSync(),
    workspaceSync.startSync(),
  ])
  await loadWorkspace()

  // Subscribe to workspace changes
  workspaceSync.onChange((changes) => {
    if (changes.update.some((w: any) => w.new.slug === props.slug)) {
      loadWorkspace()
    }
    if (changes.delete.some((w: any) => w.slug === props.slug)) {
      ElMessage.warning('Workspace was deleted')
      router.push('/workspaces')
    }
  })

  // Set up ResizeObserver for container-based responsive
  nextTick(() => {
    if (wrapperRef.value) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          isMobileView.value = entry.contentRect.width < 768
          // Close menu when switching to desktop
          if (!isMobileView.value) {
            isMenuOpen.value = false
          }
        }
      })
      resizeObserver.observe(wrapperRef.value)
    }
  })
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

// Watch for slug changes
watch(() => props.slug, () => {
  loadWorkspace()
})

// Close menu on route change
watch(() => props.route, () => {
  isMenuOpen.value = false
})
</script>

<style scoped lang="scss">
.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--app-space-xs);
  color: var(--app-text-color-secondary);
  background: var(--app-bg);
}

.workspace-wrapper {
  height: 100%;
  display: grid;
  grid-template-columns: min-content 1fr;
  position: relative;
  // Transform creates new stacking context for fixed children
  transform: translateZ(0);
  container-name: workspaceWrapper;
  container-type: inline-size;

  // Responsive: single column on mobile
  &.mobile-view {
    grid-template-columns: 1fr;

    .workspace-menu-toggle {
      display: flex;
    }

    .workspace-overlay {
      display: block;
    }

    .workspace-sidebar {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      z-index: 100;
      transform: translateX(-100%);
      box-shadow: var(--app-shadow-xl);

      &.open {
        transform: translateX(0);
      }
    }

    .header-left {
      padding-left: 44px;
    }
  }
}

// Mobile menu toggle
.workspace-menu-toggle {
  display: none;
  position: absolute;
  top: var(--app-space-s);
  left: var(--app-space-s);
  z-index: 101;
  width: 36px;
  height: 36px;
  border-radius: var(--app-border-radius-s);
  border: 1px solid var(--app-border-color);
  background: var(--app-bg-color);
  color: var(--app-text-color-regular);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s ease;

  &:hover {
    background: var(--app-fill-color);
    color: var(--app-primary-color);
  }
}

// Overlay
.workspace-overlay {
  display: none;
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
  backdrop-filter: blur(2px);
}

// Sidebar
.workspace-sidebar {
  width: 280px;
  height: 100%;
  background: var(--el-bg-color);
  border-right: 1px solid var(--app-border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.3s ease;
}

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

// Content area
.workspace-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// Header
.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--app-space-s) var(--app-space-m);
  min-height: 52px;
  border-bottom: 1px solid var(--app-border-color);
  background: var(--el-bg-color);
  gap: var(--app-space-m);
}

.header-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  flex-shrink: 0;
}

// Main content
.workspace-main {
  flex: 1;
  overflow: auto;
  background: var(--app-bg);
}

.welcome-content,
.placeholder-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--app-space-l);
}

// Transitions
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
