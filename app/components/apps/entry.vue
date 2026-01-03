<script setup lang="ts">
const { appNodeTree, currentPage, appLoading } = useAppsContext()
const {user, isAuthenticated, logout} = useAuth()
function testRoute(path: string){
    navigateTo(path)
}

</script>

<template>
    <Transition name="fade">
        <Suspense>
            <template v-if="currentPage?.requiresAuth && !isAuthenticated">
                <LazyAuthLogin />
            </template>
            <template v-else>
                <LazyAppsPage />
            </template>
            <template #fallback>
                <NuxtLoadingIndicator />
            </template>
        </Suspense>
    </Transition>
    <DesignerFloatingButton v-if="user && user?.isSuperAdmin" />
</template>