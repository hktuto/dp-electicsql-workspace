<template>
  <WrapperMain>
    <div class="workspace-wrapper">
      <!-- Mobile Menu Toggle -->
      <button 
        class="workspace-menu-toggle"
        @click="toggleWorkspaceMenu"
      >
        <Icon :name="isMenuOpen ? 'material-symbols:close' : 'material-symbols:menu'" />
      </button>

      <!-- Overlay for mobile -->
      <Transition name="fade">
        <div 
          v-if="isMenuOpen" 
          class="workspace-overlay"
          @click="isMenuOpen = false"
        />
      </Transition>

      <!-- Workspace Sidebar -->
      <aside :class="['workspace-sidebar', { open: isMenuOpen }]">
        <slot name="sidebar" />
      </aside>

      <!-- Workspace Content -->
      <div class="workspace-content">
        <!-- Header -->
        <header class="workspace-header">
          <div class="header-left">
            <slot name="breadcrumb" />
          </div>
          <div id="workspace-header-actions" class="header-right">
            <!-- Teleport target for action buttons -->
            <slot name="actions" />
          </div>
        </header>

        <!-- Main Content -->
        <main class="workspace-main">
          <slot />
        </main>
      </div>
    </div>
  </WrapperMain>
</template>

<script setup lang="ts">
const isMenuOpen = ref(false)

function toggleWorkspaceMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

// Close menu on route change
const route = useRoute()
watch(() => route.path, () => {
  isMenuOpen.value = false
})
</script>

<style scoped lang="scss">
.workspace-wrapper {
  height: 100%;
  display: grid;
  grid-template-columns: min-content 1fr;
  position: relative;
  container-name: workspaceWrapper;
  container-type: inline-size;
}

// Mobile menu toggle
.workspace-menu-toggle {
  display: none;
  position: absolute;
  top: var(--app-space-s);
  left: var(--app-space-s);
  z-index: 101;
  width: 36px;
  height: 36px;
  border-radius: var(--app-border-radius-s);
  border: 1px solid var(--app-border-color);
  background: var(--app-bg-color);
  color: var(--app-text-color-regular);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s ease;

  &:hover {
    background: var(--app-fill-color);
    color: var(--app-primary-color);
  }
}

// Overlay
.workspace-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
  backdrop-filter: blur(2px);
}

// Sidebar
.workspace-sidebar {
  width: 280px;
  height: 100%;
  background: var(--el-bg-color);
  border-right: 1px solid var(--app-border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.3s ease;
}

// Content area
.workspace-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// Header
.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--app-space-s) var(--app-space-m);
  min-height: 52px;
  border-bottom: 1px solid var(--app-border-color);
  background: var(--el-bg-color);
  gap: var(--app-space-m);
}

.header-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  flex-shrink: 0;
}

// Main content
.workspace-main {
  flex: 1;
  overflow: auto;
  background: var(--app-bg);
}

// Container query for responsive
@container workspaceWrapper (max-width: 768px) {
  .workspace-wrapper {
    grid-template-columns: 1fr;
  }

  .workspace-menu-toggle {
    display: flex;
  }

  .workspace-overlay {
    display: block;
  }

  .workspace-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100dvh;
    z-index: 100;
    transform: translateX(-100%);
    box-shadow: var(--app-shadow-xl);

    &.open {
      transform: translateX(0);
    }
  }

  .header-left {
    padding-left: 44px; // Space for toggle button
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
</style>

