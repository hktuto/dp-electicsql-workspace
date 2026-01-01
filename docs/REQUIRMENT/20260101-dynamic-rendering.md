# Complete Dynamic Page and components rendering

### Initial idea,
 the project is to allow user to create dynamic table and manage it. so for this point of view, the final destination must be help user to build a app with custom page and components. so i think we can also apply same pattern to build out own app with custom page and components. and for the future , if we have a library of component and rule, we can allow LLM to build out the app with custom page and components.

### Technical design
1. create a db to store the all component, provider and their schema.
2. workspace admin can create a new app to use these component, provider and their schema.

### Schema for page

Page Node Tree Structure

```typescript

type PageTreeNode = {
    id:string,
    renderComponent: string,
    editComponent: string,
    type: 'component' | 'provider' | 'container',
    url: string, // regex to match the url , only for page type,
    props: Record<string, any>, // props to pass to the component,
    eventHandler: Record<string, any>, // event handler to handle the event,
    customStyle: Record<string, any>, // custom style to pass to the component,
    hooks: Record<string, any>, // hooks to handle the hooks, for example component may export a hook to run before the form is submitted.

    children: PageTreeNode[], // children component to render the component,
}

```

And for page root 
```typescript
type PageRender = {
    id:string,
    type:  'component' | 'container',
    url: string, // regex to match the url , only for page type,
    props: Record<string, any>, // props to pass to the component,
    children: PageTreeNode[], // children component to render the component,
    globalFunction: Record<string, any>, // global function to use in the page,
    customStyle: Record<string, any>, // custom style to pass to the component,
    hooks: Record<string, any>, // hooks to handle the hooks, for example component may export a hook to run before the form is submitted.
    requiredProvider: string[], // provider id to required to render the component,
    requiredParent: string[], // component id to required to render the component,
}
```

Component Schema that save in db
```typescript
type PageComponent = {
    id:string, // component name 
    type: 'component' | 'container',
    description:string, // component description for ai to better understand the component,
    props: jsonSchema, // component props schema,
    eventList:jsonSchema, // component event list schema,
    hooks:jsonSchema, // component hooks schema,
}
type ProviderComponent = {
    id:string, // provider name 
    type: 'provider',
    description:string, // provider description for ai to better understand the provider,
    exposeFunction: jsonSchema, // provider expose function schema,
}

```

Example to render dynamic page
```vue
<script setuo lang="ts">

    const pageContent = ref<PageRender>() // json schema to render the page
    const pageRoot = ref<URL>()
    const currentUrl = ref<URL>()
   
   provide('pageRoot',{
    rootUrl: pageRoot,
    navigate: (url: URL) => {
      pageRoot.value = url
    },
    currentUrl: currentUrl,
    // router logic provide bu root page
   })

</script>
<template>
 <div class="page-container">
   <dynamic-component :component="pageContent" />
 </div>
</template>
```

### Dynamic component
```vue
<script setup lang="ts">

    const props = defineProps<{
        component: PageComponent | ProviderComponent | ContainerComponent
    }>()

</script>
<template>
    <component :is="props.component" >
     <template #default>
        <dynamic-component :component="props.component.children" v-bind="props.component.props" v-on="props.component.eventList" />
     </template>
    </component>
</template>
```