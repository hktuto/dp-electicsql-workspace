<script setup lang="ts">
// Extract route params
const route = useRoute()
const slug = computed(() => route.params.slug as string)
const allParams = computed(() => {
  const all = route.params.all
  return Array.isArray(all) ? all : all ? [all] : []
})
</script>

<template>
  <WrapperWorkspace :slug="slug" :route="allParams" />
</template>
