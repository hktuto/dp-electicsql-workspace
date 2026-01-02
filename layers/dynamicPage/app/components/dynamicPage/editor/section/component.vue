<script setup lang="ts">
    const {componentState} = useDynamicRenderContext()
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
onMounted(async() => {
    await sleep(1000)
})
</script>

<template>
    <div class="editorSection">
        Components page
        {{componentState}}
    </div>
</template>