<script setup lang="ts">
/**
 * Company Switcher Component
 * Allows users to switch between companies they belong to
 */

const { user } = useAuth()
const companySync = useCompanySync()
const companyContext = useCompanyContext()

interface Company {
  id: string
  name: string
  slug: string
  logo: string | null
}

const companies = ref<Company[]>([])
const loading = ref(false)

// Load companies user belongs to
async function loadCompanies() {
  if (!user.value) return
  loading.value = true
  try {
    companies.value = await companySync.getCompaniesForUser(user.value.id)
  } finally {
    loading.value = false
  }
}

// Start sync and load
onMounted(async () => {
  await companySync.startSync()
  await loadCompanies()

  // Re-load when companies change
  companySync.onCompanyChange(() => {
    loadCompanies()
  })
})

// Switch company
const switching = ref(false)
async function switchCompany(companyId: string) {
  switching.value = true
  try {
    const success = await companyContext.setCompanyById(companyId)
    if (success) {
      ElMessage.success('Company switched')
    } else {
      ElMessage.error('Failed to switch company')
    }
  } finally {
    switching.value = false
  }
}
</script>

<template>
  <el-dropdown 
    trigger="click" 
    @command="switchCompany"
    :disabled="loading || switching"
  >
    <el-button :loading="switching">
      <div class="current-company">
        <el-avatar 
          v-if="companyContext.currentCompany.value" 
          :size="24" 
          shape="square"
        >
          {{ companyContext.currentCompany.value.name.charAt(0).toUpperCase() }}
        </el-avatar>
        <span v-if="companyContext.currentCompany.value">
          {{ companyContext.currentCompany.value.name }}
        </span>
        <span v-else>Select Company</span>
        <Icon name="material-symbols:arrow-drop-down" />
      </div>
    </el-button>
    
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item 
          v-for="company in companies" 
          :key="company.id"
          :command="company.id"
          :disabled="company.id === companyContext.currentCompany.value?.id"
        >
          <div class="company-item">
            <el-avatar :size="20" shape="square">
              {{ company.name.charAt(0).toUpperCase() }}
            </el-avatar>
            <span>{{ company.name }}</span>
            <Icon 
              v-if="company.id === companyContext.currentCompany.value?.id"
              name="material-symbols:check"
              style="color: var(--app-primary-color)"
            />
          </div>
        </el-dropdown-item>
        
        <el-dropdown-item divided disabled v-if="companies.length === 0">
          No companies available
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped lang="scss">
.current-company {
  display: flex;
  align-items: center;
  gap: var(--app-space-xs);
  
  span {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.company-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-xs);
  min-width: 180px;
  
  span {
    flex: 1;
  }
}
</style>

