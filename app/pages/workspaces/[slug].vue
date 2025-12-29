<script setup lang="ts">
// Auth is handled by global middleware (auth.global.ts)
const route = useRoute()
const slug = route.params.slug as string
</script>

<template>
  <WorkspaceDetail :slug="slug" />
</template>

<style scoped lang="scss">

</style>

