

// this is a placeholder layout with zero styles, it's used to wrap the page content
<template>
    <div class="pageContainer">
        <main>
            <slot />
        </main>
    </div>
</template>

<style scoped lang="scss">
.pageContainer{
    display: flex;
    flex-flow: column nowrap;
    align-items: stretch;
    justify-content: flex-start;
    width: 100vw;
    height: 100dvh;
    overflow: auto;
}

main{
    width: 100%;
    max-width: var(--app-content-max-width);
    margin: 0 auto;
    padding-block: var(--app-space-m);
    @container (max-width: var(--app-content-max-width)) {
        padding-inline: var(--app-space-s);
    }
    @media (max-width: var(--app-content-max-width)) {
        padding-inline: var(--app-space-s);
    }
}
</style>