<script setup lang="ts">
import type { ComponentNode } from '~~/layers/dynamicPage/app/utils/dynamicAppType'

const component = ref<ComponentNode>({
    // Component reference
    
    componentId: "pageContainer",
    componentVersion: 1,  // Using integer version
    
    // Instance identity
    instanceId: "page-root",
    
    // Component to render (denormalized for performance)
    renderComponent: "PageContainer",
    editComponent: "PageContainerEdit",

    eventHandlers: {
        click: (e: MouseEvent) => {
                        console.log('click', e)
                    }
    },
    
    // Props for pageContainer
    props: {
        menu: [
            {
                id:"1234",
                label:"1245"
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
                eventHandlers: {
                    click: (e: MouseEvent) => {
                        console.log('click', e)
                    }
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