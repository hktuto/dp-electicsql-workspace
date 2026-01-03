<script setup lang="ts">

import {DockviewVue} from 'dockview-vue';
import type { DockviewReadyEvent, DockviewApi } from 'dockview-vue';
const props = defineProps<{
    tabs?: any
}>();
const dockApi = ref<DockviewApi>();
function initPanes(){
 // check if props.tabs is avalible
 if(props.tabs){
    dockApi.value?.fromJSON(props.tabs)
    return;
 }
 // if not, create a default pane
 dockApi.value?.addPanel({
    id: 'Default',
    title: 'Home',
    component: 'HomePage',
    initialWidth: 100,
    initialHeight: 100,
 })
}



function onReady(event: DockviewReadyEvent) {
    dockApi.value = event.api;
    initPanes()
}

</script>

<template>
<div class="pageContainer">
    <dockview-vue
        @ready="onReady"
      >
      </dockview-vue>
</div>
</template>

<style scoped>

</style>