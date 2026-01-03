<script lang="ts" setup>

const context = useAppsContext()
const currentSection = useState('currentSection', () => 'general')

const sections = ref([
    {
        label: 'General',
        value: 'general',
        icon: 'lucide:house',
    },
    {
        label: 'Layout',
        value: 'layout',
        icon: 'icon-park-outline:page',
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
   
])

// History controls from context
const { canUndo, canRedo, undo, redo, commit } = context
const hasUnsavedChanges = context.hasUnsavedChanges
const saveAppNodeTree = context.saveAppNodeTree
const isSaving = context.isSaving
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
                        <LazyDesignerSectionPages />
                    </template>
                    <template v-else-if="currentSection === 'components'">
                        <LazyDesignerSectionComponent />
                    </template>
                    <template v-else-if="currentSection === 'general'">
                        <LazyDesignerSectionGeneral />
                    </template>
                    <template v-else-if="currentSection === 'files'">
                        <LazyDesignerSectionFiles />
                    </template>
                    <template #fallback>
                        loading...
                    </template>
                </Suspense>
            </Transition>
            
        </main>
        
        <!-- History Status Bar -->
        <div class="history-status-bar">
            <div class="history-actions">
                <el-tooltip content="Undo" placement="top" :show-arrow="false">
                    <el-button 
                        circle 
                        size="small"
                        :disabled="!canUndo"
                        @click="undo"
                    >
                        <Icon name="lucide:undo-2" />
                    </el-button>
                </el-tooltip>
                
                <el-tooltip content="Redo" placement="top" :show-arrow="false">
                    <el-button 
                        circle 
                        size="small"
                        :disabled="!canRedo"
                        @click="redo"
                    >
                        <Icon name="lucide:redo-2" />
                    </el-button>
                </el-tooltip>
                
                <div class="divider"></div>
                
                <el-tooltip content="Save to server" placement="top" :show-arrow="false">
                    <el-button 
                        circle 
                        size="small"
                        type="primary"
                        :disabled="!hasUnsavedChanges"
                        :loading="isSaving"
                        @click="saveAppNodeTree"
                    >
                        <Icon name="lucide:save" />
                    </el-button>
                </el-tooltip>
            </div>
            
            <div class="history-status">
                <el-tag 
                    v-if="hasUnsavedChanges" 
                    size="small" 
                    type="warning"
                    effect="plain"
                >
                    <Icon name="lucide:alert-circle" />
                    Unsaved changes
                </el-tag>
                <el-tag 
                    v-else 
                    size="small" 
                    type="success"
                    effect="plain"
                >
                    <Icon name="lucide:check-circle" />
                    All saved
                </el-tag>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
    .editor-container{
        width: 100%;
        height: 100%;
        min-height: 50vh;
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
        padding: var(--app-space-s) var(--app-space-s) var(--app-space-xl)  var(--app-space-s);
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
    
    .history-status-bar{
        position: absolute;
        bottom: 0;
        right: 0;
        left: 0;
        height: 48px;
        background: var(--app-paper);
        border-top: 1px solid var(--app-border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 var(--app-space-m);
        gap: var(--app-space-m);
        z-index: 100;
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
        
        .history-actions{
            display: flex;
            align-items: center;
            gap: var(--app-space-xs);
            
            .divider{
                width: 1px;
                height: 20px;
                background: var(--app-border-color);
                margin: 0 var(--app-space-xs);
            }
        }
        
        .history-status{
            display: flex;
            align-items: center;
            gap: var(--app-space-s);
            
            .el-tag{
                display: flex;
                align-items: center;
                gap: var(--app-space-xs);
            }
        }
    }
</style>