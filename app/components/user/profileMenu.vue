<script setup lang="ts">
/**
 * User Profile Menu Component
 * 
 * Two modes:
 * - collapse: Avatar only
 * - expand: Avatar + User name
 */

interface Props {
  collapse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapse: false,
})

const { user } = useAuth()
const router = useRouter()
const companySync = useCompanySync()
const companyContext = useCompanyContext()

// User initial for avatar
const userInitial = computed(() => {
  if (!user.value) return '?'
  return user.value.name?.charAt(0)?.toUpperCase() || user.value.email.charAt(0).toUpperCase()
})

// Company list for switcher
interface Company {
  id: string
  name: string
  slug: string
  logo: string | null
}

const companies = ref<Company[]>([])
const loadingCompanies = ref(false)

// Load companies
async function loadCompanies() {
  if (!user.value) return
  loadingCompanies.value = true
  try {
    companies.value = await companySync.getCompaniesForUser(user.value.id)
  } finally {
    loadingCompanies.value = false
  }
}

// Start sync on mount
onMounted(async () => {
  await companySync.startSync()
  await loadCompanies()
  
  // Re-load when companies change
  companySync.onCompanyChange(() => {
    loadCompanies()
  })
})

// Actions
function handleEditProfile() {
  router.push('/profile')
}

async function handleSwitchCompany(companyId: string) {
  const success = await companyContext.setCompanyById(companyId)
  if (success) {
    ElMessage.success('Company switched')
    // Optionally navigate to company page
    const company = companies.value.find(c => c.id === companyId)
    if (company) {
      router.push(`/company/${company.slug}`)
    }
  } else {
    ElMessage.error('Failed to switch company')
  }
}

function handleEditCompany() {
  if (companyContext.currentCompany.value) {
    router.push(`/company/${companyContext.currentCompany.value.slug}`)
  }
}

async function handleLogout() {
  const { logout } = useAuth()
  await logout()
  companyContext.clearCompany()
  router.push('/auth/login')
}
</script>

<template>
  <el-dropdown trigger="click" placement="bottom-end">
    <!-- Trigger Button -->
    <div class="user-profile-trigger" :class="{ collapse }">
      <el-avatar :size="collapse ? 32 : 36">
        {{ userInitial }}
      </el-avatar>
      <div v-if="!collapse && user" class="user-info">
        <div class="user-name">{{ user.name || user.email }}</div>
        <div v-if="companyContext.currentCompany.value" class="user-company">
          {{ companyContext.currentCompany.value.name }}
        </div>
      </div>
      <Icon 
        v-if="!collapse" 
        name="material-symbols:arrow-drop-down" 
        size="20"
      />
    </div>

    <!-- Dropdown Menu -->
    <template #dropdown>
      <el-dropdown-menu class="user-profile-menu">
        <!-- User Info Header (Always show in dropdown) -->
        <div class="menu-header">
          <el-avatar :size="48">
            {{ userInitial }}
          </el-avatar>
          <div v-if="user" class="header-info">
            <div class="header-name">{{ user.name || user.email }}</div>
            <div class="header-email">{{ user.email }}</div>
            <el-tag v-if="user.isSuperAdmin" type="danger" size="small">
              Super Admin
            </el-tag>
          </div>
        </div>

        <el-dropdown-item divided @click="handleEditProfile">
          <Icon name="material-symbols:person-outline" />
          <span>Edit Profile</span>
        </el-dropdown-item>

        <!-- Company Switcher Section -->
        <div class="menu-section">
          <div class="section-title">Companies</div>
          <div v-if="loadingCompanies" class="section-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>Loading...</span>
          </div>
          <div v-else-if="companies.length === 0" class="section-empty">
            No companies
          </div>
          <div v-else class="company-list">
            <div
              v-for="company in companies"
              :key="company.id"
              class="company-item"
              :class="{ active: company.id === companyContext.currentCompany.value?.id }"
              @click="handleSwitchCompany(company.id)"
            >
              <el-avatar :size="24" shape="square">
                {{ company.name.charAt(0).toUpperCase() }}
              </el-avatar>
              <span class="company-name">{{ company.name }}</span>
              <Icon 
                v-if="company.id === companyContext.currentCompany.value?.id"
                name="material-symbols:check"
                class="check-icon"
              />
            </div>
          </div>
        </div>

        <!-- Edit Company (if admin) -->
        <el-dropdown-item 
          v-if="companyContext.canManageCompany"
          divided
          @click="handleEditCompany"
        >
          <Icon name="material-symbols:business-outline" />
          <span>Edit Company</span>
        </el-dropdown-item>

        <!-- Logout -->
        <el-dropdown-item divided @click="handleLogout">
          <Icon name="material-symbols:logout" />
          <span>Logout</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped lang="scss">
.user-profile-trigger {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-xs) var(--app-space-s);
  border-radius: var(--app-border-radius-m);
  cursor: pointer;
  transition: background-color 0.2s ease;
  user-select: none;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &.collapse {
    padding: 0;
    
    &:hover {
      background-color: transparent;
      opacity: 0.8;
    }
  }
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.user-name {
  font-size: var(--app-font-size-s);
  font-weight: 500;
  color: var(--app-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-company {
  font-size: var(--app-font-size-xs);
  color: var(--app-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// Dropdown Menu Styles
.user-profile-menu {
  min-width: 280px;
  padding: 0;

  :deep(.el-dropdown-menu__item) {
    display: flex;
    align-items: center;
    gap: var(--app-space-s);
    padding: var(--app-space-s) var(--app-space-m);
    
    .iconify {
      font-size: 20px;
      color: var(--app-text-color-secondary);
    }
  }
}

.menu-header {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  padding: var(--app-space-m);
  border-bottom: 1px solid var(--app-border-color);
  background: var(--el-fill-color-lighter);
}

.header-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xs);
}

.header-name {
  font-size: var(--app-font-size-m);
  font-weight: 600;
  color: var(--app-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-email {
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-section {
  padding: var(--app-space-s) 0;
  border-bottom: 1px solid var(--app-border-color);
}

.section-title {
  padding: var(--app-space-xs) var(--app-space-m);
  font-size: var(--app-font-size-xs);
  font-weight: 600;
  color: var(--app-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-loading,
.section-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-xs);
  padding: var(--app-space-m);
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);
}

.company-list {
  max-height: 240px;
  overflow-y: auto;
}

.company-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-s) var(--app-space-m);
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &.active {
    background-color: var(--el-fill-color);

    .company-name {
      font-weight: 600;
      color: var(--app-primary-color);
    }
  }
}

.company-name {
  flex: 1;
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-icon {
  color: var(--app-primary-color);
  font-size: 18px;
}
</style>

