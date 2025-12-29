<script setup lang="ts">
const { user, isAuthenticated, isInitialized, isLoading, logout } = useAuth()
const router = useRouter()

async function handleLogout() {
  await logout()
  router.push('/auth/login')
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

        <div class="actions">
          <el-button type="primary" size="large">
            Go to Dashboard
          </el-button>
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
</style>
