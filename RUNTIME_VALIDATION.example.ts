/**
 * Option 3: Runtime Validation with Type Guards
 * 
 * Create validation functions that check the data at runtime.
 * Useful if you need to validate data from external sources.
 * 
 * You could use a library like Zod to generate validators from types.
 */

import type { AppNode, Page, ComponentNode } from '@/utils/type/apps'

// Example type guard (simplified)
function isAppNode(obj: any): obj is AppNode {
  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.version === 'number' &&
    Array.isArray(obj.pages) &&
    obj.pages.every(isPage)
    // ... more checks
  )
}

function isPage(obj: any): obj is Page {
  return (
    typeof obj.id === 'string' &&
    typeof obj.slug === 'string' &&
    typeof obj.layout === 'string' &&
    typeof obj.requiresAuth === 'boolean' &&
    Array.isArray(obj.content)
    // ... more checks
  )
}

function isComponentNode(obj: any): obj is ComponentNode {
  return (
    typeof obj.componentId === 'string' &&
    typeof obj.componentVersion === 'number' &&
    typeof obj.instanceId === 'string' &&
    typeof obj.renderComponent === 'string'
    // ... more checks
  )
}

// Usage:
// const appsData = JSON.parse(fileContent)
// if (!appsData.every(isAppNode)) {
//   throw new Error('Invalid app data')
// }

