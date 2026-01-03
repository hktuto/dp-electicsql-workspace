<script setup lang="ts">
import type { Page } from '~/utils/type/apps'
import PageCard from './card.vue'

const { appNodeTree, currentPage } = useAppsContext()

// Add new page
function addNewPage() {
    const newPage: Page = {
        id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'New Page',
        slug: '/new-page',
        layout: 'layout-page',
        layoutProps: {},
        content: [],
        requiresAuth: false,
        routeParams: {},
        meta: {}
    }
    
    if (!appNodeTree.value.pages) {
        appNodeTree.value.pages = []
    }
    
    appNodeTree.value.pages.push(newPage)
}

// Delete page
function deletePage(pageId: string) {
    ElMessageBox.confirm(
        'Are you sure you want to delete this page? This action cannot be undone.',
        'Delete Page',
        {
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            type: 'warning',
        }
    ).then(() => {
        const index = appNodeTree.value.pages.findIndex(p => p.id === pageId)
        if (index !== -1) {
            appNodeTree.value.pages.splice(index, 1)
            ElMessage.success('Page deleted')
        }
    }).catch(() => {
        // User cancelled
    })
}

// Duplicate page
function duplicatePage(page: Page) {
    const duplicatedPage: Page = {
        ...JSON.parse(JSON.stringify(page)),
        id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${page.title} (Copy)`,
        slug: `${page.slug}-copy`
    }
    
    appNodeTree.value.pages.push(duplicatedPage)
    console.log('duplicatedPage', appNodeTree.value.pages)
    ElMessage.success('Page duplicated')
}
</script>

<template>
    <div class="editorSection pages-editor">
        <div class="section-header">
            <h3>Pages</h3>
            <el-button type="primary" size="small" @click="addNewPage">
                <Icon name="lucide:plus" />
                Add Page
            </el-button>
        </div>
        
        <!-- Empty State -->
        <div v-if="!appNodeTree.pages || appNodeTree.pages.length === 0" class="empty-state">
            <el-empty description="No pages yet">
                <el-button type="primary" @click="addNewPage">
                    Create First Page
                </el-button>
            </el-empty>
        </div>
        
        <!-- Pages List -->
        <div v-else class="pages-list">
            <PageCard
                v-for="page in appNodeTree.pages" 
                :key="page.id"
                :page="page"
                :is-current-page="currentPage?.id === page.id"
                :is-home-page="appNodeTree.homePage === page.id"
                @duplicate="duplicatePage"
                @delete="deletePage"
            />
        </div>
    </div>
</template>

<style scoped lang="scss">
.editorSection.pages-editor {
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
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
    
    .empty-state {
        padding: var(--app-space-xl);
        text-align: center;
    }
    
    .pages-list {
        display: flex;
        flex-direction: column;
        gap: var(--app-space-m);
    }
}
</style>