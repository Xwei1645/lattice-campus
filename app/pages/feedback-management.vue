<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">反馈管理</h2>
    </div>

    <t-card :bordered="false" class="content-card">
      <t-table
        row-key="id"
        :data="feedbacks"
        :columns="columns"
        :loading="loading"
        :hover="true"
        :scroll="{ type: 'auto', x: 800 }"
        table-layout="fixed"
      >
        <template #user="{ row }">
          {{ row.user?.name }} ({{ row.user?.account }})
        </template>
        <template #type="{ row }">
          <t-tag :theme="getTypeTheme(row.type)" variant="light-outline">
            {{ getTypeText(row.type) }}
          </t-tag>
        </template>
        <template #status="{ row }">
          <t-tag :theme="row.status === 'resolved' ? 'success' : 'warning'" variant="light">
            {{ row.status === 'resolved' ? '已处理' : '处理中' }}
          </t-tag>
        </template>
        <template #createTime="{ row }">
          {{ formatDateTime(row.createTime) }}
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" hover="color" @click="handleReply(row)">回复</t-link>
            <t-popconfirm content="确认删除该反馈吗？" @confirm="handleDelete(row)">
              <t-link theme="danger" hover="color">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- Reply Dialog -->
    <t-dialog
      v-model:visible="dialogVisible"
      header="回复反馈"
      :confirm-btn="{ content: '提交回复', loading: submitLoading }"
      width="min(500px, 95%)"
      @confirm="handleSubmit"
    >
      <div v-if="selectedItem" class="feedback-detail">
        <div class="detail-item">
          <span class="detail-label">反馈人:</span>
          <span>{{ selectedItem.user?.name }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">反馈内容:</span>
          <div class="detail-text">{{ selectedItem.content }}</div>
        </div>
      </div>
      <t-form ref="formRef" :data="formData" label-align="top">
        <t-form-item label="回复内容" name="reply">
          <t-textarea 
            v-model="formData.reply" 
            placeholder="请输入回复内容..." 
            :autosize="{ minRows: 4 }"
          />
        </t-form-item>
        <t-form-item label="标记为已解决" name="isResolved">
            <t-switch v-model="formData.isResolved" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PrimaryTableCol } from 'tdesign-vue-next'

useHead({ title: '反馈管理' })

const feedbacks = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitLoading = ref(false)
const selectedItem = ref<any>(null)
const formRef = ref<any>(null)

const formData = reactive({
  reply: '',
  isResolved: true
})

const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 70 },
  { colKey: 'user', title: '反馈用户', width: 150, cell: 'user' },
  { colKey: 'type', title: '类型', width: 120, cell: 'type' },
  { colKey: 'content', title: '内容', width: 200, ellipsis: true },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'createTime', title: '提交时间', width: 180, cell: 'createTime' },
  { colKey: 'operation', title: '操作', width: 120, fixed: 'right', cell: 'operation' }
]

// 骨架屏配置
const tableSkeleton = Array(6).fill([
  { width: '70px' },
  { width: '150px' },
  { width: '100px' },
  { width: '30%' },
  { width: '100px' },
  { width: '150px' },
  { width: '120px' },
]);

const fetchFeedbacks = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/feedback')
    feedbacks.value = res.data || []
  } catch (error) {
    MessagePlugin.error('获取反馈列表失败')
  } finally {
    loading.value = false
  }
}

const handleReply = (row: any) => {
  selectedItem.value = row
  formData.reply = row.reply || ''
  formData.isResolved = row.status === 'resolved'
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!selectedItem.value) return
  
  submitLoading.value = true
  try {
    await $fetch('/api/feedback/update', {
      method: 'POST',
      body: {
        id: selectedItem.value.id,
        reply: formData.reply,
        status: formData.isResolved ? 'resolved' : 'pending'
      }
    })
    MessagePlugin.success('回复成功')
    dialogVisible.value = false
    fetchFeedbacks()
  } catch (error) {
    MessagePlugin.error('提交回复失败')
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (row: any) => {
  try {
    await $fetch('/api/feedback/delete', {
      method: 'POST',
      body: { id: row.id }
    })
    MessagePlugin.success('删除成功')
    fetchFeedbacks()
  } catch (error) {
    MessagePlugin.error('删除失败')
  }
}

const getTypeText = (type: string) => {
  const map: any = {
    bug: 'Bug 反馈',
    feature: '功能请求/修改',
    other: '其他'
  }
  return map[type] || type
}

const getTypeTheme = (type: string): "danger" | "primary" | "default" | "warning" | "success" => {
  const map: any = {
    bug: 'danger',
    feature: 'primary',
    other: 'default'
  }
  return map[type] || 'default'
}

onMounted(fetchFeedbacks)
</script>

<style scoped>
.feedback-detail {
  padding: 12px;
  background-color: var(--td-bg-color-container-hover);
  border-radius: var(--td-radius-medium);
  margin-bottom: 20px;
}
.detail-item {
  margin-bottom: 8px;
}
.detail-label {
  font-weight: bold;
  margin-right: 8px;
  color: var(--td-text-color-secondary);
}
.detail-text {
  margin-top: 4px;
  white-space: pre-wrap;
  color: var(--td-text-color-primary);
}

/* 表格横向滚动 */
:deep(.t-table__content) {
    overflow-x: auto;
}

/* 移动端适配 */
@media (max-width: 767px) {
    :deep(.t-table) {
        font-size: 13px;
    }

    :deep(.t-table th),
    :deep(.t-table td) {
        padding: 10px 12px !important;
    }

    .feedback-detail {
        padding: 10px;
    }

    .detail-item {
        margin-bottom: 6px;
    }

    :deep(.t-form-item) {
        margin-bottom: 16px;
    }
}
</style>
