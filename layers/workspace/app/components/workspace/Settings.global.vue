<script setup lang="ts">
import type { Workspace } from '#shared/types/db'
import { ElMessageBox } from 'element-plus'
interface Props {
  slug: string
}
const props = defineProps<Props>()

const { user } = useAuth()
const router = useRouter()
const workspaceSync = useWorkspaceSync()
const companySync = useCompanySync()
const { currentCompany, canManageCompany } = useCompanyContext()

// Local state
const workspace = ref<Workspace | null>(null)
const loading = ref(false)
const activeTab = ref('general')

// Form data
const form = ref({
  name: '',
  slug: '',
  description: '',
  icon: '',
})

// Load workspace from PGLite
async function loadWorkspace() {
  if (!currentCompany.value?.id) return
  
  loading.value = true
  try {
    workspace.value = await workspaceSync.findBySlug(currentCompany.value.id, props.slug)
    
    if (!workspace.value) {
      ElMessage.error('Workspace not found')
      router.push('/workspaces')
      return
    }

    // Populate form
    form.value = {
      name: workspace.value.name,
      slug: workspace.value.slug,
      description: workspace.value.description || '',
      icon: workspace.value.icon || '',
    }
  } finally {
    loading.value = false
  }
}

// Start sync and load workspace
onMounted(async () => {
  // Start company_members sync (workspaces are auto-synced as system table)
  // await companySync.startSync()
  loadWorkspace()

  // Subscribe to workspace changes
  workspaceSync.onChange((changes) => {
    // Re-load if this workspace was updated
    if (changes.update.some((w: any) => w.new.id === workspace.value?.id)) {
      // TODO alret user that someone has edited the workspace
      ElMessageBox.confirm('Someone has edited the workspace. Do you want to reload the workspace?', 'Workspace has been edited', {
        confirmButtonText: 'Reload',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }).then(() => {
        loadWorkspace()
      })
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

const saving = ref(false)
async function handleSave() {
  if (!workspace.value) return

  if (!form.value.name || !form.value.slug) {
    ElMessage.error('Name and slug are required')
    return
  }

  saving.value = true
  try {
    const { $api } = useNuxtApp()
    await $api(`/api/workspaces/${workspace.value.id}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        slug: form.value.slug,
        description: form.value.description || null,
        icon: form.value.icon || null,
      },
    })

    ElMessage.success('Workspace updated successfully')
    
    // If slug changed, redirect to new URL
    if (form.value.slug !== props.slug) {
      router.push(`/workspaces/${form.value.slug}/setting`)
    }
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to update workspace')
  } finally {
    saving.value = false
  }
}

const showDeleteDialog = ref(false)
const deleting = ref(false)
const deleteConfirmText = ref('')

async function handleDelete() {
  if (!workspace.value) return

  if (deleteConfirmText.value !== workspace.value.name) {
    ElMessage.error('Workspace name does not match')
    return
  }

  deleting.value = true
  try {
    const { $api } = useNuxtApp()
    await $api(`/api/workspaces/${workspace.value.id}`, {
      method: 'DELETE',
    })

    ElMessage.success('Workspace deleted successfully')
    showDeleteDialog.value = false
    router.push('/workspaces')
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to delete workspace')
  } finally {
    deleting.value = false
  }
}

function goBack() {
  router.push(`/workspaces/${props.slug}`)
}
</script>

<template>

  <div class="workspace-setting-page">
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

    <div v-else class="workspace-setting-content">
      <!-- Header -->
      <div class="setting-header">
        <div class="header-left">
          <el-button text @click="goBack">
            <Icon name="material-symbols:arrow-back" />
            Back
          </el-button>
          <h1>Workspace Settings</h1>
        </div>
        <div class="header-right">
          <el-button @click="handleSave" type="primary" :loading="saving">
            Save Changes
          </el-button>
        </div>
      </div>

      <!-- Content -->
      <div class="setting-body">
        <el-tabs v-model="activeTab">
          <!-- General Settings -->
          <el-tab-pane label="General" name="general">
            <div class="tab-content">
              <el-form :model="form" label-position="top">
                <el-form-item label="Workspace Name" required>
                  <el-input 
                    v-model="form.name" 
                    placeholder="Enter workspace name"
                  />
                </el-form-item>

                <el-form-item label="Slug" required>
                  <el-input 
                    v-model="form.slug" 
                    placeholder="workspace-slug"
                  >
                    <template #prepend>/workspaces/</template>
                  </el-input>
                  <div class="form-hint">
                    Lowercase alphanumeric with hyphens only. Used in URLs.
                  </div>
                </el-form-item>

                <el-form-item label="Icon (optional)">
                  <IconPickerInput 
                    v-model="form.icon" 
                    placeholder="Choose an icon"
                  />
                  <div class="form-hint">
                    Or enter any <a href="https://icones.js.org" target="_blank">Iconify</a> icon name manually
                  </div>
                </el-form-item>

                <el-form-item label="Description (optional)">
                  <el-input 
                    v-model="form.description" 
                    type="textarea"
                    :rows="4"
                    placeholder="Describe this workspace"
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- Menu Configuration -->
          <el-tab-pane label="Menu" name="menu">
            <div class="tab-content">
              <el-alert 
                type="info" 
                :closable="false"
                style="margin-bottom: var(--app-space-m)"
              >
                Menu configuration will be available once your menu system is ready.
              </el-alert>
              
              <div class="menu-preview">
                <h3>Current Menu Items</h3>
                <div v-if="workspace.menu && workspace.menu.length > 0">
                  <div v-for="item in workspace.menu" :key="item.id" class="menu-item-preview">
                    <Icon :name="item.type === 'folder' ? 'material-symbols:folder' : 'material-symbols:description'" />
                    <span>{{ item.label }}</span>
                    <el-tag size="small">{{ item.type }}</el-tag>
                  </div>
                </div>
                <el-empty v-else description="No menu items yet" :image-size="80" />
              </div>
            </div>
          </el-tab-pane>

          <!-- Danger Zone -->
          <el-tab-pane label="Danger Zone" name="danger">
            <div class="tab-content">
              <el-card shadow="never" class="danger-card">
                <template #header>
                  <div class="danger-header">
                    <Icon name="material-symbols:warning" style="color: var(--el-color-danger)" />
                    <span>Delete Workspace</span>
                  </div>
                </template>
                <div class="danger-content">
                  <p>
                    Permanently delete this workspace and all its data. This action cannot be undone.
                  </p>
                  <el-button 
                    type="danger" 
                    @click="showDeleteDialog = true"
                    :disabled="!canManageCompany"
                  >
                    Delete Workspace
                  </el-button>
                  <div v-if="!canManageCompany" class="permission-hint">
                    Only company admins can delete workspaces
                  </div>
                </div>
              </el-card>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <el-dialog
      v-model="showDeleteDialog"
      title="Delete Workspace"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-alert 
        type="error" 
        :closable="false"
        style="margin-bottom: var(--app-space-m)"
      >
        <template #title>
          <strong>Warning: This action cannot be undone</strong>
        </template>
      </el-alert>

      <p style="margin-bottom: var(--app-space-m)">
        All workspace data including tables, views, and dashboards will be permanently deleted.
      </p>

      <el-form label-position="top">
        <el-form-item :label="`Type '${workspace?.name}' to confirm`">
          <el-input 
            v-model="deleteConfirmText" 
            placeholder="Enter workspace name"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDeleteDialog = false; deleteConfirmText = ''" :disabled="deleting">
          Cancel
        </el-button>
        <el-button 
          type="danger" 
          @click="handleDelete" 
          :loading="deleting"
          :disabled="deleteConfirmText !== workspace?.name"
        >
          Delete Workspace
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.workspace-setting-page {
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

.workspace-setting-content {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.setting-header {
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

  h1 {
    margin: 0;
    font-size: var(--app-font-size-xl);
    font-weight: var(--app-font-weight-title);
  }
}

.header-right {
  display: flex;
  gap: var(--app-space-s);
}

.setting-body {
  flex: 1;
  overflow: auto;
  padding: var(--app-space-l);
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
}

.tab-content {
  padding: var(--app-space-m) 0;
}

.form-hint {
  margin-top: var(--app-space-xs);
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);

  a {
    color: var(--app-primary-color);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.menu-preview {
  h3 {
    margin: 0 0 var(--app-space-m);
    font-size: var(--app-font-size-l);
    font-weight: 600;
  }
}

.menu-item-preview {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-s) var(--app-space-m);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-s);
  margin-bottom: var(--app-space-xs);

  span {
    flex: 1;
  }
}

.danger-card {
  border: 1px solid var(--el-color-danger-light-7);

  :deep(.el-card__header) {
    background: var(--el-color-danger-light-9);
  }
}

.danger-header {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  font-weight: 600;
}

.danger-content {
  p {
    margin: 0 0 var(--app-space-m);
    color: var(--app-text-color-secondary);
  }

  .permission-hint {
    margin-top: var(--app-space-s);
    font-size: var(--app-font-size-s);
    color: var(--app-text-color-secondary);
  }
}
</style>

