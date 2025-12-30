<template>
  <div class="table-settings-wrapper">
    <div class="settings-header">
      <div>
        <h1>{{ table?.name }} Settings</h1>
        <p class="subtitle">Manage table configuration and columns</p>
      </div>
    </div>

    <ElTabs v-model="activeTab" class="settings-tabs">
      <!-- General Tab -->
      <ElTabPane label="General" name="general">
        <div class="tab-content">
          <ElForm
            ref="generalFormRef"
            :model="generalForm"
            label-position="top"
          >
            <ElFormItem label="Table Name">
              <ElInput v-model="generalForm.name" />
            </ElFormItem>

            <ElFormItem label="Slug">
              <ElInput v-model="generalForm.slug" disabled />
              <template #extra>
                <span class="form-extra">Slug cannot be changed after creation</span>
              </template>
            </ElFormItem>

            <ElFormItem label="Description">
              <ElInput
                v-model="generalForm.description"
                type="textarea"
                :rows="4"
              />
            </ElFormItem>

            <ElFormItem label="Icon">
              <CommonIconPickerInput v-model="generalForm.icon" />
            </ElFormItem>

            <ElFormItem>
              <ElButton
                type="primary"
                :loading="saving"
                @click="saveGeneral"
              >
                Save Changes
              </ElButton>
            </ElFormItem>
          </ElForm>
        </div>
      </ElTabPane>

      <!-- Columns Tab -->
      <ElTabPane label="Columns" name="columns">
        <div class="tab-content">
          <div class="columns-header">
            <p>Define the structure of your table by managing columns</p>
            <ElButton
              ref="addColumnButtonRef"
              type="primary"
              :icon="Plus"
              @click="showColumnDialog = true"
            >
              Add Column
            </ElButton>
          </div>

          <!-- Columns List -->
          <div class="columns-list">
            <div
              v-for="column in columns"
              :key="column.id"
              class="column-item"
            >
              <div class="column-icon">
                <Icon :name="getColumnIcon(column.type)" :size="20" />
              </div>
              <div class="column-info">
                <div class="column-name">
                  {{ column.label }}
                  <ElTag v-if="column.required" size="small" type="danger">Required</ElTag>
                  <ElTag v-if="column.isUnique" size="small" type="warning">Unique</ElTag>
                  <ElTag v-if="column.isPrimaryDisplay" size="small" type="primary">Primary</ElTag>
                </div>
                <div class="column-meta">
                  {{ column.name }} • {{ column.type }}
                </div>
              </div>
              <div class="column-actions">
                <ElButton text :icon="Edit" @click="editColumn(column)" />
                <ElButton
                  text
                  :icon="Delete"
                  type="danger"
                  @click="deleteColumn(column)"
                />
              </div>
            </div>

            <div v-if="columns.length === 0" class="empty-columns">
              <Icon name="mdi:table-column-plus-after" :size="48" />
              <p>No columns yet. Add your first column to get started.</p>
            </div>
          </div>
        </div>
      </ElTabPane>

      <!-- Danger Zone Tab -->
      <ElTabPane label="Danger Zone" name="danger">
        <div class="tab-content">
          <div class="danger-zone">
            <div class="danger-item">
              <div>
                <h3>Delete Table</h3>
                <p>Permanently delete this table and all its data. This action cannot be undone.</p>
              </div>
              <ElButton
                type="danger"
                @click="handleDelete"
              >
                Delete Table
              </ElButton>
            </div>
          </div>
        </div>
      </ElTabPane>
    </ElTabs>

    <!-- Column Dialog -->
    <DataTableColumnDialog
      v-model="showColumnDialog"
      :table-slug="tableSlug"
      :column="editingColumn"
      @saved="onColumnSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { DataTable, DataTableColumn } from '#shared/types/db'

const props = defineProps<{
  tableSlug: string
  workspaceId: string
}>()

const router = useAppRouter()
const { $api } = useNuxtApp()
const dataTableSync = useDataTableSync()

// State
const table = ref<DataTable | null>(null)
const columns = ref<DataTableColumn[]>([])
const activeTab = ref('general')
const saving = ref(false)
const addColumnButtonRef = ref<HTMLElement>()
const showColumnDialog = ref(false)
const editingColumn = ref<DataTableColumn | null>(null)

// Forms
const generalFormRef = ref()
const generalForm = ref({
  name: '',
  slug: '',
  description: '',
  icon: 'mdi:table',
})

// Load table
async function loadTable() {
  table.value = await dataTableSync.findById(props.tableId)
  if (table.value) {
    generalForm.value = {
      name: table.value.name,
      slug: table.value.slug,
      description: table.value.description || '',
      icon: table.value.icon || 'mdi:table',
    }
  }
}

// Load columns
async function loadColumns() {
  columns.value = await dataTableSync.getColumns(props.tableId)
}

