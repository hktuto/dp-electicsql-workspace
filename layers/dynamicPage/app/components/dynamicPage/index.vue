<script setup lang="ts">
import { useDynamicRenderProvider } from '#layers/dynamicPage/app/composables/useDynamicRender';
import type { ComponentNode } from '#shared/dynamicComponent/dynamic-page';

const props = defineProps<{
  component: ComponentNode
}>()

const { toggleEditMode, displayMode } = useDynamicRenderProvider(props.component)
useDynamicRouter()
const user = useUser()
const componentState = useComponentState()


</script>

<template>
  <div class="dynamic-page-wrapper">
    <!-- Main content -->
    <DynamicPageComponentRenderer :component="componentState"/>
    
    <template v-if="user && user.isSuperAdmin">
      <LazyDynamicPageEditorFloatingIcon />

    </template>
  </div>
</template>

<style scoped>
.dynamic-page-wrapper {
  position: relative;
  min-height: 100vh;
}

</style>