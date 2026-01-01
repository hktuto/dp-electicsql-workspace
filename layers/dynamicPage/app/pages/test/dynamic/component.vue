<script setup lang="ts">
import type { ComponentNode } from '#shared/dynamicComponent/dynamic-page'

const component = ref<ComponentNode>({
    // Component reference
    componentId: "pageContainer",
    componentVersion: 1,  // Using integer version
    
    // Instance identity
    instanceId: "page-root",
    
    // Component to render (denormalized for performance)
    renderComponent: "PageContainer",
    editComponent: "PageContainerEdit",
    
    // Props for pageContainer
    props: {
        menu: [
            {
                id:"asfasf",
                label:"asfasf"
            }
        ],
        footer: [],
        logo: "/logo.svg",
    },
    
    // Slots with children
    slots: {
        default: [
            {
                componentId: "workspaceList",
                componentVersion: 1,
                instanceId: "workspace-list-1",
                renderComponent: "demoWorkspaceList",
                editComponent: "demoWorkspaceListEdit",
                props: {
                    workspaces: [],
                },
                slots: {
                    default: [],
                },
            }
        ]
    },
    
    // Metadata
    createdAt: new Date().toISOString(),
})
</script>

<template>
    <DynamicPage :component="component"/>
</template>