<template>
  <div :class="['pageWrapper', mode]">
    <CommonMenu :mode="mode" v-model:sidebar-mode="sidebarMode" />
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const mode = useState<'sidebar' | 'dock'>('mode', () => 'sidebar')
const sidebarMode = useState<'collapse' | 'expand'>('sidebarMode', () => 'collapse')
</script>

<style scoped lang="scss">
.pageWrapper{
  width: 100%;
  height: 100dvh;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  container-name: pageWrapper;
  container-type: inline-size;
  &.sidebar{
    display: grid;
    grid-template-columns: min-content 1fr;
    gap: 0;
  }
  &.dock{
    
  }
}
</style>