// Save general settings
async function saveGeneral() {
  saving.value = true
  try {
    
    await $api(`/workspaces/${props.workspaceId}/tables/${props.tableSlug}`, {
      method: 'PUT',
      body: {
      name: generalForm.value.name,
      description: generalForm.value.description,
      icon: generalForm.value.icon,
      }
    })
    ElMessage.success('Settings saved')
    setTimeout(loadTable, 1000)
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

// Edit column
function editColumn(column: DataTableColumn) {
  editingColumn.value = column
  showColumnDialog.value = true
}

// Delete column
async function deleteColumn(column: DataTableColumn) {
  try {
    await ElMessageBox.confirm(
      `Delete column "${column.label}"? This will permanently remove the column and all its data.`,
      'Delete Column',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    )

    await $api(`/tables/${props.tableSlug}/columns/${column.id}`, {
      method: 'DELETE',
    })
    ElMessage.success('Column deleted')
    setTimeout(loadColumns, 1000)
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.data?.message || 'Failed to delete column')
    }
  }
}

// Handle column saved
function onColumnSaved() {
  editingColumn.value = null
  setTimeout(loadColumns, 1000)
}

// Delete table
async function handleDelete() {
  try {
    await ElMessageBox.confirm(
      `Delete table "${table.value?.name}"? This will permanently delete the table and all its data. This action cannot be undone.`,
      'Delete Table',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'error',
      }
    )

    await $api(`/workspaces/${props.workspaceId}/tables/${props.tableSlug}`, {
      method: 'DELETE',
    })
    ElMessage.success('Table deleted')
    router.push(`/workspaces/${props.workspaceId}/tables`)
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.data?.message || 'Failed to delete table')
    }
  }
}

// Get column type icon
function getColumnIcon(type: string): string {
  const icons: Record<string, string> = {
    text: 'mdi:format-text',
    long_text: 'mdi:text',
    number: 'mdi:numeric',
    currency: 'mdi:currency-usd',
    date: 'mdi:calendar',
    checkbox: 'mdi:checkbox-marked',
    switch: 'mdi:toggle-switch',
    email: 'mdi:email',
    phone: 'mdi:phone',
    url: 'mdi:link',
    select: 'mdi:form-select',
    multi_select: 'mdi:format-list-checks',
    color: 'mdi:palette',
    geolocation: 'mdi:map-marker',
    relation: 'mdi:link-variant',
    lookup: 'mdi:eye',
    formula: 'mdi:function',
    attachment: 'mdi:paperclip',
  }
  return icons[type] || 'mdi:help-circle'
}

// Watch for changes
dataTableSync.onDataTableChange((changes) => {
  loadTable()
  loadColumns()
})

// Load on mount
onMounted(() => {
  loadTable()
  loadColumns()
})

// Close dialog when route changes
watch(() => showColumnDialog.value, (val) => {
  if (!val) {
    editingColumn.value = null
  }
})
</script>

<style scoped lang="scss">
.table-settings-wrapper {
  padding: var(--app-space-l);
  max-width: 1000px;
  margin: 0 auto;
}

.settings-header {
  margin-bottom: var(--app-space-l);

  h1 {
    font-size: 28px;
    font-weight: 600;
    margin: 0 0 var(--app-space-xs) 0;
  }

  .subtitle {
    margin: 0;
    color: var(--el-text-color-secondary);
    font-size: 14px;
  }
}

.settings-tabs {
  :deep(.el-tabs__content) {
    padding: 0;
  }
}

.tab-content {
  padding: var(--app-space-m) 0;
}

.form-extra {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.columns-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--app-space-m);

  p {
    margin: 0;
    color: var(--el-text-color-secondary);
  }
}

.columns-list {
  .column-item {
    display: flex;
    align-items: center;
    gap: var(--app-space-m);
    padding: var(--app-space-m);
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
    margin-bottom: var(--app-space-s);
    transition: all 0.2s;

    &:hover {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);

      .column-actions {
        opacity: 1;
      }
    }
  }

  .column-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--el-fill-color-light);
    border-radius: var(--el-border-radius-base);
    color: var(--el-text-color-regular);
  }

  .column-info {
    flex: 1;

    .column-name {
      display: flex;
      align-items: center;
      gap: var(--app-space-xs);
      font-weight: 500;
      margin-bottom: 4px;
    }

    .column-meta {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .column-actions {
    opacity: 0;
    transition: opacity 0.2s;
    display: flex;
    gap: var(--app-space-xs);
  }

  .empty-columns {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--app-space-xl);
    text-align: center;
    color: var(--el-text-color-placeholder);

    p {
      margin: var(--app-space-m) 0 0 0;
    }
  }
}

.danger-zone {
  .danger-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--app-space-m);
    border: 1px solid var(--el-color-danger-light-7);
    border-radius: var(--el-border-radius-base);
    background: var(--el-color-danger-light-9);

    h3 {
      margin: 0 0 var(--app-space-xs) 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--el-color-danger);
    }

    p {
      margin: 0;
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }
}
</style>


