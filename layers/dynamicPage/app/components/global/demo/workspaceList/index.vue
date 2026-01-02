<script setup lang="ts">
    import { useDynamicRouterContext } from '#layers/dynamicPage/app/composables/useDynamicRouter';
    const props = defineProps<{
        workspaces: any[]
    }>()

    const router = useDynamicRouterContext()
    const emit = defineEmits<{
        (e: 'click', event: MouseEvent): void
    }>()
    function clickHandler(e: MouseEvent) {
        emit('click', e)
    }

    defineExpose({
        clickHandler
    })
</script>

<template>
    <div class="workspace-list">
        asfasfsf
        <button @click="clickHandler">test event</button>
    </div>
</template>