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
async function handleSwitchCompany(companyId: string) {
  const success = await companyContext.setCompanyById(companyId)
  if (success) {
    ElMessage.success('Company switched')
    popoverRef.value?.close()
    // Optionally navigate to company page
    const company = companies.value.find(c => c.id === companyId)
    if (company) {
      router.push(`/company/${company.slug}`)
    }
  } else {
    ElMessage.error('Failed to switch company')
  }
}

function handleEditProfile() {
  popoverRef.value?.close()
  router.push('/profile')
}

function handleEditCompany() {
  popoverRef.value?.close()
  if (companyContext.currentCompany.value) {
    router.push(`/company/${companyContext.currentCompany.value.slug}`)
  }
}

async function handleLogout() {
  const { logout } = useAuth()
  await logout()
  companyContext.clearCompany()
  popoverRef.value?.close()
  router.push('/auth/login')
}

// Popover control
const triggerRef = ref<HTMLElement>()
const popoverRef = ref()

function handleOpenMenu() {
  const target = triggerRef.value
  if (target) {
    const el = (target as any).$el || target
    popoverRef.value?.open(el)
  }
}
</script>

<template>
  <div>
    <!-- Trigger Button -->
    <div 
      ref="triggerRef"
      class="user-profile-trigger" 
      :class="{ collapse }"
      @click="handleOpenMenu"
    >
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

    <!-- Profile Menu Popover -->
    <CommonPopoverDialog
      ref="popoverRef"
      title="Profile"
      :width="320"
      placement="bottom-end"
    >
      <div class="user-profile-menu">
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

        <div class="menu-divider" />
        
        <div class="menu-item" @click="handleEditProfile">
          <Icon name="material-symbols:person-outline" />
          <span>Edit Profile</span>
        </div>

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
        <template v-if="companyContext.canManageCompany">
          <div class="menu-divider" />
          <div class="menu-item" @click="handleEditCompany">
            <Icon name="material-symbols:business-outline" />
            <span>Edit Company</span>
          </div>
        </template>

        <!-- Logout -->
        <div class="menu-divider" />
        <div class="menu-item" @click="handleLogout">
          <Icon name="material-symbols:logout" />
          <span>Logout</span>
        </div>
      </div>
    </CommonPopoverDialog>
  </div>
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

// Profile Menu Styles
.user-profile-menu {
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-s) var(--app-space-m);
  cursor: pointer;
  transition: background-color 0.2s ease;
  user-select: none;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  .iconify {
    font-size: 20px;
    color: var(--app-text-color-secondary);
  }

  span {
    font-size: var(--app-font-size-s);
    color: var(--app-text-color-primary);
  }
}

.menu-divider {
  height: 1px;
  margin: var(--app-space-xs) 0;
  background-color: var(--app-border-color);
}

.menu-header {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  padding: var(--app-space-m);
  margin-bottom: var(--app-space-s);
  background: var(--el-fill-color-lighter);
  border-radius: var(--app-border-radius-s);
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

