<script lang="ts" setup>

const context = useDynamicRenderContext()
const currentSection = useState('currentSection', () => 'layout')

const sections = ref([
    {
        label: 'Layout',
        value: 'layout',
        icon: 'lucide:house',
    },
    {
        label: 'Components',
        value: 'components',
        icon: 'lucide:component',
    },
    {
        label: 'Files',
        value: 'files',
        icon: 'lucide:file',
    },
    {
        label: 'General',
        value: 'general',
        icon: 'mdi:cog',
    },
])
</script>

<template>
    <div class="editor-container">
        <aside class="editor-container-sidebar">
            <div 
                :class="{'menuItem':true, 'selected':currentSection === section.value}" 
                v-for="section in sections" :key="section.value"
                @click="currentSection = section.value"
            >
                <el-tooltip :content="section.label" placement="right" :show-arrow="false">
                    <Icon :name="section.icon" />
                </el-tooltip>
            </div>
        </aside>
        <main class="editor-container-main">
            <Transition name="fade">
                <Suspense>
                    <template v-if="currentSection === 'layout'">
                        <LazyDynamicPageEditorSectionHome />
                    </template>
                    <template v-else-if="currentSection === 'components'">
                        <LazyDynamicPageEditorSectionComponent />
                    </template>
                    <template v-else-if="currentSection === 'general'">
                        <LazyDynamicPageEditorSectionGeneral />
                    </template>
                    <template v-else-if="currentSection === 'files'">
                        <LazyDynamicPageEditorSectionFiles />
                    </template>
                    <template #fallback>
                        <NuxtLoadingIndicator />
                    </template>
                </Suspense>
            </Transition>
            
        </main>
    </div>
</template>

<style scoped lang="scss">
    .editor-container{
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: relative;
        display: grid;
        grid-template-columns: min-content 1fr;
        gap: 0;
    }
    .editor-container-sidebar{
        height: 100%;
        overflow-y: auto;
        // background-color: var(--app-grey-900);
        padding: var(--app-space-xs);
        border-right: 1px solid var(--app-border-color);
    }
    .editor-container-main{
        padding: var(--app-space-s);
        height: 100%;
        position: relative;
        overflow: auto;
    }
    .menuItem{
        color: var(--app-grey-700);
        padding: var(--app-space-s);
        border-radius: var(--app-border-radius-s);
        cursor: pointer;
        font-size: var(--app-font-size-m);
        line-height: 0;
        &:hover{
            background-color: var(--app-primary-alpha-50);
        }
        &.selected{
            color: var(--app-primary-color);
        }
    }
</style>