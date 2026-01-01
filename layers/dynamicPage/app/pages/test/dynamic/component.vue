<script setup lang="ts">
const component = ref({
    id: "pageHeader",
    name: "Page Header",
    type: "container",
    description: "The header of the page",
    category: "page",
    renderComponent: "pageContainer",
    editComponent: "pageContainerEdit",
    props: {
        menu:[],
        footer:[],
        logo: "/logo.svg",
    },
    slots: {
        default: [
            {
                id: "workspaceList",
                name: "Workspace List",
                type: "component",
                description: "The list of workspaces",
                category: "page",
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
})
</script>

<template>
    <DynamicPage :component="component"/>
</template>