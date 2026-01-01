<script setup lang="ts">
const { $sessionToken } = useNuxtApp()
onMounted(() => {
  console.log('sessionToken', $sessionToken)
})
</script>

<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    {{ $sessionToken }}
    <NuxtPage />
  </NuxtLayout>
</template>
