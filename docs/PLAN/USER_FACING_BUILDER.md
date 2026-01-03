# User-Facing Page Builder

## The Core Question

**How does a non-technical user build a page?**

They should think in terms of:
1. **What do I want to show?** (Data)
2. **How should it look?** (Layout)

That's it. No providers, no views, no technical jargon.

---

## User Mental Model

### Step 1: Choose What to Show

User sees a simple list of **blocks** they can add:

```
┌─────────────────────────────────────┐
│  Add a Block                        │
├─────────────────────────────────────┤
│  📊 Show Data                       │
│    • User List                      │
│    • Workspace List                 │
│    • Company Members                │
│    • Table Data                     │
│    • File List                      │
│                                     │
│  📝 Forms                           │
│    • Create User                    │
│    • Edit Workspace                 │
│    • Contact Form                   │
│    • Custom Form                    │
│                                     │
│  📈 Charts & Metrics                │
│    • Number Metric                  │
│    • Bar Chart                      │
│    • Line Chart                     │
│    • Pie Chart                      │
│                                     │
│  📄 Content                         │
│    • Text Block                     │
│    • Image                          │
│    • Video                          │
│    • Heading                        │
│                                     │
│  🎨 Layout                          │
│    • Columns                        │
│    • Tabs                           │
│    • Accordion                      │
│    • Card                           │
└─────────────────────────────────────┘
```

### Step 2: Configure the Block

After selecting "User List", they see simple options:

```
┌─────────────────────────────────────┐
│  User List Settings                 │
├─────────────────────────────────────┤
│  Display As:                        │
│    ○ Table                          │
│    ● Cards                          │
│    ○ List                           │
│    ○ Grid                           │
│                                     │
│  Show These Fields:                 │
│    ☑ Name                           │
│    ☑ Email                          │
│    ☑ Role                           │
│    ☐ Phone                          │
│    ☐ Department                     │
│                                     │
│  Filter By:                         │
│    Role: [All ▼]                    │
│    Status: [Active ▼]               │
│                                     │
│  Sort By:                           │
│    [Name ▼] [A→Z ▼]                 │
│                                     │
│  Actions:                           │
│    ☑ Allow editing                  │
│    ☑ Allow deleting                 │
│    ☑ Show details on click          │
└─────────────────────────────────────┘
```

### Step 3: Arrange on Page

Drag and drop blocks to arrange them:

```
┌─────────────────────────────────────────────────┐
│  Page: User Management                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  📊 User List (Cards)                     │ │
│  │  Showing: Name, Email, Role               │ │
│  │  Filter: Active users only                │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ 📈 Total Users  │  │ 📈 Active Today     │ │
│  │     1,234       │  │       89            │ │
│  └─────────────────┘  └─────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  📈 User Growth Chart                     │ │
│  │  [Line chart showing growth over time]    │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [+ Add Block]                                  │
└─────────────────────────────────────────────────┘
```

---

## Behind the Scenes (Hidden from User)

When user adds "User List" block with "Cards" display, the system generates:

```typescript
{
  id: 'block-1',
  type: 'user-list',           // What to show
  display: 'card',             // How to show it
  config: {
    fields: ['name', 'email', 'role'],
    filters: { status: 'active' },
    sort: { field: 'name', order: 'asc' },
    actions: ['edit', 'delete', 'view']
  }
}
```

The system then translates this to:
```vue
<Container type="card">
  <UserListProvider :filters="{ status: 'active' }" :sort="...">
    <CardView :fields="..." :actions="..." />
  </UserListProvider>
</Container>
```

**But the user never sees this!**

---

## Block Types (User-Facing)

### 1. Data Blocks

These show data from your workspace:

| Block Name | What It Shows | Display Options |
|------------|---------------|-----------------|
| User List | Users in your workspace | Table, Cards, List, Grid |
| Workspace List | Your workspaces | Cards, List, Grid |
| Company Members | People in company | Table, Cards, List |
| Table Data | Data from any table | Table, Cards, Kanban, Calendar, Gallery |
| File List | Files and documents | Grid, List, Table |

**User thinks:** "I want to show users" → Picks "User List" → Picks "Cards"

### 2. Form Blocks

These let users input data:

| Block Name | What It Does | Fields |
|------------|--------------|--------|
| Create User | Add new user | Auto-generated from user schema |
| Edit Record | Edit existing data | Auto-generated from table schema |
| Contact Form | Simple contact form | Name, Email, Message |
| Custom Form | Build your own | Choose fields manually |

**User thinks:** "I want a form to add users" → Picks "Create User" → Done!

### 3. Metric Blocks

These show numbers and charts:

