<script setup lang="ts">

const { currentPage } = useAppsContext()

</script>

<template>
    <div>
        <h1>{{ currentPage?.title }}</h1>
        <template v-if="currentPage?.content">
            <AppsComponent v-for="component in currentPage.content" :key="component.instanceId" :component="component" />
        </template>
    </div>
</template>