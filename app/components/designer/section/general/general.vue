<script setup lang="ts">
import BasicInfo from './basicInfo.vue'
import ThemeSelection from './themeSelection.vue'
import NavLayoutSelection from './navLayoutSelection.vue'
import Routing from './routing.vue'
import Advanced from './advanced.vue'

const { appNodeTree } = useAppsContext()
</script>

<template>
    <div class="editorSection">
        <div class="section-header">
            <h3>General Settings</h3>
        </div>
        
        <ElForm :model="appNodeTree" label-position="top">
            <BasicInfo />
            <ThemeSelection />
            <NavLayoutSelection />
            <Routing />
            <Advanced />
        </ElForm>
    </div>
</template>

<style scoped lang="scss">
.editorSection {
    .section-header {
        margin-bottom: var(--app-space-m);
        padding-bottom: var(--app-space-s);
        border-bottom: 1px solid var(--app-border-color);
        
        h3 {
            margin: 0;
            font-size: var(--app-font-size-l);
            font-weight: 600;
            color: var(--app-text-color);
        }
    }
}
</style>