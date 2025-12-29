---
alwaysApply: true
---

# DocPal - Project Rules

## Project Overview
DocPal is a low-code platform built with Nuxt 4 + NuxtHub that allows users to create companies, workspaces, dynamic data tables, views, dashboards, and automation workflows.

## Tech Stack
- **Frontend**: Nuxt 4, Element Plus, SCSS + CSS Variables, Nuxt Icon
- **Backend**: NuxtHub, PostgreSQL, Drizzle ORM
- **File Storage**: MinIO (S3-compatible)
- **AI**: OpenAI + Ollama (optional, self-hosted LLM)
- **Workflow Engine**: Temporal
- **Real-time**: Electric SQL with PGLite and shared worker

## UI Guidelines
- **Use Element Plus** for all UI components (buttons, forms, tables, dialogs, etc.)
- **Use Nuxt Icon** (`<Icon>`) for icons whenever possible instead of other icon libraries
- Follow Element Plus design patterns and component APIs
- Use SCSS with CSS Variables for styling (defined in `@/assets/style/`)
- **All `<el-form>` must use `label-position="top"`** for consistent form layouts
- **Use system CSS variables** from `@/assets/style/variable.scss` for colors and sizing:
  - Colors: `var(--app-primary-color)`, `var(--app-grey-*)`, `var(--app-text-color-*)`, etc.
  - Spacing: `var(--app-space-xs)`, `var(--app-space-s)`, `var(--app-space-m)`, etc.
  - Font sizes: `var(--app-font-size-s)`, `var(--app-font-size-m)`, `var(--app-font-size-l)`, etc.
  - Border radius: `var(--app-border-radius-s)`, `var(--app-border-radius-m)`, etc.
  - Shadows: `var(--app-shadow-s)`, `var(--app-shadow-m)`, `var(--app-shadow-l)`, etc.

## Project Management Structure

### Requirements Documentation
- All requirement files are stored in `docs/REQUIRMENT/`
- Naming format: `yyyyMMDD-special-name.md` (e.g., `20251229.md`)
- Reference requirements from this directory when implementing features

### Development Plans
- All development plans are stored in `docs/PLAN/`
- After each plan completion or status update, add process results/status updates to the corresponding plan file in `docs/PLAN/`
- Keep plans updated with progress, blockers, and outcomes

## Technical Constraints

### Electric SQL Limitations
- Electric SQL can only query filter "Shape" in target tables
- All permission-related columns must be added directly to tables (not joined)
- Include `workspaceId` and `companyId` in all tables that need permission filtering

### UUID Generation
- All UUIDs must be created by the application (client-side or server-side)
- **DO NOT** use PostgreSQL auto-generated UUIDs (e.g., `gen_random_uuid()`)
- This is required for easy migration and Electric SQL compatibility

### Database Schema
- Use Drizzle ORM for schema definitions
- All tables should include `createdAt` and `updatedAt` timestamps
- Use cascade deletes for related records where appropriate
- Reference the database schema in `docs/REQUIRMENT/20251229.md` for table structures

### Permissions
- Use bitwise binary numbers (bytea) to store permissions
- Permission bits: 1 = read, 10 = write, 100 = manage, 1000 = delete, etc.
- Use `userPermissionLookup` table for Electric SQL shape queries

## Code Style
- Use `<script setup lang="ts">` format for Vue components
- Prefer functional programming over classes
- Keep code simple and clean
- Use TypeScript for type safety
- Follow Nuxt 4 conventions and best practices

## Key Features to Remember
- Companies, workspaces, dynamic tables, views (Table, Kanban, Gantt, Calendar, Gallery, Tree, Map), dashboards
- Magic link invitations for users
- Workspace-based permissions with custom roles
- Dynamic table columns with extensive field types and configurations
- View configurations with filters, sorting, and view-specific settings
- Dashboard widgets in grid layout