| Block Name | What It Shows | Display Options |
|------------|---------------|-----------------|
| Number Metric | Single number | Plain, with trend, with icon |
| Bar Chart | Compare categories | Vertical, Horizontal, Stacked |
| Line Chart | Show trends over time | Single line, Multiple lines, Area |
| Pie Chart | Show proportions | Pie, Donut |

**User thinks:** "I want to show total users" → Picks "Number Metric" → Selects "User List" → Picks "Count"

### 4. Content Blocks

These show static content:

| Block Name | What It Shows |
|------------|---------------|
| Text | Formatted text (rich text editor) |
| Heading | Page title or section heading |
| Image | Single image or gallery |
| Video | Embedded video |
| Divider | Visual separator |

**User thinks:** "I want a title" → Picks "Heading" → Types "User Management"

### 5. Layout Blocks

These organize other blocks:

| Block Name | What It Does |
|------------|--------------|
| Columns | Split into 2-4 columns |
| Tabs | Multiple tabs with different content |
| Accordion | Collapsible sections |
| Card | Grouped content with border |

**User thinks:** "I want two columns" → Picks "Columns" → Drags blocks into each column

---

## The Builder Interface

### Visual Page Builder

```
┌─────────────────────────────────────────────────────────────┐
│  ☰ Blocks    📄 User Management Page    ⚙️ Settings  👁️ Preview │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ 📊 Data  │  ┌────────────────────────────────────────────┐ │
│ • Users  │  │ [Drag blocks here to build your page]      │ │
│ • Works  │  │                                            │ │
│ • Tables │  │                                            │ │
│          │  │                                            │ │
│ 📝 Forms │  │                                            │ │
│ • Create │  │                                            │ │
│ • Edit   │  │                                            │ │
│          │  │                                            │ │
│ 📈 Charts│  │                                            │ │
│ • Metric │  │                                            │ │
│ • Bar    │  │                                            │ │
│ • Line   │  │                                            │ │
│          │  │                                            │ │
│ 📄 Content│ │                                            │ │
│ • Text   │  │                                            │ │
│ • Image  │  │                                            │ │
│          │  │                                            │ │
│ 🎨 Layout│  │                                            │ │
│ • Columns│  │                                            │ │
│ • Tabs   │  │                                            │ │
│ • Card   │  │                                            │ │
│          │  └────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────┘
```

### After Adding Blocks

```
┌─────────────────────────────────────────────────────────────┐
│  ☰ Blocks    📄 User Management Page    ⚙️ Settings  👁️ Preview │
├──────────┬──────────────────────────────────────────────────┤
│          │  ┌────────────────────────────────────────────┐ │
│ 📊 Data  │  │ 📊 User List                        [⚙️][×]│ │
│          │  │ Showing 45 users as cards                  │ │
│ [Search] │  │ [Card] [Card] [Card] [Card]                │ │
│          │  └────────────────────────────────────────────┘ │
│          │                                                  │
│          │  ┌──────────────┐  ┌──────────────────────────┐ │
│          │  │ 📈 Metric [⚙️]│  │ 📈 Chart            [⚙️][×]│ │
│          │  │ Total: 1,234 │  │ [Line chart preview]     │ │
│          │  └──────────────┘  └──────────────────────────┘ │
│          │                                                  │
│          │  [+ Add Block]                                   │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

Click [⚙️] to configure, [×] to delete, drag to reorder.

---

## Configuration Panels

### Simple, Visual Configuration

When user clicks [⚙️] on "User List" block:

```
┌─────────────────────────────────────┐
│  Configure: User List               │
├─────────────────────────────────────┤
│                                     │
│  Display Style                      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │📊  │ │📇  │ │▦▦  │ │▦▦▦ │      │
│  │Tbl │ │List│ │Card│ │Grid│      │
│  └────┘ └────┘ └────┘ └────┘      │
│           ✓                         │
│                                     │
│  Show These Fields                  │
│  ┌─────────────────────────────┐   │
│  │ ☑ Name                      │   │
│  │ ☑ Email                     │   │
│  │ ☑ Role                      │   │
│  │ ☐ Phone                     │   │
│  │ ☐ Department                │   │
│  │ ☐ Created Date              │   │
│  └─────────────────────────────┘   │
│                                     │
│  Filter                             │
│  Role:     [All ▼]                  │
│  Status:   [Active ▼]               │
│  + Add filter                       │
│                                     │
│  Sort                               │
│  [Name ▼] [A→Z ▼]                   │
│                                     │
│  Actions                            │
│  ☑ Let users edit                   │
│  ☑ Let users delete                 │
│  ☑ Show details when clicked        │
│                                     │
│  [Cancel]  [Apply]                  │
└─────────────────────────────────────┘
```

**No code, no technical terms, just simple choices!**

---

## AI-Assisted Building

### Natural Language Input

```
┌─────────────────────────────────────────────────┐
│  Tell me what you want to build:               │
│  ┌───────────────────────────────────────────┐ │
│  │ Show me all active users in a table with  │ │
│  │ their name, email, and role               │ │
│  └───────────────────────────────────────────┘ │
│                                [Build It]       │
└─────────────────────────────────────────────────┘

