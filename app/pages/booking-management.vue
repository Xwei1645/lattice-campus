<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">预约审批</h2>
      <div class="header-actions">
        <t-radio-group v-model="statusFilter" variant="default-filled">
          <t-radio-button value="all">全部</t-radio-button>
          <t-radio-button value="pending">待审批</t-radio-button>
          <t-radio-button value="approved">已通过</t-radio-button>
          <t-radio-button value="rejected">已驳回</t-radio-button>
          <t-radio-button value="cancelled">已取消</t-radio-button>
        </t-radio-group>
      </div>
    </div>

    <t-card :bordered="false" class="content-card">
      <t-skeleton :loading="loading" :row-col="tableSkeleton" animation="gradient">
        <t-table
          row-key="id"
          :data="filteredBookings"
          :columns="columns"
          :loading="loading"
          :hover="true"
          :pagination="pagination"
          @page-change="onPageChange"
        >
          <template #time="{ row }">
            {{ formatBookingTime(row.startTime, row.endTime) }}
          </template>
          <template #status="{ row }">
            <t-tag :theme="getStatusTheme(row.status)" variant="light">
              {{ getStatusLabel(row.status) }}
            </t-tag>
          </template>
          <template #createTime="{ row }">
            {{ formatDateTime(row.createTime) }}
          </template>
          <template #operation="{ row }">
            <t-space v-if="row.status === 'pending'">
              <t-link theme="primary" hover="color" @click="handleApprove(row)">通过</t-link>
              <t-link theme="danger" hover="color" @click="handleReject(row)">驳回</t-link>
            </t-space>
            <t-link v-else-if="row.remark" theme="default" @click="showRemark(row)">查看备注</t-link>
            <span v-else>-</span>
          </template>
        </t-table>
      </t-skeleton>
    </t-card>



    <!-- 驳回原因对话框 -->
    <t-dialog
      v-model:visible="rejectVisible"
      header="驳回预约"
      :confirm-btn="{ content: '确认驳回', theme: 'danger', loading: submitLoading }"
      @confirm="confirmReject"
    >
      <div style="padding: 12px 0">
        <t-textarea v-model="rejectRemark" placeholder="请输入驳回原因（可选）" :autosize="{ minRows: 3 }" />
      </div>
    </t-dialog>

    <!-- 查看备注对话框 -->
    <t-dialog
      v-model:visible="remarkVisible"
      header="预约备注/驳回原因"
      :footer="false"
    >
      <div style="padding: 12px 0">
        <p style="white-space: pre-wrap; color: var(--td-text-color-primary)">{{ currentRemark }}</p>
      </div>
    </t-dialog>


  </div>
</template>

<script setup lang="ts">
import type { PrimaryTableCol } from 'tdesign-vue-next'
import { formatBookingTime, formatDateTime } from '~/utils/format'

useHead({ title: '预约审批' })

const loading = ref(false)
const bookings = ref<any[]>([])
const statusFilter = ref('pending')
const submitLoading = ref(false)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

// 骨架屏配置
const tableSkeleton = Array(8).fill([
  { width: '40px' },
  { width: '120px' },
  { width: '100px' },
  { width: '100px' },
  { width: '250px' },
  { width: '100px' },
  { width: '150px' },
  { width: '80px' },
  { width: '120px' },
]);

const fetchBookings = async () => {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bookings')
    bookings.value = data as any[]
    pagination.total = bookings.value.length
  } catch (error: any) {
    MessagePlugin.error('获取预约列表失败：' + error.message)
  } finally {
    loading.value = false
  }
}

const filteredBookings = computed(() => {
  let result = bookings.value
  if (statusFilter.value !== 'all') {
    result = result.filter(b => b.status === statusFilter.value)
  }
  return result
})

const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 70 },
  { colKey: 'roomName', title: '场地名称' },
  { colKey: 'organizationName', title: '组织' },
  { colKey: 'userName', title: '申请人' },
  { colKey: 'time', title: '预约时间', width: 300 },
  { colKey: 'purpose', title: '用途' },
  { colKey: 'createTime', title: '申请时间', width: 180 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'operation', title: '操作', width: 150, fixed: 'right' },
]

const onPageChange = (pageInfo: any) => {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
}

const getStatusTheme = (status: string) => {
  switch (status) {
    case 'pending': return 'warning'
    case 'approved': return 'success'
    case 'rejected': return 'danger'
    case 'cancelled': return 'default'
    default: return 'default'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '待审批'
    case 'approved': return '已通过'
    case 'rejected': return '已驳回'
    case 'cancelled': return '已取消'
    default: return status
  }
}

const handleApprove = async (row: any) => {
  try {
    await $fetch<any>('/api/bookings/update', {
      method: 'POST',
      body: { id: row.id, status: 'approved' }
    })
    MessagePlugin.success('已通过预约')
    fetchBookings()
  } catch (error: any) {
    MessagePlugin.error('操作失败：' + error.message)
  }
}

const rejectVisible = ref(false)
const rejectRemark = ref('')
const currentBooking = ref<any>(null)

const handleReject = (row: any) => {
  currentBooking.value = row
  rejectRemark.value = ''
  rejectVisible.value = true
}

const confirmReject = async () => {
  if (!currentBooking.value) return
  submitLoading.value = true
  try {
    await $fetch<any>('/api/bookings/update', {
      method: 'POST',
      body: { 
        id: currentBooking.value.id, 
        status: 'rejected',
        remark: rejectRemark.value 
      }
    })
    MessagePlugin.success('已驳回预约')
    rejectVisible.value = false
    fetchBookings()
  } catch (error: any) {
    MessagePlugin.error('操作失败：' + error.message)
  } finally {
    submitLoading.value = false
  }
}

const remarkVisible = ref(false)
const currentRemark = ref('')
const showRemark = (row: any) => {
  currentRemark.value = row.remark
  remarkVisible.value = true
}





onMounted(() => {
  fetchBookings()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 16px;
}
</style>
