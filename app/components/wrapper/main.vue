<template>
  <div ref="wrapperRef" :class="['pageWrapper', mode, { 'mobile-view': isMobile }]">
    <!-- Desktop Sidebar Menu -->
    <aside v-if="!isMobile" class="main-menu">
      <CommonMenu 
        :mode="mode" 
        :is-mobile="false"
        v-model:sidebar-mode="sidebarMode"
      />
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <slot />
    </main>

    <!-- Mobile Dock (iOS 18 style) -->
    <Transition name="dock-slide">
      <nav v-if="isMobile" class="mobile-dock">
        <div class="dock-backdrop"></div>
        <div class="dock-content">
          <CommonMenu 
            mode="dock" 
            :is-mobile="true"
            :dock-items="dockItems"
            v-model:sidebar-mode="actualSidebarMode"
          />
        </div>
      </nav>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { DockItem, DockContext } from '~/composables/useDockItems'
import { DockContextKey } from '~/composables/useDockItems'

const mode = useState<'sidebar' | 'dock'>('mode', () => 'sidebar')
const sidebarMode = useState<'collapse' | 'expand'>('sidebarMode', () => 'collapse')

// Mobile state
const wrapperRef = ref<HTMLElement | null>(null)
const isMobile = ref(false)
let resizeObserver: ResizeObserver | null = null

// Dock items state (for pages to add items)
const dockItems = ref<DockItem[]>([])

// Force expand mode on mobile
const actualSidebarMode = computed({
  get: () => isMobile.value ? 'expand' : sidebarMode.value,
  set: (val) => { sidebarMode.value = val }
})

// Provide dock context for pages to add items
const dockContext: DockContext = {
  items: dockItems,
  addItem: (item: DockItem) => {
    if (!dockItems.value.find(i => i.id === item.id)) {
      dockItems.value.push(item)
      // Sort by order if provided
      dockItems.value.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    }
  },
  removeItem: (id: string) => {
    const index = dockItems.value.findIndex(i => i.id === id)
    if (index > -1) {
      dockItems.value.splice(index, 1)
    }
  },
  updateItem: (id: string, updates: Partial<DockItem>) => {
    const item = dockItems.value.find(i => i.id === id)
    if (item) {
      Object.assign(item, updates)
      // Re-sort if order changed
      if (updates.order !== undefined) {
        dockItems.value.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      }
    }
  }
}

provide(DockContextKey, dockContext)

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
          isMobile.value = entry.contentRect.width < 768
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

    .main-content {
      padding-bottom: calc(var(--dock-height) + var(--app-space-s));
    }
  }
}

// Desktop sidebar menu
.main-menu {
  height: 100%;
  background: var(--app-bg-color);
  border-right: 1px solid var(--app-border-color);
  z-index: 100;
}

// Main content area
.main-content {
  height: 100%;
  overflow: auto;
}

// Mobile Dock (iOS 18 style)
.mobile-dock {
  position: fixed;
  bottom: var(--app-space-s);
  left: var(--app-space-s);
  right: var(--app-space-s);
  z-index: 1000;
  --dock-height: 80px;
  height: var(--dock-height);
  pointer-events: none;
}

.dock-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--app-border-radius-l);
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.1);
}

.dock-content {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--app-space-xs) var(--app-space-s);
  pointer-events: auto;
}

// Dark mode support for dock
@media (prefers-color-scheme: dark) {
  .dock-backdrop {
    background: rgba(0, 0, 0, 0.7);
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}

// Dock slide transition
.dock-slide-enter-active,
.dock-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}

.dock-slide-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.dock-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
