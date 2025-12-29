<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const companySync = useCompanySync()
const inviteSync = useInviteSync()

const slug = computed(() => route.params.slug as string)

// Company type from sync
interface Company {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  created_at: string
  updated_at: string
}

interface Member {
  id: string
  role: string
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
    avatar: string | null
  }
}

interface Invite {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
  invitedBy: {
    id: string
    name: string | null
    email: string
  }
}

const company = ref<Company | null>(null)
const members = ref<Member[]>([])
const invites = ref<Invite[]>([])
const loading = ref(true)
const saving = ref(false)
const activeTab = ref('general')

// Form data
const form = reactive({
  name: '',
  description: '',
})

// Invite form
const inviteForm = reactive({
  email: '',
  role: 'member',
})
const inviteDialogVisible = ref(false)
const sendingInvite = ref(false)

// Check if current user can manage
const canManage = computed(() => {
  if (user.value?.isSuperAdmin) return true
  const membership = members.value.find((m) => m.user.id === user.value?.id)
  return membership && ['owner', 'admin'].includes(membership.role)
})

const isOwner = computed(() => {
  if (user.value?.isSuperAdmin) return true
  const membership = members.value.find((m) => m.user.id === user.value?.id)
  return membership?.role === 'owner'
})

// Load company data from local PGLite (synced via Electric SQL)
async function loadCompany() {
  loading.value = true
  try {
    // Start sync if not already syncing
    await companySync.startSync()
    await companySync.load()
    
    // Find company by slug in local data
    const foundCompany = await companySync.findCompanyBySlug(slug.value)
    if (foundCompany) {
      company.value = foundCompany as Company
      form.name = foundCompany.name
      form.description = foundCompany.description || ''
    } else {
      ElMessage.error('Company not found')
      router.push('/')
    }
  } catch (error) {
    ElMessage.error('Failed to load company')
    router.push('/')
  } finally {
    loading.value = false
  }
}

async function loadMembers() {
  try {
    const response = await $fetch<{ members: Member[] }>(`/api/companies/${slug.value}/members`)
    members.value = response.members || []
  } catch (error) {
    console.error('Failed to load members:', error)
  }
}

// Load invites from local PGLite (synced via Electric SQL, admin-only)
async function loadInvites() {
  if (!canManage.value || !company.value) return
  try {
    // Start sync if not already syncing
    await inviteSync.startSync()
    
    // Get invites for this company from local data
    const localInvites = await inviteSync.getInvitesForCompany(company.value.id)
    
    // Map to display format (local data uses snake_case)
    invites.value = localInvites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
      invitedBy: { id: inv.invited_by, name: null, email: '' }, // User details need API
    }))
  } catch (error) {
    console.error('Failed to load invites:', error)
  }
}

// Save company settings
async function saveSettings() {
  if (!form.name) {
    ElMessage.warning('Company name is required')
    return
  }

  saving.value = true
  try {
    await $fetch(`/api/companies/${slug.value}`, {
      method: 'PUT',
      body: {
        name: form.name,
        description: form.description || null,
      },
    })
    ElMessage.success('Settings saved')
    await loadCompany()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

// Send invite
async function sendInvite() {
  if (!inviteForm.email) {
    ElMessage.warning('Email is required')
    return
  }

  sendingInvite.value = true
  try {
    const response = await $fetch<{ invite: { inviteLink: string } }>(`/api/companies/${slug.value}/invites`, {
      method: 'POST',
      body: {
        email: inviteForm.email,
        role: inviteForm.role,
      },
    })
    ElMessage.success(`Invite sent! Link: ${response.invite.inviteLink}`)
    inviteDialogVisible.value = false
    inviteForm.email = ''
    inviteForm.role = 'member'
    await loadInvites()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Failed to send invite')
  } finally {
    sendingInvite.value = false
  }
}

// Cancel invite
async function cancelInvite(inviteId: string) {
  try {
    await $fetch(`/api/companies/${slug.value}/invites/${inviteId}`, {
      method: 'DELETE',
    })
    ElMessage.success('Invite cancelled')
    await loadInvites()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Failed to cancel invite')
  }
}

// Remove member
async function removeMember(memberId: string) {
  try {
    await ElMessageBox.confirm('Are you sure you want to remove this member?', 'Confirm', {
      type: 'warning',
    })
    await $fetch(`/api/companies/${slug.value}/members/${memberId}`, {
      method: 'DELETE',
    })
    ElMessage.success('Member removed')
    await loadMembers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.data?.message || 'Failed to remove member')
    }
  }
}

// Load data on mount
onMounted(async () => {
  await loadCompany()
  await loadMembers()
  await loadInvites()
})
</script>

