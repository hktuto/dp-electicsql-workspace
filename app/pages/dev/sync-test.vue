<script setup lang="ts">
definePageMeta({
  layout: false,
})

const electric = useElectricSync()
const { user } = useAuth()

// State
const logs = ref<string[]>([])
const usersFromPGLite = ref<any[]>([])
const companiesFromPGLite = ref<any[]>([])
const companyMembersFromPGLite = ref<any[]>([])
const schemasFromServer = ref<Record<string, string>>({})

// Log helper
function log(message: string) {
  const timestamp = new Date().toLocaleTimeString()
  logs.value.unshift(`[${timestamp}] ${message}`)
}

// Fetch schemas from server
async function fetchSchemas() {
  try {
    const data = await $fetch<{ tables: string[]; schemas: Record<string, string> }>('/api/schema/tables')
    schemasFromServer.value = data.schemas
    log(`📋 Fetched schemas for: ${data.tables.join(', ')}`)
  } catch (error) {
    log(`❌ Failed to fetch schemas: ${error}`)
  }
}

// Start syncing users (via authenticated proxy)
async function syncUsers() {
  try {
    log('🔄 Starting users sync...')
    await electric.syncShape(
      'users',
      'users',
      '/api/electric/shape?table=users'
    )
    log('✅ Users sync started')
  } catch (error) {
    log(`❌ Users sync failed: ${error}`)
  }
}

// Start syncing companies (via authenticated proxy)
async function syncCompanies() {
  try {
    log('🔄 Starting companies sync...')
    await electric.syncShape(
      'companies',
      'companies',
      '/api/electric/shape?table=companies'
    )
    log('✅ Companies sync started')
  } catch (error) {
    log(`❌ Companies sync failed: ${error}`)
  }
}

// Start syncing company_members (via authenticated proxy)
async function syncCompanyMembers() {
  try {
    log('🔄 Starting company_members sync...')
    await electric.syncShape(
      'company_members',
      'company_members',
      '/api/electric/shape?table=company_members'
    )
    log('✅ Company members sync started')
  } catch (error) {
    log(`❌ Company members sync failed: ${error}`)
  }
}

// Sync all tables
async function syncAll() {
  await syncUsers()
  await syncCompanies()
  await syncCompanyMembers()
}

// Load data from PGLite
async function loadFromPGLite() {
  try {
    usersFromPGLite.value = await electric.query('SELECT id, email, name, is_super_admin FROM users')
    log(`👤 Loaded ${usersFromPGLite.value.length} users from PGLite`)
  } catch (error) {
    log(`⚠️ Failed to load users: ${error}`)
  }

  try {
    companiesFromPGLite.value = await electric.query('SELECT id, name, slug FROM companies')
    log(`🏢 Loaded ${companiesFromPGLite.value.length} companies from PGLite`)
  } catch (error) {
    log(`⚠️ Failed to load companies: ${error}`)
  }

  try {
    companyMembersFromPGLite.value = await electric.query('SELECT id, company_id, user_id, role FROM company_members')
    log(`👥 Loaded ${companyMembersFromPGLite.value.length} company members from PGLite`)
  } catch (error) {
    log(`⚠️ Failed to load company members: ${error}`)
  }
}

// Force reset PGLite
async function forceReset() {
  try {
    log('🔄 Forcing PGLite reset...')
    await electric.forceReset()
    log('✅ PGLite reset complete')
    usersFromPGLite.value = []
    companiesFromPGLite.value = []
    companyMembersFromPGLite.value = []
  } catch (error) {
    log(`❌ Reset failed: ${error}`)
  }
}

// Listen for data changes
onMounted(() => {
  electric.onDataChange('users', (changes) => {
    log(`📦 Users changes: +${changes.insert.length} ~${changes.update.length} -${changes.delete.length}`)
    loadFromPGLite()
  })

  electric.onDataChange('companies', (changes) => {
    log(`📦 Companies changes: +${changes.insert.length} ~${changes.update.length} -${changes.delete.length}`)
    loadFromPGLite()
  })

  electric.onDataChange('company_members', (changes) => {
    log(`📦 Company members changes: +${changes.insert.length} ~${changes.update.length} -${changes.delete.length}`)
    loadFromPGLite()
  })

  electric.onSchemaReset((event) => {
    log(`🔄 Schema reset: ${event.reason} (${event.oldVersion} → ${event.newVersion})`)
  })

  // Initial load
  fetchSchemas()
})
</script>

