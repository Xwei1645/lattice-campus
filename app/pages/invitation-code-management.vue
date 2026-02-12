<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">邀请码管理</h2>
      <div class="header-actions">
        <t-button theme="primary" @click="handleAdd">
          <template #icon><AddIcon /></template>
          生成邀请码
        </t-button>
      </div>
    </div>

    <t-card :bordered="false" class="content-card">
      <t-skeleton :loading="loading" :row-col="tableSkeleton" animation="gradient">
        <t-table
          row-key="id"
          :data="codes"
          :columns="columns"
          :loading="loading"
          :hover="true"
          :scroll="{ type: 'auto', x: 800 }"
          table-layout="fixed"
        >
          <template #organization="{ row }">
            {{ row.organization?.name || '所有组织' }}
          </template>
          <template #expiresAt="{ row }">
            {{ row.expiresAt ? formatDateTime(row.expiresAt) : '永不过期' }}
          </template>
          <template #usage="{ row }">
            {{ row.usedCount }} / {{ row.maxUses }}
          </template>
          <template #createTime="{ row }">
            {{ formatDateTime(row.createTime) }}
          </template>
          <template #role="{ row }">
            <t-tag :theme="getRoleTheme(row.role)" variant="light-outline">
              {{ getRoleLabel(row.role) }}
            </t-tag>
          </template>
          <template #operation="{ row }">
            <t-popconfirm content="确认删除该邀请码吗？" @confirm="handleDelete(row)">
              <t-link theme="danger" hover="color">删除</t-link>
            </t-popconfirm>
          </template>
        </t-table>
      </t-skeleton>
    </t-card>

    <!-- Generate Dialog -->
    <t-dialog
      v-model:visible="dialogVisible"
      header="批量生成邀请码"
      :confirm-btn="{ content: '生成', loading: submitLoading }"
      width="min(500px, 95%)"
      @confirm="handleSubmit"
    >
      <t-form ref="formRef" :data="formData" :rules="rules" @submit="handleSubmit">
        <t-form-item label="生成数量" name="count">
          <t-input-number v-model="formData.count" :min="1" :max="100" />
        </t-form-item>
        <t-form-item label="默认角色" name="role">
          <t-select v-model="formData.role">
            <t-option label="普通用户" value="user" />
            <t-option label="管理员" value="admin" />
          </t-select>
        </t-form-item>
        <t-form-item label="所属组织" name="organizationId">
          <t-select
            v-model="formData.organizationId"
            placeholder="请选择组织（可选）"
            :options="organizationOptions"
            filterable
            clearable
          />
        </t-form-item>
        <t-form-item label="过期时间" name="expiresAt">
          <t-date-picker v-model="formData.expiresAt" enable-time-picker placeholder="请选择过期时间（可选）" />
        </t-form-item>
        <t-form-item label="最大使用次数" name="maxUses">
          <t-input-number v-model="formData.maxUses" :min="1" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { AddIcon } from 'tdesign-icons-vue-next';
import type { PrimaryTableCol, FormRules } from 'tdesign-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'

useHead({ title: '邀请码管理' })

const loading = ref(false)
const codes = ref<any[]>([])
const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref<any>(null)
const organizations = ref<any[]>([])

const columns: PrimaryTableCol[] = [
  { colKey: 'code', title: '邀请码', width: 120 },
  { colKey: 'role', title: '赋予角色', width: 100 },
  { colKey: 'organization', title: '所属组织', width: 150 },
  { colKey: 'expiresAt', title: '过期时间', width: 180 },
  { colKey: 'usage', title: '使用情况', width: 100 },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 120, fixed: 'right' }
]

// 骨架屏配置
const tableSkeleton = Array(6).fill([
  { width: '120px' },
  { width: '100px' },
  { width: '150px' },
  { width: '180px' },
  { width: '100px' },
  { width: '180px' },
  { width: '100px' },
]);

const formData = ref({
  count: 1,
  role: 'user',
  organizationId: undefined as number | undefined,
  expiresAt: '',
  maxUses: 1
})

const rules: FormRules = {
  count: [{ required: true, message: '数量必填', trigger: 'blur' }],
  role: [{ required: true, message: '角色必填', trigger: 'blur' }]
}

const organizationOptions = computed(() => 
  organizations.value.map(org => ({ label: org.name, value: org.id }))
)

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

const getRoleLabel = (role: string) => {
  const map: any = {
    'super_admin': '超级管理员',
    'admin': '管理员',
    'user': '普通用户'
  }
  return map[role] || role
}

const getRoleTheme = (role: string): "default" | "primary" | "warning" | "danger" | "success" => {
  const map: any = {
    'super_admin': 'danger',
    'admin': 'warning',
    'user': 'primary'
  }
  return map[role] || 'default'
}

const fetchCodes = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/invitation-codes')
    codes.value = res.data || []
  } catch (error: any) {
    MessagePlugin.error('获取列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const fetchOrganizations = async () => {
  try {
    const res: any = await $fetch('/api/organizations')
    organizations.value = res.data || []
  } catch (error: any) {
    console.error('获取组织失败', error)
  }
}

const handleAdd = () => {
  formData.value = {
    count: 1,
    role: 'user',
    organizationId: undefined,
    expiresAt: '',
    maxUses: 1
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const validateResult = await formRef.value.validate()
  if (validateResult !== true) return

  submitLoading.value = true
  try {
    await $fetch('/api/invitation-codes/create', {
      method: 'POST',
      body: formData.value
    })
    MessagePlugin.success('生成成功')
    dialogVisible.value = false
    fetchCodes()
  } catch (error: any) {
    MessagePlugin.error('生成失败: ' + (error.data?.statusMessage || error.message))
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (row: any) => {
  try {
    await $fetch('/api/invitation-codes/delete', {
      method: 'POST',
      body: { id: row.id }
    })
    MessagePlugin.success('删除成功')
    fetchCodes()
  } catch (error: any) {
    MessagePlugin.error('删除失败: ' + (error.data?.statusMessage || error.message))
  }
}

onMounted(() => {
  fetchCodes()
  fetchOrganizations()
})
</script>

<style scoped>
/* 表格横向滚动 */
:deep(.t-table__content) {
    overflow-x: auto;
}

/* 移动端适配 */
@media (max-width: 767px) {
    .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }

    .header-actions .t-button {
        width: 100%;
    }

    :deep(.t-table) {
        font-size: 13px;
    }

    :deep(.t-table th),
    :deep(.t-table td) {
        padding: 10px 12px !important;
    }

    :deep(.t-form-item) {
        margin-bottom: 16px;
    }
}
</style>
