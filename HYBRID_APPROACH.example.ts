/**
 * Option 2: Hybrid Approach - Keep JSON but validate with TypeScript
 * 
 * This approach keeps the JSON file but adds a TypeScript file that:
 * 1. Imports the JSON
 * 2. Validates it against types using 'satisfies'
 * 3. Re-exports it with proper typing
 * 
 * Benefits:
 * - Keep JSON format (easier to edit manually)
 * - Get type checking
 * - Can generate JSON from TS during build
 * 
 * Usage in API:
 * import { apps } from '~/data/apps.validated'
 */

// apps.validated.ts
import appsJson from './apps.json'
import type { AppNode } from '@/utils/type/apps'

// Type assertion validates at compile time
export const apps = appsJson as AppNode[]

// Or use satisfies for stricter checking (if you fix the JSON first)
// export const apps = appsJson satisfies AppNode[]