AI creates:
✓ User List block
✓ Display: Table
✓ Fields: Name, Email, Role
✓ Filter: Status = Active
```

### AI Suggestions

```
┌─────────────────────────────────────┐
│  💡 Suggestions                     │
├─────────────────────────────────────┤
│  You have a User List. Add:        │
│                                     │
│  • "Total Users" metric             │
│  • "Create User" button             │
│  • "User Growth" chart              │
│                                     │
│  [Add All] [Dismiss]                │
└─────────────────────────────────────┘
```

---

## Templates

### Pre-built Pages

User can start from templates:

```
┌─────────────────────────────────────────────────┐
│  Choose a Template                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  📊      │  │  📝      │  │  📈      │     │
│  │  User    │  │  Contact │  │  Dash    │     │
│  │  List    │  │  Form    │  │  board   │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  🛒      │  │  📅      │  │  📁      │     │
│  │  Product │  │  Calendar│  │  File    │     │
│  │  Catalog │  │  Events  │  │  Manager │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                 │
│  [Start from Scratch]                           │
└─────────────────────────────────────────────────┘
```

Click a template, then customize it!

---

## The Key Insight

### For Developers (Internal)
```
Container → Provider → View
```
This is the **architecture** that makes everything work.

### For Users (External)
```
Block → Configure → Done
```
This is the **interface** they interact with.

---

## Revised Component Taxonomy (User-Facing)

### Block Categories

```
1. Data Blocks
   ├── User List
   ├── Workspace List
   ├── Company Members
   ├── Table Data
   ├── File List
   └── Custom Query

2. Form Blocks
   ├── Create User
   ├── Edit Record
   ├── Contact Form
   ├── Login Form
   └── Custom Form

3. Metric Blocks
   ├── Number
   ├── Bar Chart
   ├── Line Chart
   ├── Pie Chart
   ├── Area Chart
   └── Gauge

4. Content Blocks
   ├── Text
   ├── Heading
   ├── Image
   ├── Video
   ├── Button
   ├── Link
   └── Divider

5. Layout Blocks
   ├── Columns (2, 3, 4)
   ├── Tabs
   ├── Accordion
   ├── Card
   └── Sidebar
```

### Block Properties (User-Facing)

Each block has simple properties:

```typescript
type Block = {
  id: string
  type: 'user-list' | 'workspace-list' | 'metric' | 'chart' | ...
  
  // Simple, user-friendly config
  config: {
    // Display
    display?: 'table' | 'card' | 'list' | 'grid' | 'kanban' | 'calendar'
    
    // Data
    fields?: string[]           // Which fields to show
    filters?: SimpleFilter[]    // Simple key-value filters
    sort?: { field: string, order: 'asc' | 'desc' }
    limit?: number
    
    // Behavior
    actions?: ('view' | 'edit' | 'delete' | 'create')[]
    clickAction?: 'view-details' | 'edit' | 'custom'
    
    // Style (simple presets)
    style?: 'default' | 'compact' | 'comfortable' | 'spacious'
    color?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  }
  
  // Layout
  layout?: {
    width?: 'full' | 'half' | 'third' | 'quarter'
    height?: 'auto' | 'small' | 'medium' | 'large'
  }
}

type SimpleFilter = {
  field: string
  operator: 'equals' | 'contains' | 'greater' | 'less'
  value: any
}
```

---

## Implementation Strategy

### Layer 1: Technical (Hidden)
- Containers
- Providers
- Views
- Component registry

### Layer 2: Block System (Hidden)
- Block → Component mapping
- Config → Props translation
- Validation and defaults

### Layer 3: User Interface (Visible)
- Visual block picker
- Drag-and-drop builder
- Simple configuration panels
- Templates and AI assistance

**Users only see Layer 3!**

---

## Success Metrics

A non-technical user should be able to:

1. ✅ Build a user list page in **under 2 minutes**
2. ✅ Add a chart showing user growth in **under 1 minute**
3. ✅ Create a contact form in **under 3 minutes**
4. ✅ Customize colors and layout in **under 1 minute**
5. ✅ Publish their page in **1 click**

**Without:**
- Writing any code
- Understanding providers/views
- Reading documentation
- Asking for help

---

## Conclusion

### What We Build (Developer View)
```
Container → Provider → View
```
Complex, powerful, flexible architecture.

### What Users See (User View)
```
Pick Block → Configure → Done
```
Simple, visual, intuitive interface.

**The architecture serves the interface, not the other way around!**

The Provider-First architecture is the **engine** that powers the simple block-based **interface**.

