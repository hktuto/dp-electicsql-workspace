<script setup lang="ts">
import type CommonPopoverDialog from '~/components/common/popoverDialog.vue';

const floatingState = ref<'collapse' | 'expand'>('collapse')
const detailExpand = ref(false);

// sticky position logic
const STORAGE_KEY = 'floatingIcon:position';
const stickPosition = ref<'top' | 'bottom' | 'left' | 'right'>('top');
const iconPosition = ref<{x:number, y:number}>({x:100, y:0});
const dragging = ref(false);
const iconRef = ref<HTMLElement | null>(null);
const dragOffset = ref<{x:number, y:number}>({x:0, y:0});
const popoverDialogRef = useTemplateRef<InstanceType<typeof CommonPopoverDialog>>('popoverDialogRef');
const tabContainerRef = useTemplateRef<HTMLElement>('tabContainerRef');

// localStorage persistence
interface StoredPosition {
    x: number;
    y: number;
    stick: 'top' | 'bottom' | 'left' | 'right';
}

function savePosition() {
    const data: StoredPosition = {
        x: iconPosition.value.x,
        y: iconPosition.value.y,
        stick: stickPosition.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function restorePosition() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    
    try {
        const data: StoredPosition = JSON.parse(stored);
        const { width: iconWidth, height: iconHeight } = getIconSize();

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Validate and clamp position to current screen bounds
        stickPosition.value = data.stick;
        
        if (data.stick === 'top' || data.stick === 'bottom') {
            iconPosition.value.x = Math.max(0, Math.min(windowWidth - iconWidth, data.x));
            iconPosition.value.y = data.stick === 'top' ? 0 : windowHeight - iconHeight - 17;
        } else {
            iconPosition.value.y = Math.max(0, Math.min(windowHeight - iconHeight, data.y));
            iconPosition.value.x = data.stick === 'left' ? 0 : windowWidth - iconWidth - 17;
        }
    } catch (e) {
        console.warn('Failed to restore floating icon position:', e);
    }
}

// Recalculate position on window resize
function handleWindowResize() {
    const { width: iconWidth, height: iconHeight } = getIconSize();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Clamp position to new window bounds based on current stick position
    if (stickPosition.value === 'top') {
        iconPosition.value.x = Math.max(0, Math.min(windowWidth - iconWidth, iconPosition.value.x));
        iconPosition.value.y = 0;
    } else if (stickPosition.value === 'bottom') {
        iconPosition.value.x = Math.max(0, Math.min(windowWidth - iconWidth, iconPosition.value.x));
        iconPosition.value.y = windowHeight - iconHeight;
    } else if (stickPosition.value === 'left') {
        iconPosition.value.x = 0;
        iconPosition.value.y = Math.max(0, Math.min(windowHeight - iconHeight, iconPosition.value.y));
    } else {
        iconPosition.value.x = windowWidth - iconWidth;
        iconPosition.value.y = Math.max(0, Math.min(windowHeight - iconHeight, iconPosition.value.y));
    }
}

onMounted(() => {
    // Wait for next tick to ensure icon is fully rendered before restoring position
    nextTick(() => {
        restorePosition();
    });
    window.addEventListener('resize', handleWindowResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleWindowResize);
});

///region Get icon dimensions
function getIconSize() {
    if (!iconRef.value) return { width: 40, height: 40 };
    const rect = iconRef.value.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
}

function handleDragStart(e: DragEvent) {
    dragging.value = true;
    // Store offset from mouse to icon top-left corner
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    dragOffset.value = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    // Make drag image transparent
    if (e.dataTransfer) {
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
    }
}

function handleDrag(e: DragEvent) {
    // Ignore the last drag event with 0,0 coordinates
    if (e.clientX === 0 && e.clientY === 0) return;
    
    const { width: iconWidth, height: iconHeight } = getIconSize();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate cursor position relative to icon center
    const cursorX = e.clientX - dragOffset.value.x + iconWidth / 2;
    const cursorY = e.clientY - dragOffset.value.y + iconHeight / 2;
    
    // Calculate distances to each edge
    const distToTop = cursorY;
    const distToBottom = windowHeight - cursorY;
    const distToLeft = cursorX;
    const distToRight = windowWidth - cursorX;
    
    // Find minimum distance to determine which edge to stick to
    const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);
    
    let newStickPosition: 'top' | 'bottom' | 'left' | 'right';
    let newX: number;
    let newY: number;
    
    if (minDist === distToTop) {
        newStickPosition = 'top';
        newY = 0;
        // Clamp X position within screen bounds
        newX = Math.max(0, Math.min(windowWidth - iconWidth, e.clientX - dragOffset.value.x));
    } else if (minDist === distToBottom) {
        newStickPosition = 'bottom';
        newY = windowHeight - iconHeight;
        newX = Math.max(0, Math.min(windowWidth - iconWidth, e.clientX - dragOffset.value.x));
    } else if (minDist === distToLeft) {
        newStickPosition = 'left';
        newX = 0;
        newY = Math.max(0, Math.min(windowHeight - iconHeight, e.clientY - dragOffset.value.y));
    } else {
        newStickPosition = 'right';
        newX = windowWidth - iconWidth;
        newY = Math.max(0, Math.min(windowHeight - iconHeight, e.clientY - dragOffset.value.y));
    }
    
    stickPosition.value = newStickPosition;
    iconPosition.value = { x: newX, y: newY };
    
    // Recalculate popover position if open
    nextTick(() => {
        if(popoverDialogRef.value && detailPageOpen.value){
            popoverDialogRef.value?.recalculate();
        }
    });
}

