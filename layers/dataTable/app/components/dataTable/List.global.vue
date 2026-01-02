<template>
  <div class="table-list-wrapper">
    <!-- Header -->
    <div class="list-header">
      <div class="header-content">
        <h1>Tables</h1>
        <p class="subtitle">Create and manage your data tables</p>
      </div>
      <ElButton
        type="primary"
        :icon="Plus"
        @click="showCreateDialog = true"
      >
        New Table
      </ElButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <ElSkeleton :rows="5" animated />
    </div>

    <!-- Empty State -->
    <div v-else-if="tables.length === 0" class="empty-state">
      <div class="empty-icon">
        <Icon name="mdi:table-large" :size="64" />
      </div>
      <h3>No tables yet</h3>
      <p>Create your first table to start organizing data</p>
      <ElButton
        type="primary"
        :icon="Plus"
        @click="showCreateDialog = true"
      >
        Create Table
      </ElButton>
    </div>

    <!-- Table Grid -->
    <div v-else class="table-grid">
      <DataTableListCard
        v-for="table in tables"
        :key="table.id"
        :table="table"
        @click="navigateToTable(table)"
      />
    </div>

    <!-- Create Dialog -->
    <ElDialog
      v-model="showCreateDialog"
      title="Create New Table"
      width="500px"
      :close-on-click-modal="false"
    >
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <ElFormItem label="Table Name" prop="name">
          <ElInput
            v-model="form.name"
            placeholder="e.g., Customers, Projects, Inventory"
            @input="onNameChange"
          />
        </ElFormItem>

        <ElFormItem label="Slug" prop="slug">
          <ElInput
            v-model="form.slug"
            placeholder="auto-generated"
          />
        </ElFormItem>

        <ElFormItem label="Description">
          <ElInput
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="What is this table for?"
          />
        </ElFormItem>

        <ElFormItem label="Icon">
          <CommonIconPickerInput v-model="form.icon" />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="showCreateDialog = false">Cancel</ElButton>
        <ElButton
          type="primary"
          :loading="creating"
          @click="handleCreate"
        >
          Create Table
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { DataTable } from '#shared/types/db'

const props = defineProps<{
  workspaceId: string
}>()

// const router = useAppRouter()
const api = useAPI()
const dataTableSync = useDataTableSync()

// State
const tables = ref<DataTable[]>([])
const loading = ref(true)
const showCreateDialog = ref(false)
const creating = ref(false)
const formRef = ref<FormInstance>()

// Form
const form = ref({
  name: '',
  slug: '',
  description: '',
  icon: 'mdi:table',
})

const rules: FormRules = {
  name: [
    { required: true, message: 'Please enter a table name', trigger: 'blur' },
    { min: 2, max: 100, message: 'Length should be 2 to 100', trigger: 'blur' },
  ],
  slug: [
    { required: true, message: 'Please enter a slug', trigger: 'blur' },
    { pattern: /^[a-z0-9-]+$/, message: 'Only lowercase letters, numbers, and dashes', trigger: 'blur' },
  ],
}

// Load tables
async function loadTables() {
  loading.value = true
  try {
    // data_tables is auto-synced as a system table on login
    tables.value = await dataTableSync.getByWorkspaceId(props.workspaceId)
  } catch (error) {
    console.error('Failed to load tables:', error)
    ElMessage.error('Failed to load tables')
  } finally {
    loading.value = false
  }
}

// Auto-generate slug from name
function onNameChange() {
  if (!form.value.slug || form.value.slug === generateSlug(form.value.name)) {
    form.value.slug = generateSlug(form.value.name)
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Create table
async function handleCreate() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    creating.value = true
    try {
      const response = await api.post(`/workspaces/${props.workspaceId}/tables`, {
        name: form.value.name,
        slug: form.value.slug,
        description: form.value.description || undefined,
        icon: form.value.icon,
        columns: [
          // Create a default "Name" column
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            required: true,
            order: 0,
            isPrimaryDisplay: true,
          },
        ],
      })

      if (response.success) {
        ElMessage.success('Table created successfully')
        showCreateDialog.value = false
        
        // Reset form
        form.value = {
          name: '',
          slug: '',
          description: '',
          icon: 'mdi:table',
        }
        formRef.value?.resetFields()

        // Wait for sync
        setTimeout(() => {
          loadTables()
        }, 1000)
      }
    } catch (error: any) {
      console.error('Failed to create table:', error)
      ElMessage.error(error.data?.message || 'Failed to create table')
    } finally {
      creating.value = false
    }
  })
}

// Navigate to table
function navigateToTable(table: DataTable) {
  // TODO: Navigate to table view
  // router.push(`/workspaces/${props.workspaceId}/table/${table.slug}`)
}

// Watch for changes
dataTableSync.onDataTableChange((changes) => {
  console.log('dataTable changes', changes)
  loadTables()
})

// Load on mount
onMounted(() => {
  loadTables()
})
</script>

<style scoped lang="scss">
.table-list-wrapper {
  padding: var(--app-space-l);
  max-width: 1400px;
  margin: 0 auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--app-space-l);

  .header-content {
    h1 {
      font-size: 28px;
      font-weight: 600;
      margin: 0 0 var(--app-space-xs) 0;
      color: var(--el-text-color-primary);
    }

    .subtitle {
      margin: 0;
      color: var(--el-text-color-secondary);
      font-size: 14px;
    }
  }
}

.loading-state {
  padding: var(--app-space-l);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--app-space-xl) var(--app-space-l);
  text-align: center;
  min-height: 400px;

  .empty-icon {
    margin-bottom: var(--app-space-m);
    color: var(--el-text-color-placeholder);
    opacity: 0.5;
  }

  h3 {
    margin: 0 0 var(--app-space-xs) 0;
    font-size: 20px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 0 0 var(--app-space-m) 0;
    color: var(--el-text-color-secondary);
  }
}

.table-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--app-space-m);
}
</style>


