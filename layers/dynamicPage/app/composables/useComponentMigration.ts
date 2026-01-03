/**
 * Component Migration System
 * 
 * Handles automatic migration of component nodes when schema versions change.
 * Uses integer versions for easy comparisons and queries.
 */

import type { ComponentNode, ComponentSchema, ComponentMigration } from '~~/layers/dynamicPage/app/utils/dynamicAppType'

export function useComponentMigration() {
  /**
   * Get component schema from registry
   */
  function getSchema(componentId: string): ComponentSchema | null {
    // TODO: Replace with actual registry lookup
    const { componentList } = await import('~~/layers/dynamicPage/app/utils/dynamicAppType')
    return componentList[componentId] || null
  }

  /**
   * Check if a node needs migration
   */
  function needsMigration(node: ComponentNode): boolean {
    const schema = getSchema(node.componentId)
    if (!schema) return false
    
    return node.componentVersion < schema.version
  }

  /**
   * Get version info for a node
   */
  function getVersionInfo(node: ComponentNode) {
    const schema = getSchema(node.componentId)
    
    return {
      currentVersion: node.componentVersion,
      latestVersion: schema?.version || node.componentVersion,
      versionName: schema?.versionName || 'unknown',
      needsMigration: schema ? node.componentVersion < schema.version : false,
      versionsBehind: schema ? schema.version - node.componentVersion : 0
    }
  }

  /**
   * Find migration path from one version to another
   */
  function findMigrationPath(
    componentId: string,
    fromVersion: number,
    toVersion: number
  ): ComponentMigration[] {
    const schema = getSchema(componentId)
    if (!schema || !schema.migrations) return []

    const path: ComponentMigration[] = []
    let currentVersion = fromVersion

    // Build migration path step by step
    while (currentVersion < toVersion) {
      const nextMigration = schema.migrations.find(
        m => m.fromVersion === currentVersion
      )
      
      if (!nextMigration) {
        console.warn(
          `No migration found from version ${currentVersion} for ${componentId}`
        )
        break
      }

      path.push(nextMigration)
      currentVersion = nextMigration.toVersion
    }

    return currentVersion === toVersion ? path : []
  }

  /**
   * Migrate a single node to latest version
   */
  function migrateNode(node: ComponentNode): ComponentNode {
    const schema = getSchema(node.componentId)
    
    if (!schema) {
      console.warn(`Component schema not found: ${node.componentId}`)
      return node
    }

    // Already at latest version?
    if (node.componentVersion >= schema.version) {
      return node
    }

    const originalVersion = node.componentVersion
    const migrations = findMigrationPath(
      node.componentId,
      node.componentVersion,
      schema.version
    )

    if (migrations.length === 0) {
      console.warn(
        `No migration path from v${node.componentVersion} to v${schema.version} for ${node.componentId}`
      )
      return node
    }

    // Apply migrations in sequence
    let migratedNode = { ...node }
    
    for (const migration of migrations) {
      console.log(
        `[Migration] ${node.componentId}: v${migration.fromVersion} → v${migration.toVersion}` +
        (migration.breaking ? ' (BREAKING)' : '') +
        ` - ${migration.description}`
      )
      
      try {
        migratedNode = migration.migrate(migratedNode)
        migratedNode.componentVersion = migration.toVersion
      } catch (error) {
        console.error(
          `Migration failed for ${node.componentId} v${migration.fromVersion} → v${migration.toVersion}:`,
          error
        )
        break
      }
    }

    // Update metadata
    migratedNode.migratedAt = new Date().toISOString()
    migratedNode.migratedFrom = originalVersion

    // Recursively migrate children in slots
    if (migratedNode.slots) {
      const migratedSlots: Record<string, ComponentNode[]> = {}
      
      for (const [slotName, children] of Object.entries(migratedNode.slots)) {
        migratedSlots[slotName] = children.map(child => migrateNode(child))
      }
      
      migratedNode.slots = migratedSlots
    }

    return migratedNode
  }

  /**
   * Migrate entire page tree
   */
  function migratePage(rootNode: ComponentNode): ComponentNode {
    console.log('[Migration] Starting page migration...')
    const migratedRoot = migrateNode(rootNode)
    console.log('[Migration] Page migration complete')
    return migratedRoot
  }

  /**
   * Check if any node in tree needs migration
   */
  function pageNeedsMigration(rootNode: ComponentNode): boolean {
    if (needsMigration(rootNode)) return true

    if (rootNode.slots) {
      for (const children of Object.values(rootNode.slots)) {
        if (children.some(child => pageNeedsMigration(child))) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Get migration summary for entire page
   */
  function getPageMigrationSummary(rootNode: ComponentNode) {
    const components: Array<{
      componentId: string
      instanceId: string
      currentVersion: number
      latestVersion: number
      needsMigration: boolean
    }> = []

    function traverse(node: ComponentNode) {
      const info = getVersionInfo(node)
      components.push({
        componentId: node.componentId,
        instanceId: node.instanceId,
        currentVersion: info.currentVersion,
        latestVersion: info.latestVersion,
        needsMigration: info.needsMigration
      })

      if (node.slots) {
        for (const children of Object.values(node.slots)) {
          children.forEach(traverse)
        }
      }
    }

    traverse(rootNode)

    const needsMigrationCount = components.filter(c => c.needsMigration).length

    return {
      totalComponents: components.length,
      needsMigration: needsMigrationCount > 0,
      needsMigrationCount,
      components
    }
  }

  return {
    needsMigration,
    getVersionInfo,
    findMigrationPath,
    migrateNode,
    migratePage,
    pageNeedsMigration,
    getPageMigrationSummary
  }
}

