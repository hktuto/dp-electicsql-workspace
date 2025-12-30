# Phase 3.1: Nuxt Layers Refactoring

## Goals

- Organize codebase into feature-based Nuxt layers
- Improve maintainability and code isolation
- Establish naming conventions to avoid component conflicts
- Keep pages centralized for easy routing traceability

---

## Principles

### 1. Pages Stay in Main App
All pages remain in `/app/pages/` for easy routing traceability.

### 2. Component Prefixes
Each layer's components must use a prefix matching the layer name:
- `layers/electricSync/` → components in `electricSync/` folder → `<ElectricSyncStatus />`
- `layers/workspace/` → components in `workspace/` folder → `<WorkspaceMenu />`

### 3. Auto-Import
Nuxt automatically imports all folders with `nuxt.config.ts` in `/layers/`.

### 4. Composables Follow Layer
Each layer contains its own composables, prefixed appropriately.

---

## Current Structure

```
app/
├── components/
│   ├── common/          # Shared UI (popover, icon picker)
│   ├── company/         # Company switcher
│   ├── global/          # Page implementations (to be moved)
│   ├── user/            # User profile menu
│   ├── workspace/       # Workspace menu components
│   └── wrapper/         # Page layout wrapper
├── composables/         # All composables (to be distributed)
├── pages/               # All routes (stays here)
└── workers/             # SharedWorker (to be moved to layer)

layers/
└── dockView/            # Existing layer example
```

---

## Final Structure (Implemented)

```
app/
├── components/
│   ├── common/          # Truly shared UI only
│   │   ├── iconPicker.vue
│   │   ├── iconPickerInput.vue
│   │   ├── popoverDialog.vue
│   │   ├── menu/
│   │   └── LoadingBg/
│   ├── HomePage.vue     # Home page component
│   └── wrapper/         # Page layout
│       └── main.vue
├── composables/
│   ├── useAuth.ts       # Core auth
│   ├── useAPI.ts        # Core API
│   ├── useAppRouter.ts  # Core routing
│   └── useBreakpoint.ts # Core utility
├── pages/               # ALL routes stay here
│   ├── auth/
│   ├── company/
│   ├── dev/
│   ├── workspaces/
│   └── index.vue
└── assets/
    └── style/

layers/
├── electricSync/        # Electric SQL sync layer (core engine)
│   ├── app/
│   │   ├── composables/
│   │   │   └── useElectricSync.ts
│   │   └── workers/
│   │       └── electric-sync.worker.ts
│   └── nuxt.config.ts
│
├── company/             # Company management layer
│   ├── app/
│   │   ├── components/
│   │   │   └── company/
│   │   │       ├── Switcher.vue           # <CompanySwitcher />
│   │   │       └── Settings.global.vue    # <CompanySettings />
│   │   └── composables/
│   │       ├── useCompanyContext.ts
│   │       ├── useCompanySync.ts
│   │       └── useInviteSync.ts
│   └── nuxt.config.ts
│
├── workspace/           # Workspace management layer
│   ├── app/
│   │   ├── components/
│   │   │   └── workspace/
│   │   │       ├── List.global.vue        # <WorkspaceList />
│   │   │       ├── Detail.global.vue      # <WorkspaceDetail />
│   │   │       ├── Settings.global.vue    # <WorkspaceSettings />
│   │   │       ├── listCard.vue           # <WorkspaceListCard />
│   │   │       └── menu/
│   │   │           ├── index.vue          # <WorkspaceMenu />
│   │   │           ├── draggableList.vue
│   │   │           ├── item.vue
│   │   │           ├── itemActions.vue
│   │   │           └── labelEditor.vue
│   │   └── composables/
│   │       ├── useWorkspaceSync.ts
│   │       └── useWorkspaceMenuContext.ts
│   └── nuxt.config.ts
│
├── user/                # User management layer
│   ├── app/
│   │   ├── components/
│   │   │   └── user/
│   │   │       └── ProfileMenu.vue        # <UserProfileMenu />
│   │   └── composables/
│   │       └── useUserSync.ts
│   └── nuxt.config.ts
│
└── dockView/            # Existing layer (unchanged)
    └── ...
```

---

## Tasks

### Phase 3.1.1: Create Layer Structure
- [x] Create `layers/electricSync/` with nuxt.config.ts
- [x] Create `layers/company/` with nuxt.config.ts
- [x] Create `layers/workspace/` with nuxt.config.ts
- [x] Create `layers/user/` with nuxt.config.ts

