<template>
  <div :class="['menuContainer', mode, sidebarMode, { mobile: isMobile }]">
    <!-- Header: Logo + Close button on mobile (hidden in dock mode) -->
    <div v-if="mode !== 'dock'" class="menuHeader">
      <NuxtLink to="/" class="logo-link" @click="$emit('closeMobile')">
        <img 
          v-if="sidebarMode === 'expand'" 
          src="/logo-expand.svg" 
          alt="DocPal" 
          class="logo-expand"
        />
        <img 
          v-else 
          src="/logo.svg" 
          alt="DocPal" 
          class="logo-collapse"
        />
      </NuxtLink>
      
      <!-- Close button for mobile -->
      <button v-if="isMobile" class="mobile-close-btn" @click="$emit('closeMobile')">
        <Icon name="material-symbols:close" />
      </button>
    </div>

    <!-- Body: Menu Items -->
    <div :class="['menuBody', { 'dock-layout': mode === 'dock' }]">
      <div 
        v-for="item in menu" 
        :key="item.id" 
        :class="['menuItem', { active: isActive(item) }]" 
        @click="handleClick(item)"
      >
        <template v-if="item.component">
          <component :is="item.component" />
        </template>
        <template v-else>
          <div class="menuItemIcon">
            <Icon v-if="item.icon" :name="item.icon" />
          </div>
          <Transition name="label-fade">
            <div>
            <div v-if="sidebarMode === 'expand' && mode !== 'dock'" class="menuItemLabel">
              {{ item.label }}
            </div>
            <!-- Dock mode: show label below icon -->
            <div v-if="mode === 'dock'" class="menuItemLabel dock-label">
              {{ item.label }}
            </div>
            </div>
          </Transition>
        </template>
      </div>
    </div>

    <!-- Footer: User Profile & Toggle (hidden in dock mode) -->
    <div v-if="mode !== 'dock'" class="menuFooter">
      <UserProfileMenu :collapse="sidebarMode === 'collapse'" />
      <div v-if="!isMobile" class="menuItem toggle-btn" @click="toggleSidebarMode">
        <Icon 
          :name="sidebarMode === 'collapse' 
            ? 'material-symbols:keyboard-double-arrow-right' 
            : 'material-symbols:keyboard-double-arrow-left'" 
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DockItem } from '~/composables/useDockItems'

const sidebarMode = defineModel<'collapse' | 'expand'>('sidebarMode')

const props = defineProps<{
  mode: 'sidebar' | 'dock'
  isMobile?: boolean
  dockItems?: DockItem[]
}>()

const emit = defineEmits<{
  closeMobile: []
}>()

// const { currentPath, navigate } = useAppRouter()

type MenuItem = {
  id: string
  label: string
  url?: string
  icon?: string
  urlRule?: string
  component?: string
  action?: () => void
}

const baseMenu = ref<MenuItem[]>([
  {
    id: 'home',
    label: 'Home',
    url: '/',
    icon: 'material-symbols:home-rounded',
  },
  {
    id: 'workspaces',
    label: 'Workspaces',
    url: '/workspaces',
    urlRule: '^/workspaces',
    icon: 'material-symbols:work-sharp',
  },
  {
    id: 'chats',
    label: 'Chats',
    url: '/chats',
    icon: 'material-symbols:chat-rounded',
  },
])

// Combine base menu with dock items for dock mode
const menu = computed(() => {
  if (props.mode === 'dock' && props.dockItems) {
    // Merge dock items with base menu
    const allItems = [...baseMenu.value]
    props.dockItems.forEach(dockItem => {
      const existingIndex = allItems.findIndex(item => item.id === dockItem.id)
      const menuItem: MenuItem = {
        id: dockItem.id,
        label: dockItem.label,
        url: dockItem.url,
        urlRule: dockItem.urlRule,
        icon: dockItem.icon,
        action: dockItem.action,
        component: dockItem.component,
      }
      if (existingIndex > -1) {
        allItems[existingIndex] = menuItem
      } else {
        allItems.push(menuItem)
      }
    })
    return allItems
  }
  return baseMenu.value
})

function isActive(item: MenuItem) {
  if (item.urlRule) {
    // return new RegExp(item.urlRule).test(currentPath.value)
  }
  // return item.url === currentPath.value
}

function toggleSidebarMode() {
  sidebarMode.value = sidebarMode.value === 'collapse' ? 'expand' : 'collapse'
}

function handleClick(item: MenuItem) {
  if (item.action) {
    item.action()
  } else if (item.url) {
    // navigate(item.url)
    emit('closeMobile')
  } else {
    console.warn('No url or action for menu item', item)
  }
}
</script>

<style scoped lang="scss">
.menuContainer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--app-bg-color);
  transition: width 0.2s ease;

  &.sidebar {
    width: 200px;

    &.collapse {
      width: 60px;
    }
  }

  // Mobile always expanded
  &.mobile {
    width: 240px;
  }

  // Dock mode: no fixed width, adapts to content
  &.dock {
    width: auto;
    height: 100%;
    background: transparent;
    border: none;
  }
}

// Header with logo
.menuHeader {
  padding: 0 var(--app-space-s);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--app-border-color);
  height: var(--app-header-height);
  min-height: var(--app-header-height);
  position: relative;
}

.logo-link {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  img{
    max-height: calc(var(--app-header-height) - var(--app-space-s) * 2); 
  }
}

.logo-expand {
  height: 32px;
  width: auto;
}

.logo-collapse {
  height: 32px;
  width: 32px;
}

// Mobile close button
.mobile-close-btn {
  position: absolute;
  right: var(--app-space-s);
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--app-text-color-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--app-border-radius-s);
  font-size: 20px;
  transition: all 0.15s ease;

  &:hover {
    background: var(--app-fill-color);
    color: var(--app-text-color-primary);
  }
}

// Menu body
.menuBody {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xxs);
  padding: var(--app-space-s);
  overflow-y: auto;

  // Dock layout: horizontal
  &.dock-layout {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: var(--app-space-xs);
    padding: var(--app-space-xs);
    overflow-x: auto;
    overflow-y: hidden;
  }
}

// Menu footer
.menuFooter {
  padding: var(--app-space-s);
  border-top: 1px solid var(--app-border-color);
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xxs);
}

// Menu item styles
.menuItem {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-xs);
  border-radius: var(--app-border-radius-s);
  color: var(--app-grey-400);
  font-size: var(--app-font-size-m);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  overflow: hidden;

  // Dock mode: vertical layout with icon on top
  .dock-layout & {
    flex-direction: column;
    gap: var(--app-space-xxs);
    padding: var(--app-space-xs);
    min-width: 60px;
    flex: 0 0 auto;
    justify-content: center;
  }

  &:hover {
    color: var(--app-primary-color);
    background: var(--app-primary-alpha-10);
  }

  &.active {
    color: var(--app-primary-color);
    background: var(--app-primary-alpha-10);
    font-weight: 500;
  }

  .menuItemIcon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    font-size: 20px;

    .dock-layout & {
      width: 28px;
      height: 28px;
      font-size: 24px;
    }
  }

  .menuItemLabel {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;

    &.dock-label {
      font-size: var(--app-font-size-xs);
      text-align: center;
      line-height: 1.2;
      max-width: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.toggle-btn {
  justify-content: center;
  
  .collapse & {
    padding: var(--app-space-s) 0;
  }
}

// Label fade transition
.label-fade-enter-active,
.label-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.label-fade-enter-from,
.label-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
