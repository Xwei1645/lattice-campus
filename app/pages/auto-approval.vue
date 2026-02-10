<template>
  <div class="page-container">
    <div class="page-header">
      <t-space size="8px">
        <h2 class="page-title">自动审批规则</h2>
        <t-tag theme="warning" variant="light" size="small">Beta</t-tag>
      </t-space>
      <div class="header-actions">
        <t-button theme="primary" @click="handleAddRule">
          <template #icon><AddIcon /></template>
          新增规则
        </t-button>
      </div>
    </div>
      
    <t-card :bordered="false" class="content-card">
      <t-skeleton :loading="rulesLoading" :row-col="tableSkeleton" animation="gradient">
        <t-table
          row-key="id"
          :data="rules"
          :columns="ruleColumns"
          :loading="rulesLoading"
          :hover="true"
          :pagination="pagination"
        >
          <template #conditions="{ row }">
            <div class="rule-conditions">
              <t-tag v-if="row.organizationName" variant="light" size="small">组织: {{ row.organizationName }}</t-tag>
              <t-tag v-if="row.roomName" variant="light" size="small">场地: {{ row.roomName }}</t-tag>
              <t-tag v-if="row.userName" variant="light" size="small">用户: {{ row.userName }}</t-tag>
              <t-tag v-if="row.maxDuration" variant="light" size="small">时长 ≤ {{ row.maxDuration }}min</t-tag>
              <t-tag v-if="row.startHour || row.endHour" variant="light" size="small">
                时间: {{ row.startHour || '00:00' }} - {{ row.endHour || '23:59' }}
              </t-tag>
              <span v-if="!row.organizationName && !row.roomName && !row.userName && !row.maxDuration && !row.startHour && !row.endHour" style="color: var(--td-text-color-placeholder)">无限制</span>
            </div>
          </template>
          <template #action="{ row }">
            <t-tag :theme="row.action === 'approve' ? 'success' : 'danger'" variant="light">
              {{ row.action === 'approve' ? '通过' : '驳回' }}
            </t-tag>
          </template>
          <template #status="{ row }">
            <t-switch v-model="row.status" @change="(val) => handleRuleStatusChange(row, val)" />
          </template>
          <template #createTime="{ row }">
            {{ formatDateTime(row.createTime) }}
          </template>
          <template #operation="{ row }">
            <t-space>
              <t-link theme="primary" hover="color" @click="handleEditRule(row)">编辑</t-link>
              <t-popconfirm content="确认删除该规则吗？" @confirm="handleDeleteRule(row)">
                <t-link theme="danger" hover="color">删除</t-link>
              </t-popconfirm>
            </t-space>
          </template>
        </t-table>
      </t-skeleton>
    </t-card>

    <!-- 新增/编辑规则对话框 -->
    <t-dialog
      v-model:visible="ruleDialogVisible"
      :confirm-btn="{ content: '提交', loading: ruleSubmitLoading }"
      @confirm="handleRuleSubmit"
      width="600px"
    >
      <template #header>
        <t-space size="8px">
          <span>{{ ruleFormData.id ? '编辑' : '新增' }}自动审批规则</span>
          <t-tag theme="warning" variant="light" size="small">Beta</t-tag>
        </t-space>
      </template>
      <t-form ref="ruleFormRef" :data="ruleFormData" :rules="ruleFormRules" label-align="top">
        <t-form-item label="规则名称" name="name">
          <t-input v-model="ruleFormData.name" placeholder="例如：学生会预约自动通过" variant="filled" />
        </t-form-item>
        
        <div class="form-grid">
          <t-form-item label="限定组织" name="organizationId">
            <t-select v-model="ruleFormData.organizationId" :options="organizationOptions" clearable filterable placeholder="不限" variant="filled" />
          </t-form-item>
          <t-form-item label="限定场地" name="roomId">
            <t-select v-model="ruleFormData.roomId" :options="roomOptions" clearable filterable placeholder="不限" variant="filled" />
          </t-form-item>
          <t-form-item label="限定用户" name="userId">
            <t-select v-model="ruleFormData.userId" :options="userOptions" clearable filterable placeholder="不限" variant="filled" />
          </t-form-item>
          <t-form-item label="最大时长 (分钟)" name="maxDuration">
            <t-input-number v-model="ruleFormData.maxDuration" :min="1" placeholder="不限" style="width: 100%" variant="filled" />
          </t-form-item>
        </div>

        <div class="form-grid">
          <t-form-item label="开始时间范围" name="startHour">
            <t-time-picker v-model="ruleFormData.startHour" format="HH:mm" placeholder="开始" style="width: 100%" variant="filled" />
          </t-form-item>
          <t-form-item label="结束时间范围" name="endHour">
            <t-time-picker v-model="ruleFormData.endHour" format="HH:mm" placeholder="结束" style="width: 100%" variant="filled" />
          </t-form-item>
        </div>

        <t-form-item label="执行动作" name="action">
          <t-radio-group v-model="ruleFormData.action">
            <t-radio value="approve">自动通过</t-radio>
            <t-radio value="reject">自动驳回</t-radio>
          </t-radio-group>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { AddIcon } from 'tdesign-icons-vue-next';