### Phase 3.1.2: Migrate Electric Sync Layer
- [x] Move `app/composables/useElectricSync.ts` → `layers/electricSync/app/composables/`
- [x] Move `app/workers/electric-sync.worker.ts` → `layers/electricSync/app/workers/`

### Phase 3.1.3: Migrate Company Layer
- [x] Move `app/components/company/Switcher.vue` → `layers/company/app/components/company/`
- [x] Move `app/components/global/companySetting.vue` → `layers/company/app/components/company/Settings.global.vue`
- [x] Move `app/composables/useCompanyContext.ts` → `layers/company/app/composables/`
- [x] Move `app/composables/useCompanySync.ts` → `layers/company/app/composables/`
- [x] Move `app/composables/useInviteSync.ts` → `layers/company/app/composables/`
- [x] Update imports in pages

### Phase 3.1.4: Migrate Workspace Layer
- [x] Move `app/components/workspace/*` → `layers/workspace/app/components/workspace/`
- [x] Move `app/components/global/workspaceList.vue` → `layers/workspace/app/components/workspace/List.global.vue`
- [x] Move `app/components/global/workspaceDetail.vue` → `layers/workspace/app/components/workspace/Detail.global.vue`
- [x] Move `app/components/global/workspaceSetting.vue` → `layers/workspace/app/components/workspace/Settings.global.vue`
- [x] Move `app/composables/useWorkspaceMenuContext.ts` → `layers/workspace/app/composables/`
- [x] Move `app/composables/useWorkspaceSync.ts` → `layers/workspace/app/composables/`
- [x] Update imports in pages

### Phase 3.1.5: Migrate User Layer
- [x] Move `app/components/user/profileMenu.vue` → `layers/user/app/components/user/ProfileMenu.vue`
- [x] Move `app/composables/useUserSync.ts` → `layers/user/app/composables/`

### Phase 3.1.6: Cleanup
- [x] Remove empty folders from `app/components/`
- [x] Remove `app/components/global/` folder
- [x] Update cursor rules with layer conventions
- [x] Update documentation

---

## Layer Config Template

```typescript
// layers/[layer-name]/nuxt.config.ts
export default defineNuxtConfig({
  // Layer-specific configuration if needed
})
```

---

## Component Naming Convention

| Layer | Component File | Auto-Import Name |
|-------|---------------|------------------|
| `electricSync` | `electricSync/status.vue` | `<ElectricSyncStatus />` |
| `company` | `company/Switcher.vue` | `<CompanySwitcher />` |
| `company` | `company/Settings.vue` | `<CompanySettings />` |
| `workspace` | `workspace/List.vue` | `<WorkspaceList />` |
| `workspace` | `workspace/Detail.vue` | `<WorkspaceDetail />` |
| `workspace` | `workspace/Settings.vue` | `<WorkspaceSettings />` |
| `workspace` | `workspace/menu/index.vue` | `<WorkspaceMenu />` |
| `user` | `user/ProfileMenu.vue` | `<UserProfileMenu />` |

---

## Completion Criteria

- [x] All layers created with proper structure
- [x] All components migrated with correct prefixes
- [x] All composables migrated to appropriate layers
- [x] All pages updated to use new component names
- [ ] All functionality tested and working
- [x] Cursor rules updated with layer conventions
- [x] Documentation updated

---

## Status: ✅ COMPLETE (2024-12-30)

### Summary
Successfully refactored the codebase into Nuxt Layers:
- **4 new layers created**: electricSync, company, workspace, user
- **All sync composables distributed** to their respective feature layers
- **Page components renamed** with `.global.vue` suffix
- **Import patterns standardized**: `#shared/types/db` for types, `#layers/...` for layer-specific

### Key Decisions
1. **electricSync layer contains only the core engine** (`useElectricSync.ts`)
2. **Feature-specific sync composables live in their feature layers**
3. **Pages remain in `/app/pages/`** for easy routing traceability
4. **Page components use `.global.vue` suffix** instead of global folder

---

## Notes

- Pages stay in `/app/pages/` - never move to layers
- `app/components/common/` stays for truly shared UI components
- `app/components/wrapper/` stays for page layout
- Core composables (`useAuth`, `useAppRouter`, `useBreakpoint`) stay in `/app/composables/`
- Each layer is self-contained but can import from other layers

