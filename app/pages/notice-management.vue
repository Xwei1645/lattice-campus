<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">通知管理</h2>
      <div class="header-actions">
        <t-button theme="primary" @click="handleAdd">
          <template #icon><t-icon name="add" /></template>
          发布通知
        </t-button>
      </div>
    </div>

    <t-card :bordered="false" class="content-card">
      <t-table
        row-key="id"
        :data="notices"
        :columns="columns"
        :loading="loading"
        :hover="true"
        resizable
        table-layout="auto"
      >
        <template #type="{ row }">
          <t-tag :theme="getTypeTheme(row.type)" variant="light">
            {{ getTypeText(row.type) }}
          </t-tag>
        </template>
        <template #status="{ row }">
          <t-tag :theme="row.status === 'published' ? 'success' : 'default'" variant="light">
            {{ row.status === 'published' ? '已发布' : '草稿' }}
          </t-tag>
        </template>
        <template #showPopup="{ row }">
          <t-tag v-if="row.showPopup" theme="warning" variant="light">是</t-tag>
          <span v-else>否</span>
        </template>
        <template #createTime="{ row }">
          {{ formatDateTime(row.createTime) }}
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" hover="color" @click="handleEdit(row)">编辑</t-link>
            <t-popconfirm content="确认删除该通知吗？" @confirm="handleDelete(row)">
              <t-link theme="danger" hover="color">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- Add/Edit Dialog -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="isEdit ? '编辑通知' : '发布新通知'"
      :confirm-btn="{ content: '提交', loading: submitLoading }"
      width="min(700px, 95%)"
      @confirm="handleSubmit"
    >
      <t-form ref="formRef" :data="formData" :rules="rules" label-align="top">
        <t-form-item label="标题" name="title">
          <t-input v-model="formData.title" placeholder="请输入通知标题" />
        </t-form-item>
        <t-form-item label="类型" name="type">
          <t-radio-group v-model="formData.type" variant="default-filled">
            <t-radio-button value="info">普通</t-radio-button>
            <t-radio-button value="success">通知</t-radio-button>
            <t-radio-button value="warning">重要</t-radio-button>
            <t-radio-button value="danger">紧急</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="内容" name="content">
          <t-textarea 
            v-model="formData.content" 
            placeholder="请输入通知内容，支持换行..." 
            :autosize="{ minRows: 6, maxRows: 12 }"
          />
        </t-form-item>
        <t-form-item label="发布状态" name="status">
          <t-switch v-model="formData.status" :label="['已发布', '草稿']" :custom-value="['published', 'draft']" />
        </t-form-item>
        <t-form-item label="弹窗提醒" name="showPopup">
          <t-switch v-model="formData.showPopup" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import type { PrimaryTableCol, FormRules } from 'tdesign-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'
import { formatDateTime } from '~/utils/format'

useHead({ title: '通知管理' })

const notices = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitLoading = ref(false)
const isEdit = ref(false)
const formRef = ref<any>(null)

const formData = reactive({
  id: null as number | null,
  title: '',
  content: '',
  type: 'info',
  status: 'published',
  showPopup: false
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 70 },
  { colKey: 'title', title: '标题', ellipsis: true },
  { colKey: 'type', title: '类型', cell: 'type', width: 100 },
  { colKey: 'showPopup', title: '弹窗提醒', cell: 'showPopup', width: 100 },
  { colKey: 'status', title: '状态', cell: 'status', width: 100 },
  { colKey: 'creator.name', title: '发布者', width: 120 },
  { colKey: 'createTime', title: '发布时间', cell: 'createTime', width: 180 },
  { colKey: 'operation', title: '操作', cell: 'operation', width: 120 }
]

const fetchNotices = async () => {
  loading.value = true
  try {
    notices.value = await ($fetch as any)('/api/notices', { query: { status: '' } })
  } catch (error) {
    MessagePlugin.error('获取通知列表失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(formData, {
    id: null,
    title: '',
    content: '',
    type: 'info',
    status: 'published',
    showPopup: false
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    status: row.status,
    showPopup: !!row.showPopup
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const validateResult = await formRef.value?.validate()
  if (validateResult !== true) return

  submitLoading.value = true
  try {
    const url = isEdit.value ? '/api/notices/update' : '/api/notices/create'
    await $fetch(url, {
      method: 'POST',
      body: formData
    })
    MessagePlugin.success(isEdit.value ? '修改成功' : '发布成功')
    dialogVisible.value = false
    fetchNotices()
  } catch (error: any) {
    MessagePlugin.error(error.statusMessage || '提交失败')
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (row: any) => {
  try {
    await $fetch('/api/notices/delete', {
      method: 'POST',
      body: { id: row.id }
    })
    MessagePlugin.success('删除成功')
    fetchNotices()
  } catch (error) {
    MessagePlugin.error('删除失败')
  }
}

const getTypeText = (type: string) => {
  const map: any = {
    info: '普通',
    success: '通知',
    warning: '重要',
    danger: '紧急'
  }
  return map[type] || type
}

const getTypeTheme = (type: string): "danger" | "primary" | "default" | "warning" | "success" => {
  const map: any = {
    info: 'primary',
    success: 'success',
    warning: 'warning',
    danger: 'danger'
  }
  return map[type] || 'default'
}

onMounted(fetchNotices)
</script>