import type { PrimaryTableCol } from 'tdesign-vue-next'
import { formatDateTime } from '~/utils/format'

useHead({ title: '自动审批规则' })

// 自动审批规则逻辑
const rules = ref<any[]>([])
const rulesLoading = ref(false)
const ruleDialogVisible = ref(false)
const ruleSubmitLoading = ref(false)
const ruleFormRef = ref<any>(null)

const ruleFormData = reactive({
  id: undefined as number | undefined,
  name: '',
  organizationId: undefined as number | undefined,
  roomId: undefined as number | undefined,
  userId: undefined as number | undefined,
  maxDuration: undefined as number | undefined,
  startHour: '',
  endHour: '',
  action: 'approve'
})

const ruleFormRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' as const }],
  action: [{ required: true, message: '请选择执行动作', trigger: 'change' as const }]
}

const ruleColumns: PrimaryTableCol[] = [
  { colKey: 'name', title: '规则名称' },
  { colKey: 'conditions', title: '触发条件' },
  { colKey: 'action', title: '执行动作', width: 100 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 150, fixed: 'right' }
]

// 骨架屏配置
const tableSkeleton = Array(6).fill([
  { width: '20%' },
  { width: '30%' },
  { width: '10%' },
  { width: '10%' },
  { width: '20%' },
  { width: '10%' },
]);

const pagination = reactive({
  defaultCurrent: 1,
  defaultPageSize: 10,
  total: 0,
})

const fetchRules = async () => {
  rulesLoading.value = true
  try {
    rules.value = await $fetch<any>('/api/auto-approval')
    pagination.total = rules.value.length
  } catch (error: any) {
    MessagePlugin.error('获取规则失败：' + error.message)
  } finally {
    rulesLoading.value = false
  }
}

const organizationOptions = ref<any[]>([])
const userOptions = ref<any[]>([])
const roomOptions = ref<any[]>([])

const fetchOptions = async () => {
  try {
    const [orgs, users, rooms] = await Promise.all([
      $fetch<any>('/api/organizations'),
      $fetch<any>('/api/users'),
      $fetch<any>('/api/rooms')
    ])
    organizationOptions.value = orgs.map((i: any) => ({ label: i.name, value: i.id }))
    userOptions.value = users.map((i: any) => ({ label: `${i.name} (${i.account})`, value: i.id }))
    roomOptions.value = rooms.map((i: any) => ({ label: i.name, value: i.id }))
  } catch (error) {
    console.error('Failed to fetch options', error)
  }
}

const handleAddRule = () => {
  Object.assign(ruleFormData, {
    id: undefined,
    name: '',
    organizationId: undefined,
    roomId: undefined,
    userId: undefined,
    maxDuration: undefined,
    startHour: '',
    endHour: '',
    action: 'approve'
  })
  fetchOptions()
  ruleDialogVisible.value = true
}

const handleEditRule = (row: any) => {
  Object.assign(ruleFormData, {
    id: row.id,
    name: row.name,
    organizationId: row.organizationId,
    roomId: row.roomId,
    userId: row.userId,
    maxDuration: row.maxDuration,
    startHour: row.startHour,
    endHour: row.endHour,
    action: row.action
  })
  fetchOptions()
  ruleDialogVisible.value = true
}

const handleRuleSubmit = async () => {
  const validateResult = await ruleFormRef.value?.validate()
  if (validateResult !== true) return

  ruleSubmitLoading.value = true
  try {
    if (ruleFormData.id) {
      await $fetch<any>('/api/auto-approval/update', {
        method: 'POST',
        body: ruleFormData
      })
      MessagePlugin.success('规则更新成功')
    } else {
      await $fetch<any>('/api/auto-approval/create', {
        method: 'POST',
        body: ruleFormData
      })
      MessagePlugin.success('规则创建成功')
    }
    ruleDialogVisible.value = false
    fetchRules()
  } catch (error: any) {
    MessagePlugin.error('操作失败：' + error.message)
  } finally {
    ruleSubmitLoading.value = false
  }
}

const handleRuleStatusChange = async (row: any, val: any) => {
  try {
    await $fetch<any>('/api/auto-approval/update', {
      method: 'POST',
      body: { id: row.id, status: val }
    })
    MessagePlugin.success('状态更新成功')
  } catch (error: any) {
    MessagePlugin.error('更新失败：' + error.message)
    row.status = !val // 回滚
  }
}

const handleDeleteRule = async (row: any) => {
  try {
    await $fetch<any>('/api/auto-approval/delete', {
      method: 'POST',
      body: { id: row.id }
    })
    MessagePlugin.success('删除成功')
    fetchRules()
  } catch (error: any) {
    MessagePlugin.error('删除失败：' + error.message)
  }
}

onMounted(() => {
  fetchRules()
})
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.rule-conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
