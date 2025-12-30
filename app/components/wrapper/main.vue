<template>
  <div :class="['pageWrapper', mode]">
    <!-- Mobile Menu Toggle (only visible on mobile) -->
    <button 
      v-if="mode === 'sidebar'" 
      class="mobile-menu-toggle"
      @click="toggleMobileMenu"
    >
      <Icon :name="isMobileMenuOpen ? 'material-symbols:close' : 'material-symbols:menu'" />
    </button>

    <!-- Overlay for mobile menu -->
    <Transition name="fade">
      <div 
        v-if="isMobileMenuOpen" 
        class="menu-overlay"
        @click="isMobileMenuOpen = false"
      />
    </Transition>

    <!-- Main Menu -->
    <Transition name="slide">
      <aside 
        v-show="mode === 'dock' || !isMobile || isMobileMenuOpen"
        :class="['main-menu', { 'mobile-open': isMobileMenuOpen }]"
      >
        <CommonMenu 
          :mode="mode" 
          v-model:sidebar-mode="sidebarMode"
          @close-mobile="isMobileMenuOpen = false"
        />
      </aside>
    </Transition>

    <!-- Main Content -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const mode = useState<'sidebar' | 'dock'>('mode', () => 'sidebar')
const sidebarMode = useState<'collapse' | 'expand'>('sidebarMode', () => 'collapse')

// Mobile menu state
const isMobileMenuOpen = ref(false)
const isMobile = ref(false)

// Check if mobile using container query fallback
function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) {
    isMobileMenuOpen.value = false
  }
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// Close mobile menu on route change
const route = useRoute()
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})
</script>

<style scoped lang="scss">
.pageWrapper {
  width: 100%;
  height: 100dvh;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  container-name: pageWrapper;
  container-type: inline-size;

  &.sidebar {
    display: grid;
    grid-template-columns: min-content 1fr;
    gap: 0;
  }

  &.dock {
    display: block;
  }
}

// Mobile menu toggle button
.mobile-menu-toggle {
  display: none;
  position: fixed;
  bottom: var(--app-space-m);
  left: var(--app-space-m);
  z-index: 1001;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--app-primary-color);
  color: white;
  cursor: pointer;
  box-shadow: var(--app-shadow-l);
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: transform 0.2s ease, background 0.2s ease;

  &:hover {
    background: var(--app-primary-4);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}

// Menu overlay for mobile
.menu-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  backdrop-filter: blur(2px);
}

// Main menu aside
.main-menu {
  height: 100dvh;
  background: var(--app-bg-color);
  border-right: 1px solid var(--app-border-color);
  z-index: 1000;
  transition: transform 0.3s ease;
}

// Main content area
.main-content {
  height: 100dvh;
  overflow: auto;
}

// Container query for responsive behavior
@container pageWrapper (max-width: 768px) {
  .mobile-menu-toggle {
    display: flex;
  }

  .menu-overlay {
    display: block;
  }

  .main-menu {
    position: fixed;
    left: 0;
    top: 0;
    transform: translateX(-100%);

    &.mobile-open {
      transform: translateX(0);
    }
  }

  .pageWrapper.sidebar {
    grid-template-columns: 1fr;
  }
}

// Transitions
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
