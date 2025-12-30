<template>
  <DataTableList v-if="workspace" :workspace-id="workspace.id" />
</template>

<script setup lang="ts">
const route = useRoute()
const workspaceSlug = computed(() => route.params.slug as string)
const workspace = useState('currentworkspace')
</script>

