<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { login, isLoading } = useAuth()
const router = useRouter()

const form = reactive({
  email: '',
  password: '',
})

const error = ref('')

async function handleSubmit() {
  error.value = ''
  
  if (!form.email || !form.password) {
    error.value = 'Please enter email and password'
    return
  }

  const result = await login({
    email: form.email,
    password: form.password,
  })

  if (result.success) {
    router.push('/')
  } else {
    error.value = result.error || 'Login failed'
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-container glass">
      <div class="login-header">
        <h1>DocPal</h1>
        <p>Sign in to your account</p>
      </div>

      <el-form 
        class="login-form" 
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-alert 
          v-if="error" 
          :title="error" 
          type="error" 
          show-icon 
          :closable="false"
          class="login-error"
        />

        <el-form-item label="Email">
          <el-input
            v-model="form.email"
            type="email"
            placeholder="Enter your email"
            size="large"
            :disabled="isLoading"
          />
        </el-form-item>

        <el-form-item label="Password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="Enter your password"
            size="large"
            show-password
            :disabled="isLoading"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="login-button"
          :loading="isLoading"
          @click="handleSubmit"
        >
          Sign In
        </el-button>
      </el-form>
    </div>
    <CommonLoadingBg />
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  height: 100dvh;
  display: grid;
  place-items: center;
  isolation: isolate;
}

.login-container {
  width: 100%;
  max-width: 400px;
  padding: var(--app-space-l);
  border-radius: var(--app-border-radius-l);
}

.login-header {
  text-align: center;
  margin-bottom: var(--app-space-l);

  h1 {
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-paper);
    margin: 0 0 var(--app-space-xs);
    letter-spacing: -0.02em;
  }

  p {
    color: var(--app-grey-600);
    margin: 0;
    font-size: var(--app-font-size-m);
  }
}

.login-form {
  :deep(.el-form-item__label) {
    color: var(--app-grey-700);
    font-weight: 500;
  }

  :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: none;

    &:hover {
      border-color: rgba(255, 255, 255, 0.3);
    }

    &.is-focus {
      border-color: var(--app-primary-color);
    }
  }

  :deep(.el-input__inner) {
    color: var(--app-paper);

    &::placeholder {
      color: var(--app-grey-500);
    }
  }
}

.login-error {
  margin-bottom: var(--app-space-m);
}

.login-button {
  width: 100%;
  margin-top: var(--app-space-xs);
  height: 48px;
  font-size: var(--app-font-size-m);
  font-weight: 600;
}
</style>

