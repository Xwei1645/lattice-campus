<template>
  <div class="page-container">
    <t-card title="组织管理" :bordered="false" class="content-card">
      <template #actions>
        <div class="header-actions">
          <t-input-adornment>
            <t-input v-model="searchQuery" placeholder="搜索组织名称" clearable />
            <template #append>
              <t-button theme="primary" @click="handleAdd">
                <template #icon><t-icon name="add" /></template>
                新增组织
              </t-button>
            </template>
          </t-input-adornment>
        </div>
      </template>

      <t-table
        row-key="id"
        :data="filteredOrganizations"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        @page-change="onPageChange"
      >
        <template #users="{ row }">
          <t-space break-line :size="4">
            <t-tag v-for="user in row.users" :key="user.id" variant="light-outline">
              {{ user.name }}
            </t-tag>
            <span v-if="!row.users?.length" style="color: var(--td-text-color-placeholder)">暂无成员</span>
          </t-space>
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" hover="color" @click="handleEdit(row)">编辑</t-link>
            <t-popconfirm content="确认删除该组织吗？" @confirm="handleDelete(row)">
              <t-link theme="danger" hover="color">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- Add/Edit Dialog -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      :confirm-btn="{ content: '提交', loading: submitLoading }"
      @confirm="handleSubmit"
    >
      <t-form ref="formRef" :data="formData" :rules="rules" @submit="handleSubmit">
        <t-form-item label="组织名称" name="name">
          <t-input v-model="formData.name" placeholder="请输入组织名称" />
        </t-form-item>
        <t-form-item label="描述" name="description">
          <t-textarea v-model="formData.description" placeholder="请输入组织描述" />
        </t-form-item>
        <t-form-item label="组织成员" name="userIds">
          <t-select
            v-model="formData.userIds"
            multiple
            placeholder="请选择组织成员"
            :options="userOptions"
            filterable
          />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { MessagePlugin, type PrimaryTableCol, type FormRules } from 'tdesign-vue-next'

const loading = ref(false)
const organizations = ref<any[]>([])
const searchQuery = ref('')
const dialogVisible = ref(false)
const submitLoading = ref(false)
const isEdit = ref(false)
const formRef = ref<any>(null)

const filteredOrganizations = computed(() => {
  if (!searchQuery.value) return organizations.value
  const q = searchQuery.value.toLowerCase()
  return organizations.value.filter(org => 
    org.name.toLowerCase().includes(q)
  )
})

const formData = reactive({
  id: null as number | null,
  name: '',
  description: '',
  userIds: [] as number[]
})

const userOptions = ref<any[]>([])

const rules: FormRules = {
  name: [{ required: true, message: '请输入组织名称', trigger: 'blur' }]
}

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: computed(() => filteredOrganizations.value.length)
})

const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'name', title: '组织名称', width: 200 },
  { colKey: 'users', title: '组织成员', width: 300, cell: 'users' },
  { colKey: 'description', title: '描述' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 150, fixed: 'right' }
]

const dialogTitle = computed(() => isEdit.value ? '编辑组织' : '新增组织')

// Fetch data
const fetchOrganizations = async () => {
  loading.value = true
  try {
    const [orgData, userData] = await Promise.all([
      $fetch('/api/organizations'),
      $fetch('/api/users')
    ])
    organizations.value = orgData
    userOptions.value = userData.map((u: any) => ({
      label: `${u.name} (${u.account})`,
      value: u.id
    }))
  } catch (error) {
    MessagePlugin.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

const onPageChange = (pageInfo: any) => {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
}

// Actions
const handleAdd = () => {
  isEdit.value = false
  formData.id = null
  formData.name = ''
  formData.description = ''
  formData.userIds = []
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  formData.id = row.id
  formData.name = row.name
  formData.description = row.description
  formData.userIds = row.users?.map((u: any) => u.id) || []
  dialogVisible.value = true
}

const handleDelete = async (row: any) => {
  try {
    await $fetch('/api/organizations/delete', {
      method: 'POST',
      body: { id: row.id }
    })
    MessagePlugin.success('删除成功')
    fetchOrganizations()
  } catch (error: any) {
    MessagePlugin.error(error.statusMessage || '删除失败')
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const validateResult = await formRef.value.validate()
  if (validateResult !== true) return

  submitLoading.value = true
  try {
    const url = isEdit.value ? '/api/organizations/update' : '/api/organizations/create'
    await $fetch(url, {
      method: 'POST',
      body: { ...formData }
    })
    MessagePlugin.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    fetchOrganizations()
  } catch (error: any) {
    MessagePlugin.error(error.statusMessage || (isEdit.value ? '更新失败' : '创建失败'))
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  fetchOrganizations()
})
</script>

<style scoped>
.header-actions {
  margin-bottom: 16px;
}
</style>
