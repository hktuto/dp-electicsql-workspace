import type { AppNode } from '@/utils/type/apps'

/**
 * Apps data - type-safe dummy data
 * 
 * This file provides type-safe dummy data for development.
 * TypeScript will validate all fields match the AppNode interface at compile time.
 */
export const apps: AppNode[] = [
  {
    id: "main-app",
    type: "system",
    workspaceId: null,
    title: "DocPal",
    description: "DocPal manage all data and workflow",
    icon: "",
    theme: "default",
    status: "published",
    version: 1,
    baseUrl: "/app",
    homePage: "home",
    navLayout: "default",
    bucketPrefix: "system",
    pages: [
      {
        id: "home",
        title: "Home",
        slug: "/home",
        routeParams: {},
        layout: "default",
        layoutProps: {},
        requiresAuth: true,
        content: [
          {
            componentId: "home",
            componentVersion: 1,
            instanceId: "home-1",
            renderComponent: "LazyHome"
          },{
            componentId: "button",
            componentVersion: 1,
            instanceId: "button-1",
            renderComponent: "LazyAppButton",
            props: {
              type: "primary",
              size: "large",
              loading: false,
              disabled: false,
            },
            slots: {
              default: "Click me"
            },
            eventHandlers: {
              click: `() => {
              console.log(props)
                router.push('/app/workspace')
              }`
            }
          }
        ]
      },
      {
        id: "workspace",
        title: "Workspace",
        slug: "/workspace",
        routeParams: {},
        layout: "workspace",
        layoutProps: {},
        requiresAuth: false,
        content: [
          {
            componentId: "workspace",
            componentVersion: 1,
            instanceId: "workspace-1",
            renderComponent: "LazyHome"
          },
          {
            componentId: "button",
            componentVersion: 1,
            instanceId: "button-1",
            renderComponent: "LazyAppButton",
            props: {
              type: "primary",
              size: "large",
              loading: false,
              disabled: false,
            },
            slots: {
              default: "Click me"
            },
            eventHandlers: {
              click: `() => {
              console.log(props)
                router.push('/app/home')
              }`
            }
          }
        ]
      }
    ]
  }
]

