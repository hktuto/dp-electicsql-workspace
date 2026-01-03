export type AppThemeOptionSchema = {
    id: string,
    name: string,
    preview: string,
    description: string,
}

export type AppNavLayoutOptionSchema = {
    id: string,
    name: string,
    preview: string,
    description: string,
}

export const AppThemeOptions = [
    {
        id: 'default',
        name: 'Default',
        preview: '/themes/preview/default.svg',
        description: 'Default theme',
    },
    {
        id: 'red',
        name: 'Red',
        preview: '/themes/preview/red.svg',
        description: 'Test theme for preview',
    }
]
export const AppNavLayoutOptions: AppNavLayoutOptionSchema[] = [
    {
        id: 'default',
        name: 'Single Page',
        preview: '/layouts/preview/default.svg',
        description: 'Single page layout, no menu or sidebar',
    },
    {
        id: 'sidebar',
        name: 'Sidebar',
        preview: '/layouts/preview/sidebar.svg',
        description: 'Sidebar layout, with expandable sidebar on left, and a header on top',
    }
]