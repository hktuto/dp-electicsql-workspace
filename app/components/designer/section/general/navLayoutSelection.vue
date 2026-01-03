<script setup lang="ts">
import { AppNavLayoutOptions } from '~/utils/appsSettings'

const { appNodeTree } = useAppsContext()
</script>

<template>
    <div class="form-group">
        <h4>Navigation Layout</h4>
        <div class="option-grid">
            <div 
                v-for="layout in AppNavLayoutOptions" 
                :key="layout.id"
                :class="['option-card', { selected: appNodeTree.navLayout === layout.id }]"
                @click="appNodeTree.navLayout = layout.id"
            >
                <div class="option-preview">
                    <img :src="layout.preview" :alt="layout.name" />
                    <div v-if="appNodeTree.navLayout === layout.id" class="selected-badge">
                        <Icon name="lucide:check" />
                    </div>
                </div>
                <div class="option-info">
                    <div class="option-name">{{ layout.name }}</div>
                    <div class="option-description">{{ layout.description }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.form-group {
    margin-bottom: var(--app-space-s);
    padding: var(--app-space-m);
    background: var(--app-grey-950);
    border-radius: var(--app-border-radius-m);
    
    h4 {
        margin: 0 0 var(--app-space-m) 0;
        font-size: var(--app-font-size-m);
        font-weight: 600;
        color: var(--app-grey-600);
    }
}

.option-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--app-space-m);
}

.option-card {
    border: 2px solid var(--app-border-color);
    border-radius: var(--app-border-radius-m);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
    background: var(--app-paper);
    
    &:hover {
        border-color: var(--app-primary-color);
        box-shadow: var(--app-shadow-s);
    }
    
    &.selected {
        border-color: var(--app-primary-color);
        background: var(--app-primary-alpha-30);
    }
}

.option-preview {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    background: var(--app-grey-100);
    overflow: hidden;
    
    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
    
    .selected-badge {
        position: absolute;
        top: var(--app-space-xs);
        left: var(--app-space-xs);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--app-primary-color);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: var(--app-shadow-s);
    }
}

.option-info {
    padding: var(--app-space-s);
    
    .option-name {
        font-size: var(--app-font-size-m);
        font-weight: 600;
        color: var(--app-text-color);
        margin-bottom: var(--app-space-xs);
    }
    
    .option-description {
        font-size: var(--app-font-size-s);
        color: var(--app-grey-600);
        line-height: 1.4;
    }
}
</style>

