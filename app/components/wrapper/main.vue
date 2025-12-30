<template>
  <div ref="wrapperRef" :class="['pageWrapper', mode, { 'mobile-view': isMobile }]">
    <!-- Mobile Menu Toggle (floating button) -->
    <button 
      v-if="mode === 'sidebar' && isMobile && !isMobileMenuOpen" 
      class="mobile-menu-toggle"
      @click="toggleMobileMenu"
    >
      <Icon name="material-symbols:menu" />
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
    <aside :class="['main-menu', { open: isMobileMenuOpen }]">
      <CommonMenu 
        :mode="mode" 
        :is-mobile="isMobile"
        v-model:sidebar-mode="actualSidebarMode"
        @close-mobile="isMobileMenuOpen = false"
      />
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const mode = useState<'sidebar' | 'dock'>('mode', () => 'sidebar')
const sidebarMode = useState<'collapse' | 'expand'>('sidebarMode', () => 'collapse')

// Mobile state
const wrapperRef = ref<HTMLElement | null>(null)
const isMobile = ref(false)
const isMobileMenuOpen = ref(false)
let resizeObserver: ResizeObserver | null = null

// Force expand mode on mobile
const actualSidebarMode = computed({
  get: () => isMobile.value ? 'expand' : sidebarMode.value,
  set: (val) => { sidebarMode.value = val }
})

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

onMounted(() => {
  // Initial check
  if (wrapperRef.value) {
    isMobile.value = wrapperRef.value.clientWidth < 768
  }

  // Set up ResizeObserver
  nextTick(() => {
    if (wrapperRef.value) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const wasMobile = isMobile.value
          isMobile.value = entry.contentRect.width < 768
          // Close menu when switching to desktop
          if (wasMobile && !isMobile.value) {
            isMobileMenuOpen.value = false
          }
        }
      })
      resizeObserver.observe(wrapperRef.value)
    }
  })
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
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
  transform: translateZ(0); // Create stacking context

  &.sidebar {
    display: grid;
    grid-template-columns: min-content 1fr;
    gap: 0;
  }

  &.dock {
    display: block;
  }

  // Mobile view styles
  &.mobile-view {
    &.sidebar {
      grid-template-columns: 1fr;
    }

    .mobile-menu-toggle {
      display: flex;
    }

    .menu-overlay {
      display: block;
    }

    .main-menu {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      transform: translateX(-100%);
      box-shadow: var(--app-shadow-xl);

      &.open {
        transform: translateX(0);
      }
    }
  }
}

// Mobile menu toggle button
.mobile-menu-toggle {
  display: none;
  position: absolute;
  bottom: var(--app-space-m);
  left: var(--app-space-m);
  z-index: 101;
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
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  backdrop-filter: blur(2px);
}

// Main menu aside
.main-menu {
  height: 100%;
  background: var(--app-bg-color);
  border-right: 1px solid var(--app-border-color);
  z-index: 100;
  transition: transform 0.3s ease;
}

// Main content area
.main-content {
  height: 100%;
  overflow: auto;
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
</style>
