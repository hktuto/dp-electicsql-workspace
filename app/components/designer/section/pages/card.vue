<script setup lang="ts">
import type { Page } from '~/utils/type/apps'

const props = defineProps<{
    page: Page
    isCurrentPage: boolean
    isHomePage: boolean
}>()

const emit = defineEmits<{
    duplicate: [page: Page]
    delete: [pageId: string]
}>()

const { appNodeTree } = useAppsContext()

// Internal expand state
const isExpanded = ref(false)

// Toggle expansion
function toggleExpand() {
    isExpanded.value = !isExpanded.value
}

// Navigate to page
function navigateToPage() {
    const router = useRouter()
    const fullUrl = `${appNodeTree.value.baseUrl}${props.page.slug}`
    router.push(fullUrl)
}

// Layout options for pages
const layoutOptions = [
    { label: 'Standard Page', value: 'layout-page' },
    { label: 'Centered', value: 'layout-centered' },
    { label: 'Grid Layout', value: 'layout-grid' },
    { label: 'Fullscreen', value: 'layout-fullscreen' },
    { label: 'Split Panes', value: 'layout-split' },
    { label: 'Sidebar Submenu', value: 'layout-sidebar-submenu' },
]
</script>

<template>
    <div 
        :class="[
            'page-card', 
            { 
                expanded: isExpanded,
                'current-page': isCurrentPage
            }
        ]"
    >
        <!-- Card Header -->
        <div class="page-card-header" @click="navigateToPage">
            <div class="page-info">
                <div class="page-details">
                    <div class="page-title">{{ page.title }}</div>
                    <div class="page-meta">
                        <el-tag 
                            v-if="isHomePage" 
                            size="small" 
                            type="success"
                        >
                            <Icon name="lucide:home" style="font-size: 12px;" />
                            Home Page
                        </el-tag>
                        <span class="page-slug">{{ page.slug }}</span>
                    </div>
                </div>
            </div>
            
            <div class="page-actions" @click.stop>
                <el-tooltip content="Duplicate" placement="top">
                    <el-button 
                        circle 
                        size="small" 
                        text
                        @click="emit('duplicate', page)"
                    >
                        <Icon name="lucide:copy" />
                    </el-button>
                </el-tooltip>
                
                <el-tooltip content="Delete" placement="top">
                    <el-button 
                        circle 
                        size="small" 
                        text
                        type="danger"
                        @click="emit('delete', page.id)"
                    >
                        <Icon name="lucide:trash-2" />
                    </el-button>
                </el-tooltip>
                
                <el-tooltip content="Edit page settings" placement="top">
                    <el-button 
                        circle 
                        size="small" 
                        text
                        @click="toggleExpand"
                    >
                        <Icon 
                            :name="isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'" 
                        />
                    </el-button>
                </el-tooltip>
            </div>
        </div>
        
        <!-- Expanded Content -->
        <transition name="expand">
            <div v-if="isExpanded" class="page-card-content">
                <el-form :model="page" label-position="top">
                    <el-row :gutter="16">
                        <el-col :span="12">
                            <el-form-item label="Page Title">
                                <el-input v-model="page.title" placeholder="Dashboard" />
                            </el-form-item>
                        </el-col>
                        
                        <el-col :span="12">
                            <el-form-item label="Slug (URL path)">
                                <el-input v-model="page.slug" placeholder="/dashboard" />
                            </el-form-item>
                        </el-col>
                    </el-row>
                    
                    <el-row :gutter="16">
                        <el-col :span="12">
                            <el-form-item label="Layout">
                                <el-select v-model="page.layout" style="width: 100%">
                                    <el-option 
                                        v-for="option in layoutOptions" 
                                        :key="option.value" 
                                        :label="option.label" 
                                        :value="option.value" 
                                    />
                                </el-select>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    
                    <el-row :gutter="16">
                        <el-col :span="12">
                            <el-form-item>
                                <template #label>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span>Requires Authentication</span>
                                        <el-tooltip content="Users must be logged in to access this page">
                                            <Icon name="lucide:info" style="font-size: 14px; color: var(--app-grey-600);" />
                                        </el-tooltip>
                                    </div>
                                </template>
                                <el-switch v-model="page.requiresAuth" />
                            </el-form-item>
                        </el-col>
                    </el-row>
                </el-form>
            </div>
        </transition>
    </div>
</template>

<style scoped lang="scss">
.page-card {
    border: 1px solid var(--app-border-color);
    border-radius: var(--app-border-radius-m);
    background: var(--app-paper);
    overflow: hidden;
    transition: all 0.2s;
    position: relative;
    
    &:hover {
        border-color: var(--app-primary-color);
        box-shadow: var(--app-shadow-s);
    }
    
    &.expanded {
        border-color: var(--app-primary-color);
    }
    
    &.current-page {
        outline: 2px solid var(--app-primary-color) !important;
        background: var(--app-primary-alpha-30) !important;
    }
}

.page-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--app-space-m);
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;
    
    &:hover {
        background: var(--app-grey-950);
    }
}

.page-info {
    display: flex;
    align-items: center;
    gap: var(--app-space-m);
    flex: 1;
    
    .page-icon {
        font-size: 24px;
        color: var(--app-primary-color);
    }
}

.page-details {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-xs);
    
    .page-title {
        font-size: var(--app-font-size-m);
        font-weight: 600;
        color: var(--app-text-color);
    }
    
    .page-meta {
        display: flex;
        align-items: center;
        gap: var(--app-space-s);
        font-size: var(--app-font-size-s);
        
        .page-slug {
            color: var(--app-grey-600);
            font-family: monospace;
        }
    }
}

.page-actions {
    display: flex;
    align-items: center;
    gap: var(--app-space-xs);
    :deep(.el-button + .el-button) {
        margin-left: 0;
    }
}

.page-card-content {
    padding: var(--app-space-m);
    border-top: 1px solid var(--app-border-color);
    background: var(--app-grey-950);
    
    .form-section {
        margin-top: var(--app-space-m);
        
        h4 {
            margin: 0 0 var(--app-space-m) 0;
            font-size: var(--app-font-size-m);
            font-weight: 600;
            color: var(--app-grey-600);
        }
    }
}

// Expand transition
.expand-enter-active,
.expand-leave-active {
    transition: all 0.3s ease;
    max-height: 800px;
}

.expand-enter-from,
.expand-leave-to {
    max-height: 0;
    opacity: 0;
}
</style>