<template>
  <div class="sync-test">
    <div class="header">
      <h1>Electric SQL Sync Test</h1>
      <div class="status">
        <el-tag :type="electric.isConnected.value ? 'success' : 'danger'">
          {{ electric.isConnected.value ? 'Connected' : 'Disconnected' }}
        </el-tag>
        <el-tag type="info">
          Schema: {{ electric.status.value.schemaVersion || 'unknown' }}
        </el-tag>
        <el-tag type="info">
          Shapes: {{ electric.status.value.activeShapes.join(', ') || 'none' }}
        </el-tag>
      </div>
    </div>

    <div class="content">
      <!-- Controls -->
      <el-card class="controls">
        <template #header>Controls</template>
        <div class="button-grid">
          <el-button type="primary" @click="syncAll">
            🔄 Sync All Tables
          </el-button>
          <el-button @click="syncUsers">Sync Users</el-button>
          <el-button @click="syncCompanies">Sync Companies</el-button>
          <el-button @click="syncCompanyMembers">Sync Members</el-button>
          <el-button @click="loadFromPGLite">📥 Load from PGLite</el-button>
          <el-button type="warning" @click="forceReset">⚠️ Reset PGLite</el-button>
        </div>
      </el-card>

      <!-- Current User -->
      <el-card v-if="user" class="user-card">
        <template #header>Current User (from Auth)</template>
        <pre>{{ JSON.stringify(user, null, 2) }}</pre>
      </el-card>

      <!-- Data from PGLite -->
      <div class="data-grid">
        <el-card>
          <template #header>Users (PGLite: {{ usersFromPGLite.length }})</template>
          <el-table :data="usersFromPGLite" size="small" max-height="300">
            <el-table-column prop="email" label="Email" />
            <el-table-column prop="name" label="Name" />
            <el-table-column prop="is_super_admin" label="Admin" width="80">
              <template #default="{ row }">
                {{ row.is_super_admin ? '✅' : '' }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card>
          <template #header>Companies (PGLite: {{ companiesFromPGLite.length }})</template>
          <el-table :data="companiesFromPGLite" size="small" max-height="300">
            <el-table-column prop="name" label="Name" />
            <el-table-column prop="slug" label="Slug" />
          </el-table>
        </el-card>

        <el-card>
          <template #header>Company Members (PGLite: {{ companyMembersFromPGLite.length }})</template>
          <el-table :data="companyMembersFromPGLite" size="small" max-height="300">
            <el-table-column prop="role" label="Role" />
            <el-table-column prop="user_id" label="User ID" width="200">
              <template #default="{ row }">
                {{ row.user_id?.substring(0, 8) }}...
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <!-- Schemas -->
      <el-card class="schemas">
        <template #header>Generated Schemas (from Server)</template>
        <el-collapse>
          <el-collapse-item v-for="(sql, table) in schemasFromServer" :key="table" :title="table">
            <pre class="schema-sql">{{ sql }}</pre>
          </el-collapse-item>
        </el-collapse>
      </el-card>

      <!-- Logs -->
      <el-card class="logs">
        <template #header>
          <div class="logs-header">
            <span>Event Log</span>
            <el-button size="small" @click="logs = []">Clear</el-button>
          </div>
        </template>
        <div class="log-list">
          <div v-for="(log, i) in logs" :key="i" class="log-item">
            {{ log }}
          </div>
          <div v-if="logs.length === 0" class="log-empty">
            No logs yet...
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sync-test {
  min-height: 100vh;
  padding: var(--app-space-m);
  background: var(--app-bg);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--app-space-m);

  h1 {
    margin: 0;
    font-size: var(--app-font-size-xl);
  }

  .status {
    display: flex;
    gap: var(--app-space-xs);
  }
}

.content {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-m);
}

.controls {
  .button-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--app-space-xs);
  }
}

.user-card {
  pre {
    margin: 0;
    font-size: var(--app-font-size-s);
    overflow-x: auto;
  }
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: var(--app-space-m);
}

.schemas {
  .schema-sql {
    margin: 0;
    padding: var(--app-space-s);
    background: var(--app-grey-950);
    border-radius: var(--app-border-radius-s);
    font-size: var(--app-font-size-s);
    overflow-x: auto;
    white-space: pre-wrap;
  }
}

.logs {
  .logs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .log-list {
    max-height: 300px;
    overflow-y: auto;
    font-family: monospace;
    font-size: var(--app-font-size-s);
  }

  .log-item {
    padding: 4px 0;
    border-bottom: 1px solid var(--app-border-color-lighter);

    &:last-child {
      border-bottom: none;
    }
  }

  .log-empty {
    color: var(--app-text-color-secondary);
    font-style: italic;
  }
}
</style>

