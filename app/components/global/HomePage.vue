<script setup lang="ts">
const { user, isAuthenticated, isInitialized, isLoading, logout } = useAuth()
const router = useRouter()

// Use synced company data from PGLite (synced via Electric SQL)
const companySync = useCompanySync()
const { companies, state: companySyncState } = companySync

// Start sync when authenticated
watch(isAuthenticated, async (value) => {
  if (value) {
    await companySync.startSync()
    await companySync.load()
  }
}, { immediate: true })

async function handleLogout() {
  await logout()
  router.push('/auth/login')
}

function goToCompany(slug: string) {
  router.push(`/company/${slug}`)
}
</script>

<template>
  <div class="home-page">
    <div class="home-container">
      <h1>DocPal</h1>
      
      <div v-if="!isInitialized || isLoading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>Loading...</span>
      </div>

      <template v-else-if="isAuthenticated && user">
        <div class="user-info">
          <el-avatar :size="64">
            {{ user.name?.charAt(0) || user.email.charAt(0).toUpperCase() }}
          </el-avatar>
          <h2>Welcome, {{ user.name || user.email }}</h2>
          <p class="email">{{ user.email }}</p>
          <el-tag v-if="user.isSuperAdmin" type="danger" size="small">
            Super Admin
          </el-tag>
        </div>

        <!-- Company List -->
        <div class="companies-section">
          <h3>Your Companies</h3>
          
          <div v-if="companySyncState.isLoading" class="loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>Loading companies...</span>
          </div>

          <div v-else-if="companies.length === 0" class="no-companies">
            <p>You don't have any companies yet.</p>
            <el-button v-if="user.isSuperAdmin" type="primary" @click="router.push('/company/new')">
              Create Company
            </el-button>
          </div>

          <div v-else class="company-grid">
            <el-card 
              v-for="company in companies" 
              :key="company.id"
              class="company-card"
              shadow="hover"
              @click="goToCompany(company.slug)"
            >
              <div class="company-logo">
                <el-avatar :size="48" shape="square">
                  {{ company.name.charAt(0).toUpperCase() }}
                </el-avatar>
              </div>
              <div class="company-info">
                <h4>{{ company.name }}</h4>
                <p v-if="company.description">{{ company.description }}</p>
              </div>
            </el-card>
          </div>
        </div>

        <div class="actions">
          <el-button size="large" @click="handleLogout">
            Logout
          </el-button>
        </div>
      </template>

      <template v-else>
        <p class="welcome-text">Welcome to DocPal</p>
        <el-button type="primary" size="large" @click="router.push('/auth/login')">
          Sign In
        </el-button>
      </template>
    </div>
  </div>
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
