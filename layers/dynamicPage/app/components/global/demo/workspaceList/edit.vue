<script setup lang="ts">
    import { useDynamicRouterContext } from '#layers/dynamicPage/app/composables/useDynamicRouter';
    const props = defineProps<{
        workspaces: any[]
    }>()

    const router = useDynamicRouterContext()

    onMounted(() => {
        throw new Error('test error')
    })
</script>

<template>
    <div class="workspace-list">
        edit workflow list
    </div>
</template>