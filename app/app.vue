<script setup lang="ts">

 useAppsProvider()
 const layout = useLayout();
</script>

<template>
  <NuxtLoadingIndicator color="var(--app-primary-color)"  />
  <NuxtLayout :name="layout">
    <AppsEntry  />
  </NuxtLayout>
</template>

<style lang="scss">
  html{
    container-type: inline-size;
  }
</style>
