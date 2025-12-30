<template>
  <div :class="['menuContainer', mode, sidebarMode, { mobile: isMobile }]">
    <!-- Header: Logo + Close button on mobile -->
    <div class="menuHeader">
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
    <div class="menuBody">
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
            <div v-if="sidebarMode === 'expand'" class="menuItemLabel">
              {{ item.label }}
            </div>
          </Transition>
        </template>
      </div>
    </div>

    <!-- Footer: User Profile & Toggle (toggle hidden on mobile) -->
    <div class="menuFooter">
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
const sidebarMode = defineModel<'collapse' | 'expand'>('sidebarMode')

const props = defineProps<{
  mode: 'sidebar' | 'dock'
  isMobile?: boolean
}>()

const emit = defineEmits<{
  closeMobile: []
}>()

const { currentPath, navigate } = useAppRouter()

type MenuItem = {
  id: string
  label: string
  url?: string
  icon?: string
  urlRule?: string
  component?: string
  action?: () => void
}

const menu = ref<MenuItem[]>([
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

function isActive(item: MenuItem) {
  if (item.urlRule) {
    return new RegExp(item.urlRule).test(currentPath.value)
  }
  return item.url === currentPath.value
}

function toggleSidebarMode() {
  sidebarMode.value = sidebarMode.value === 'collapse' ? 'expand' : 'collapse'
}

function handleClick(item: MenuItem) {
  if (item.action) {
    item.action()
  } else if (item.url) {
    navigate(item.url)
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
  padding: var(--app-space-s);
  border-radius: var(--app-border-radius-s);
  color: var(--app-grey-400);
  font-size: var(--app-font-size-m);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  overflow: hidden;

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
  }

  .menuItemLabel {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
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
