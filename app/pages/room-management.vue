<template>
  <div class="page-container">
    <t-card title="场地管理" :bordered="false" class="content-card">
      <template #actions>
        <div class="header-actions">
          <t-input-adornment>
            <t-input v-model="searchQuery" placeholder="搜索场地名称/地点" clearable />
            <template #append>
              <t-button theme="primary" @click="handleAdd">
                <template #icon><t-icon name="add" /></template>
                新增场地
              </t-button>
            </template>
          </t-input-adornment>
        </div>
      </template>

      <t-table
        row-key="id"
        :data="filteredRooms"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        @page-change="onPageChange"
      >
        <template #status="{ row }">
          <t-tag :theme="row.status ? 'success' : 'danger'" variant="light">
            {{ row.status ? '可用' : '维护中' }}
          </t-tag>
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" hover="color" @click="handleEdit(row)">编辑</t-link>
            <t-popconfirm content="确认删除该场地吗？" @confirm="handleDelete(row)">
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
      width="min(500px, 95%)"
      @confirm="handleSubmit"
    >
      <t-form ref="formRef" :data="formData" :rules="rules" label-align="top" @submit="handleSubmit">
        <t-form-item label="场地名称" name="name">
          <t-input v-model="formData.name" placeholder="请输入场地名称" />
        </t-form-item>
        <t-form-item label="容纳人数" name="capacity">
          <t-input-number v-model="formData.capacity" :min="0" style="width: 100%" />
        </t-form-item>
        <t-form-item label="地点" name="location">
          <t-input v-model="formData.location" placeholder="请输入场地地点" />
        </t-form-item>
        <t-form-item label="描述" name="description">
          <t-textarea v-model="formData.description" placeholder="请输入场地描述" />
        </t-form-item>
        <t-form-item label="状态" name="status">
          <t-switch v-model="formData.status" :label="['可用', '维护中']" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { MessagePlugin, type PrimaryTableCol, type FormRules } from 'tdesign-vue-next'

const loading = ref(false)
const rooms = ref<any[]>([])
const searchQuery = ref('')
const dialogVisible = ref(false)
const submitLoading = ref(false)
const isEdit = ref(false)
const formRef = ref<any>(null)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const formData = reactive({
  id: null as number | null,
  name: '',
  capacity: 0,
  location: '',
  description: '',
  status: true
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入场地名称', trigger: 'blur' }],
}

const dialogTitle = computed(() => isEdit.value ? '编辑场地' : '新增场地')

const fetchRooms = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/rooms')
    rooms.value = data as any[]
    pagination.total = rooms.value.length
  } catch (error: any) {
    MessagePlugin.error('获取场地列表失败：' + error.message)
  } finally {
    loading.value = false
  }
}

const filteredRooms = computed(() => {
  if (!searchQuery.value) return rooms.value
  const q = searchQuery.value.toLowerCase()
  return rooms.value.filter(room => 
    room.name.toLowerCase().includes(q) || 
    (room.location && room.location.toLowerCase().includes(q))
  )
})

const onPageChange = (pageInfo: any) => {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(formData, {
    id: null,
    name: '',
    capacity: 0,
    location: '',
    description: '',
    status: true
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    capacity: row.capacity || 0,
    location: row.location || '',
    description: row.description || '',
    status: row.status
  })
  dialogVisible.value = true
}

const handleDelete = async (row: any) => {
  try {
    await $fetch('/api/rooms/delete', {
      method: 'POST',
      body: { id: row.id }
    })
    MessagePlugin.success('删除成功')
    fetchRooms()
  } catch (error: any) {
    MessagePlugin.error('删除失败：' + (error.data?.statusMessage || error.message))
  }
}

const handleSubmit = async () => {
  const validateResult = await formRef.value?.validate()
  if (validateResult !== true) return

  submitLoading.value = true
  try {
    const url = isEdit.value ? '/api/rooms/update' : '/api/rooms/create'
    await $fetch(url, {
      method: 'POST',
      body: formData
    })
    MessagePlugin.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    fetchRooms()
  } catch (error: any) {
    MessagePlugin.error('操作失败：' + (error.data?.statusMessage || error.message))
  } finally {
    submitLoading.value = false
  }
}

const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 70 },
  { colKey: 'name', title: '场地名称', width: 150 },
  { colKey: 'capacity', title: '容纳人数', width: 100 },
  { colKey: 'location', title: '地点', width: 150 },
  { colKey: 'description', title: '描述', ellipsis: true },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'operation', title: '操作', width: 120, fixed: 'right' },
]

onMounted(() => {
  fetchRooms()
})
</script>

<style scoped>
.page-container {
  padding: 24px;
}
.header-actions {
  display: flex;
  gap: 16px;
}
</style>
