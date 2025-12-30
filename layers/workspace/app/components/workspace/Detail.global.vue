<script setup lang="ts">
import type { Workspace } from '#shared/types/db'

interface Props {
  slug: string
}
const props = defineProps<Props>()

const { user } = useAuth()
const router = useRouter()
const workspaceSync = useWorkspaceSync()
const companySync = useCompanySync()
const { currentCompany, isAdmin: isCompanyAdmin } = useCompanyContext()

// Local state
const workspace = ref<Workspace | null>(null)
const loading = ref(false)

// Load workspace from PGLite
async function loadWorkspace() {
  if (!currentCompany.value?.id) return
  
  loading.value = workspace.value ? false : true; // only load on initial load
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

// Start sync and load workspace
onMounted(async () => {
  await Promise.all([
    companySync.startSync(),
    workspaceSync.startSync(),
  ])
  await loadWorkspace()

  // Subscribe to workspace changes
  workspaceSync.onChange((changes) => {
    console.log('workspace changes', changes)
    // Re-load if this workspace was updated
    if (changes.update.some((w: any) => w.new.slug === props.slug)) {
      loadWorkspace()
      // Menu component will intelligently update via watch on initialMenu prop
    }
    // Redirect if this workspace was deleted
    if (changes.delete.some((w: any) => w.slug === props.slug)) {
      ElMessage.warning('Workspace was deleted')
      router.push('/workspaces')
    }
  })
})

// Watch slug changes
watch(() => props.slug, () => {
  loadWorkspace()
})

function goToSettings() {
  router.push(`/workspaces/${props.slug}/setting`)
}
</script>

<template>
  <WrapperMain>
  <div class="workspace-detail-page">
    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Loading workspace...</span>
    </div>

    <div v-else-if="!workspace" class="not-found">
      <el-empty description="Workspace not found">
        <el-button type="primary" @click="router.push('/workspaces')">
          Back to Workspaces
        </el-button>
      </el-empty>
    </div>

    <div v-else class="workspace-content">
      <!-- Header -->
      <div class="workspace-header">
        <div class="header-left">
          <el-button text @click="router.push('/workspaces')">
            <Icon name="material-symbols:arrow-back" />
            Back
          </el-button>
          <div class="workspace-title">
            <div class="workspace-icon">
              <Icon v-if="workspace.icon" :name="workspace.icon" size="32" />
              <el-avatar v-else :size="40" shape="square">
                {{ workspace.name.charAt(0).toUpperCase() }}
              </el-avatar>
            </div>
            <div>
              <h1>{{ workspace.name }}</h1>
              <p v-if="workspace.description" class="description">
                {{ workspace.description }}
              </p>
            </div>
          </div>
        </div>
        <div class="header-right">
          <el-button @click="goToSettings">
            <Icon name="material-symbols:settings-outline" />
            Settings
          </el-button>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="workspace-main">
        <!-- Sidebar with menu -->
        <div class="workspace-sidebar">
          <WorkspaceMenu
            :workspace-id="workspace.id"
            :initial-menu="workspace.menu || []"
            :is-admin="isCompanyAdmin"
          />
        </div>

        <!-- Content Area -->
        <div class="workspace-body">
          <el-empty 
            description="Welcome to your workspace"
            :image-size="200"
          >
            <template #description>
              <p>This workspace is ready to go!</p>
              <p>Add tables, views, and dashboards to get started.</p>
            </template>
          </el-empty>
        </div>
      </div>
    </div>
  </div>
</WrapperMain>
</template>

<style scoped lang="scss">
.workspace-detail-page {
  min-height: 100vh;
  background: var(--app-bg);
}

.loading,
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: var(--app-space-xs);
  color: var(--app-text-color-secondary);
}

.workspace-content {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--app-space-m) var(--app-space-l);
  border-bottom: 1px solid var(--app-border-color);
  background: var(--el-bg-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  flex: 1;
  min-width: 0;
}

.workspace-title {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  min-width: 0;

  h1 {
    margin: 0;
    font-size: var(--app-font-size-xl);
    font-weight: var(--app-font-weight-title);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .description {
    margin: var(--app-space-xs) 0 0;
    font-size: var(--app-font-size-s);
    color: var(--app-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.workspace-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-right {
  display: flex;
  gap: var(--app-space-s);
}

.workspace-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.workspace-sidebar {
  width: 280px;
  border-right: 1px solid var(--app-border-color);
  background: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-body {
  flex: 1;
  overflow: auto;
  padding: var(--app-space-l);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

