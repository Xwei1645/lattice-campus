<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">意见反馈</h2>
      <div class="header-actions">
        <t-button theme="primary" @click="dialogVisible = true">
          <template #icon><AddIcon /></template>
          提交反馈
        </t-button>
      </div>
    </div>

    <t-card :bordered="false" class="content-card">
      <t-skeleton :loading="loading" :row-col="listSkeleton" animation="gradient">
        <div v-if="feedbacks.length === 0" class="empty-container">
          <InfoCircleIcon size="48px" style="color: var(--td-text-color-placeholder)" />
          <p>暂无反馈记录，您的意见对我们很重要</p>
        </div>
        
        <t-list v-else :split="true">
          <t-list-item v-for="item in feedbacks" :key="item.id">
            <template #content>
              <div class="feedback-item">
                <div class="feedback-header">
                  <t-tag :theme="getTypeTheme(item.type)" variant="light-outline" size="small">
                    {{ getTypeText(item.type) }}
                  </t-tag>
                  <span class="feedback-time">{{ formatDateTime(item.createTime) }}</span>
                  <t-tag :theme="item.status === 'resolved' ? 'success' : 'warning'" variant="light" size="small">
                    {{ item.status === 'resolved' ? '已处理' : '处理中' }}
                  </t-tag>
                </div>
                <div class="feedback-content">{{ item.content }}</div>
                <div v-if="item.reply" class="feedback-reply">
                  <div class="reply-label">管理员回复：</div>
                  <div class="reply-content">{{ item.reply }}</div>
                </div>
              </div>
            </template>
          </t-list-item>
        </t-list>
      </t-skeleton>
    </t-card>

    <!-- 提交反馈对话框 -->
    <t-dialog
      v-model:visible="dialogVisible"
      header="提交意见反馈"
      :confirm-btn="{ content: '提交', loading: submitLoading }"
      width="min(500px, 95%)"
      @confirm="handleSubmit"
    >
      <t-form ref="formRef" :data="formData" :rules="rules" label-align="top">
        <t-form-item label="反馈类型" name="type">
          <t-select v-model="formData.type" placeholder="请选择反馈类型">
            <t-option label="Bug 反馈" value="bug" />
            <t-option label="功能请求/修改" value="feature" />
            <t-option label="其他" value="other" />
          </t-select>
        </t-form-item>
        <t-form-item label="核心内容" name="content">
          <t-textarea 
            v-model="formData.content" 
            placeholder="请详细描述您遇到的问题或建议..." 
            :autosize="{ minRows: 4 }"
          />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { AddIcon, InfoCircleIcon } from 'tdesign-icons-vue-next';
import type { FormRules } from 'tdesign-vue-next'

useHead({ title: '意见反馈' })

const feedbacks = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref<any>(null)

const formData = reactive({
  type: 'bug',
  content: ''
})

const rules: FormRules = {
  type: [{ required: true, message: '请选择反馈类型', trigger: 'blur' }],
  content: [{ required: true, message: '请输入反馈内容', trigger: 'blur' }, { min: 5, message: '内容至少5个字符', trigger: 'blur' }]
}

// 骨架屏配置
const listSkeleton = Array(3).fill([
  { width: '150px', height: '24px' },
  { width: '100%', height: '40px', margin: '12px 0' },
  { width: '90%', height: '32px', margin: '0 0 12px 24px' }
]);

import { MessagePlugin } from 'tdesign-vue-next'

const fetchFeedbacks = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/feedback')
    feedbacks.value = res.data || []
  } catch (error) {
    console.error('Failed to fetch feedbacks', error)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  const validateResult = await formRef.value?.validate()
  if (validateResult !== true) return

  submitLoading.value = true
  try {
    await $fetch('/api/feedback/create', {
      method: 'POST',
      body: formData
    })
    MessagePlugin.success('提交成功，感谢您的反馈')
    dialogVisible.value = false
    formData.content = ''
    fetchFeedbacks()
  } catch (error: any) {
    MessagePlugin.error(error.statusMessage || '提交失败')
  } finally {
    submitLoading.value = false
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

onMounted(() => {
  fetchFeedbacks()
})
</script>

<style scoped>
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--td-text-color-placeholder);
}

.feedback-item {
  width: 100%;
  padding: 8px 0;
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.feedback-time {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  flex: 1;
}

.feedback-content {
  font-size: 14px;
  color: var(--td-text-color-primary);
  line-height: 1.6;
  white-space: pre-wrap;
}

.feedback-reply {
  margin-top: 12px;
  padding: 12px;
  background-color: var(--td-bg-color-container-hover);
  border-radius: var(--td-radius-medium);
  border-left: 4px solid var(--td-brand-color);
}

.reply-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--td-brand-color);
  margin-bottom: 4px;
}

.reply-content {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}
</style>
