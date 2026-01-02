<script lang="ts" setup>

const context = useDynamicRenderContext()

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