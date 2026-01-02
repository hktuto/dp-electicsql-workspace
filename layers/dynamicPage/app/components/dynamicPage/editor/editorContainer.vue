<script lang="ts" setup>

const context = useDynamicRenderContext()
const currentTab = ref<string | null>(null)

</script>

<template>
    <div class="editor-container">
        <div class="editor-container-header">
            <pre class="editor-container-header-title">
                {{ context }}
            </pre>
        </div>
    </div>
</template>