<script setup lang="ts">
    const {componentState} = useDynamicRenderContext()

</script>

<template>
    <div class="editorSection">
        General page
        {{componentState}}
    </div>
</template>