<template>
  <div class="company-settings">
    <div v-if="loading" class="loading">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
    </div>

    <template v-else-if="company">
      <div class="header">
        <el-button text @click="router.push('/')">
          <el-icon><ArrowLeft /></el-icon>
          Back
        </el-button>
        <h1>{{ company.name }}</h1>
      </div>

      <el-tabs v-model="activeTab" class="settings-tabs">
        <!-- General Settings -->
        <el-tab-pane label="General" name="general">
          <el-form label-position="top" :disabled="!canManage">
            <el-form-item label="Company Name">
              <el-input v-model="form.name" placeholder="Enter company name" />
            </el-form-item>

            <el-form-item label="Description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                placeholder="Enter company description"
              />
            </el-form-item>

            <el-form-item v-if="canManage">
              <el-button type="primary" :loading="saving" @click="saveSettings">
                Save Changes
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Members -->
        <el-tab-pane label="Members" name="members">
          <div class="tab-header">
            <h3>Team Members</h3>
            <el-button v-if="canManage" type="primary" @click="inviteDialogVisible = true">
              Invite Member
            </el-button>
          </div>

          <el-table :data="members" style="width: 100%">
            <el-table-column label="Member" min-width="200">
              <template #default="{ row }">
                <div class="member-cell">
                  <el-avatar :size="32">
                    {{ row.user.name?.charAt(0) || row.user.email.charAt(0).toUpperCase() }}
                  </el-avatar>
                  <div>
                    <div class="member-name">{{ row.user.name || row.user.email }}</div>
                    <div class="member-email">{{ row.user.email }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="role" label="Role" width="120">
              <template #default="{ row }">
                <el-tag :type="row.role === 'owner' ? 'danger' : row.role === 'admin' ? 'warning' : 'info'">
                  {{ row.role }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="Actions" width="120" v-if="canManage">
              <template #default="{ row }">
                <el-button
                  v-if="row.role !== 'owner' && row.user.id !== user?.id"
                  type="danger"
                  text
                  size="small"
                  @click="removeMember(row.id)"
                >
                  Remove
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- Pending Invites -->
          <template v-if="canManage && invites.length > 0">
            <h4 class="invites-title">Pending Invites</h4>
            <el-table :data="invites" style="width: 100%">
              <el-table-column prop="email" label="Email" />
              <el-table-column prop="role" label="Role" width="100">
                <template #default="{ row }">
                  <el-tag type="info">{{ row.role }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="Expires" width="150">
                <template #default="{ row }">
                  {{ new Date(row.expiresAt).toLocaleDateString() }}
                </template>
              </el-table-column>
              <el-table-column label="Actions" width="100">
                <template #default="{ row }">
                  <el-button type="danger" text size="small" @click="cancelInvite(row.id)">
                    Cancel
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-tab-pane>

        <!-- Danger Zone -->
        <el-tab-pane v-if="isOwner" label="Danger Zone" name="danger">
          <el-alert type="error" :closable="false" class="danger-alert">
            <template #title>Delete Company</template>
            <p>Once you delete a company, there is no going back. Please be certain.</p>
            <el-button type="danger" plain>Delete Company</el-button>
          </el-alert>
        </el-tab-pane>
      </el-tabs>
    </template>

    <!-- Invite Dialog -->
    <el-dialog v-model="inviteDialogVisible" title="Invite Member" width="400px">
      <el-form label-position="top">
        <el-form-item label="Email">
          <el-input v-model="inviteForm.email" placeholder="Enter email address" />
        </el-form-item>
        <el-form-item label="Role">
          <el-select v-model="inviteForm.role" style="width: 100%">
            <el-option label="Member" value="member" />
            <el-option label="Admin" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inviteDialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="sendingInvite" @click="sendInvite">
          Send Invite
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.company-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--app-space-l);
}

.loading {
  display: flex;
  justify-content: center;
  padding: var(--app-space-xl);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  margin-bottom: var(--app-space-l);

  h1 {
    margin: 0;
    font-size: var(--app-font-size-xl);
  }
}

.settings-tabs {
  :deep(.el-tabs__content) {
    padding-top: var(--app-space-m);
  }
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--app-space-m);

  h3 {
    margin: 0;
  }
}

.member-cell {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
}

.member-name {
  font-weight: 500;
}

.member-email {
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);
}

.invites-title {
  margin: var(--app-space-l) 0 var(--app-space-m);
  color: var(--app-text-color-secondary);
}

.danger-alert {
  :deep(.el-alert__content) {
    p {
      margin: var(--app-space-s) 0;
    }
  }
}
</style>