function handleDragEnd() {
    dragging.value = false;
    savePosition();
}
///endregion Get icon dimensions

// auto collapse timeout logic
const closeTimeOut = ref(3000); // time out offset when idle
const collapseTimeout = ref<NodeJS.Timeout | null>(null);
function startCollapseTimeout() {
    collapseTimeout.value = setTimeout(() => {
        if(!detailExpand.value && !dragging.value) {
            floatingState.value = 'collapse';
        }
    }, closeTimeOut.value);
}

function handleMouseEnter() {
    floatingState.value = 'expand';
    if(collapseTimeout.value){
        clearTimeout(collapseTimeout.value);
    }
}
function handleMouseLeave() {
    startCollapseTimeout();
}
// end auto collapse timeout logic

// open detail page logic
const detailPageOpen = ref(false);
function clickHandler(){
    detailPageOpen.value = true;
    popoverDialogRef.value?.open(tabContainerRef.value ?? undefined);
}
// end open detail page logic

</script>

<template>
    <div class="floatingIconContainer">
        <div 
            ref="iconRef"
            :class="{floatingIcon:true, [floatingState]:true, detailExpand:detailExpand, [stickPosition]:true, dragging:dragging}"
            :style="{top:iconPosition.y + 'px', left:iconPosition.x + 'px'}"
            draggable="true"
            @mouseenter="handleMouseEnter"
            @mouseleave="handleMouseLeave"
            @dragstart="handleDragStart"
            @drag="handleDrag"
            @dragend="handleDragEnd"
        >
            <div ref="tabContainerRef" class="tabContainer" @click.stop="clickHandler">

                <Icon  name="mdi:pencil" />
                <template v-if="floatingState === 'expand'">
                    <!-- <Icon  name="mdi:pencil" /> -->
                </template>
            </div>
            <div class="backdrop">

            </div>
        </div>
        <CommonPopoverDialog
            ref="popoverDialogRef"
            @close="detailPageOpen = false"
        >
            <DynamicPageEditorContainer />
        </CommonPopoverDialog>
    </div>
</template>

<style scoped lang="scss">
.tabContainer{
    padding: var(--app-space-xs);
    color: var(--icon-color);
    border: 1px solid var(--app-grey-800);
    display: flex;
    flex-flow: var(--icon-flex-flow);
    justify-content: center;
    align-items: center;
    gap: var(--app-space-s);
    line-height: 0;
    background-color: var(--app-paper);
    border-radius: var(--tab-border-radius);
    padding: var(--tab-padding);
    cursor: pointer;
}
.floatingIcon{
    --icon-translate-x: -0px;
    --icon-translate-y: 0;
    --icon-flex-flow: row nowrap;
    --tab-padding: var(--app-space-xs) ;
    --tab-border-radius: var(--app-border-radius-xl);
    --icon-color: var(--app-grey-600);
    position: fixed;
    display: grid;
    place-items: center;
    z-index: 9999;
    border-radius: var(--app-border-radius-xl);
    isolation: isolate;
    // transition: all 0.3s ease;
    .backdrop{
        position: absolute;
        top: -150px;
        left: -150px;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, var(--app-primary-alpha-50) 0%, transparent 70%);
        z-index: -1;
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s ease;

    }
    &.top{
        --icon-flex-flow: row nowrap;
        --tab-border-radius: 0 0 var(--app-border-radius-xl)  var(--app-border-radius-xl);
        transform : translateX(calc(-1 * var(--app-space-xs)));

        &.expand{
            --tab-border-radius: var(--app-border-radius-xl);
            margin-top: var(--app-space-xs);
        }
    }
    &.bottom{
        --icon-flex-flow: row nowrap;
        --tab-border-radius: var(--app-border-radius-xl) var(--app-border-radius-xl) 0 0;
        transform : translateY(var(--app-space-xs));
        &.expand{
            --tab-border-radius: var(--app-border-radius-xl);
            transform: translateY(calc(-1 * var(--app-space-xs)));
        }
    }
    &.left{
        --icon-flex-flow: column nowrap;
        --tab-border-radius: 0 var(--app-border-radius-xl) var(--app-border-radius-xl) 0;
        transform : translateX(calc(-1 * var(--app-space-xs)));
        &.expand{
            --tab-border-radius: var(--app-border-radius-xl);
            margin-left: var(--app-space-xs);
        }
    }
    &.right{
        --icon-flex-flow: column nowrap;
        --tab-border-radius: var(--app-border-radius-xl) 0 0 var(--app-border-radius-xl);
        transform : translateX(var(--app-space-xs));

        &.expand{
            --tab-border-radius: var(--app-border-radius-xl);
            transform: translateX(calc(-1 * var(--app-space-xs)));
        }
    }
    &.expand{
        --icon-color: var(--app-primary-color);
        box-shadow: var(--app-shadow-l);
        .backdrop{
            opacity: 1;
        }
    }
    &.dragging{
        --icon-color: var(--app-primary-2);
        opacity: 0.8;
        cursor: grabbing;
        transition: none;
        .backdrop{
            top: -300px;
            left: -300px;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, var(--app-primary-alpha-90) 10%, transparent 70%);
        }
    }
}

</style>