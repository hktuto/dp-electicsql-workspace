<script setup lang="ts">
const { user, isAuthenticated, isInitialized, isLoading, logout } = useAuth()
const router = useRouter()
const companySync = useCompanySync()
const companyContext = useCompanyContext()

// Local state for this component only
interface Company {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
}
const companies = ref<Company[]>([])
const loadingCompanies = ref(false)

// Load companies from PGLite
async function loadCompanies() {
  if (!user.value) return
  loadingCompanies.value = true
  try {
    companies.value = await companySync.getCompaniesForUser(user.value.id)
  } finally {
    loadingCompanies.value = false
  }
}

// Start sync and load when authenticated
watch(isAuthenticated, async (value) => {
  if (value) {
    await companySync.startSync()
    await loadCompanies()
    
    // Initialize company context from cookie or auto-select first company
    await companyContext.init()
  }
}, { immediate: true })

// Subscribe to company changes - re-load when data changes
onMounted(() => {
  console.log('companySync', companySync)
  companySync.onCompanyChange(() => {
    loadCompanies()
  })
})

async function handleLogout() {
  await logout()
  companyContext.clearCompany() // Clear company context on logout
  router.push('/auth/login')
}

async function goToCompany(slug: string) {
  // Set company context first, then navigate
  const success = await companyContext.setCompanyBySlug(slug)
  if (success) {
  router.push(`/company/${slug}`)
  } else {
    ElMessage.error('Failed to access company')
  }
}
</script>

<template>
  <WrapperMain>
  <div class="home-page">
    <div class="home-container">
      <h1>DocPal</h1>

    </div>
  </div>
</WrapperMain>
</template>

<style scoped lang="scss">
.home-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-bg);
}

.home-container {
  text-align: center;
  color: var(--app-text-color-primary);

  h1 {
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
    margin-bottom: var(--app-space-m);
    letter-spacing: -0.02em;
  }
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-xs);
  color: var(--app-text-color-secondary);
}

.user-info {
  margin-bottom: var(--app-space-l);

  h2 {
    margin: var(--app-space-s) 0 var(--app-space-xs);
    font-size: var(--app-font-size-xl);
    font-weight: 600;
  }

  .email {
    color: var(--app-text-color-secondary);
    margin: 0 0 var(--app-space-s);
  }
}

.actions {
  display: flex;
  gap: var(--app-space-s);
  justify-content: center;
}

.welcome-text {
  color: var(--app-text-color-secondary);
  margin-bottom: var(--app-space-m);
  font-size: var(--app-font-size-l);
}

.companies-section {
  margin: var(--app-space-l) 0;
  text-align: left;
  max-width: 600px;
  width: 100%;

  h3 {
    margin-bottom: var(--app-space-m);
    font-size: var(--app-font-size-l);
    text-align: center;
  }
}

.no-companies {
  text-align: center;
  color: var(--app-text-color-secondary);
  padding: var(--app-space-l);
  
  p {
    margin-bottom: var(--app-space-m);
  }
}

.company-grid {
  display: grid;
  gap: var(--app-space-m);
}

.company-card {
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  :deep(.el-card__body) {
    display: flex;
    align-items: center;
    gap: var(--app-space-m);
  }
}

.company-info {
  flex: 1;
  min-width: 0;

  h4 {
    margin: 0 0 var(--app-space-xs);
    font-size: var(--app-font-size-m);
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: var(--app-font-size-s);
    color: var(--app-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
