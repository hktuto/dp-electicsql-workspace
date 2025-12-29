<template>
  <div :class="['menuContainer', mode, sidebarMode]">
    <div class="menuItems">
      <div class="header">

      </div>
      <div class="menuBody">

        <div class="menuItem" v-for="item in menu" :key="item.id" :class="{ active: isActive(item) }" @click="handleClick(item)">
          <template v-if="item.component">
            <component :is="item.component" />
          </template>
          <template v-else>
            <div class="menuItemIcon">
              <Icon v-if="item.icon" :name="item.icon" />
            </div>
            <div v-if="item.label && sidebarMode === 'expand'" class="menuItemLabel" >{{ item.label }}</div>
          </template>
        </div>
      </div>
      <div class="footer">
       
        <UserProfileMenu :collapse="sidebarMode === 'collapse'" />
        <div class="menuItem" @click="toggleSidebarMode">
          <Icon :name="sidebarMode === 'collapse' ? 'material-symbols:arrow-forward' : 'material-symbols:arrow-back'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const sidebarMode = defineModel< 'collapse' | 'expand'>('collapse')
  const props = defineProps<{
    mode : 'sidebar' | 'dock'
  }>()
  const { currentPath, navigate } = useAppRouter()
  type MenuItem = {
    id: string,
    label: string,
    url?:string,
    icon?:string,
    urlRule?: string, // regex to match the current path
    component?:string,
    action?:() => void,
  }
  const menu = ref<MenuItem[]>([
    {
      id: 'home',
      label: 'Home',
      url: '/',
      icon: 'material-symbols:home',
    },
    {
      id: 'workspaces',
      label: 'Workspaces',
      url: '/workspaces',
      icon: 'material-symbols:workspaces',
    },
    {
      id: 'chats',
      label: 'Chats',
      url: '/chats',
      icon: 'material-symbols:chat',
    },
  ])
  function isActive(item: MenuItem)  {
    if(item.urlRule) {
      return new RegExp(item.urlRule).test(currentPath.value)
    }
    return item.url === currentPath.value
  }
  
  function toggleSidebarMode() {
    sidebarMode.value = sidebarMode.value === 'collapse' ? 'expand' : 'collapse'
  }
  

  function handleClick(item: MenuItem) {
    if(item.action) {
      item.action()
    } else if(item.url) {
      navigate(item.url!)
    } else {
      console.warn('No url or action for menu item', item)
    }
  }
</script>

<style scoped lang="scss">
.menuContainer{
  
  &.sidebar{
    width: 200px;
    height: 100dvh;
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: flex-start;
    gap: var(--app-space-s);
    background-color: var(--app-bg-color);
    border-right: 1px solid var(--app-border-color);
    &.collapse{
      width: 60px;
    }
    .menuItems{
      height: 100%;;
      display: flex;
      flex-flow: column nowrap;
      align-items: flex-start;
      justify-content: flex-start;
      gap: var(--app-space-s);
      padding: var(--app-space-s);
      .menuBody{
        flex: 1 0 auto;
        display: flex;
        flex-flow: column nowrap;
        align-items: flex-start;
        justify-content: flex-start;
        gap: var(--app-space-s);
      }
    }
  }
}
.menuItem{
  color: var(--app-grey-400);
  font-size: var(--app-font-size-m);
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: var(--app-space-s);
  &:hover {
    color: var(--app-primary-alpha-70);
  }
  &.active {
    color: var(--app-primary-color);
  }
}
</style>