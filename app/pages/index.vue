<template>
  <div class="page-container dashboard-container">
    <div class="page-header">
      <h2 class="page-title">首页</h2>
    </div>

    <t-row :gutter="[24, 24]">
      <!-- 最近预约卡片 -->
      <t-col :xs="12" :md="6" :lg="4">
        <t-card title="最近预约" :bordered="false" class="dashboard-card shadow-card">
          <template #actions>
            <t-link theme="primary" @click="$router.push('/my-bookings')">
              更多 <ChevronRightIcon />
            </t-link>
          </template>
          <div v-if="loading" class="loading-container">
            <t-loading size="small" text="加载中..." />
          </div>
          <div v-else-if="latestBooking" class="booking-info">
            <div class="booking-room">
              <LocationIcon class="info-icon" />
              {{ latestBooking.room?.name }}
            </div>
            <div class="booking-time">
              <TimeIcon class="info-icon" />
              {{ formatDateTime(latestBooking.startTime) }}
            </div>
            <div class="booking-status">
              <t-tag :theme="getStatusTheme(latestBooking.status)" variant="light">
                {{ getStatusText(latestBooking.status) }}
              </t-tag>
            </div>
            <t-divider dashed />
            <div class="booking-purpose">
              <span class="label">用途：</span>
              <span class="value ellipsis">{{ latestBooking.purpose }}</span>
            </div>
          </div>
          <div v-else class="empty-state">
            <InfoCircleIcon size="32px" />
            <p>最近暂无预约</p>
            <t-button variant="outline" size="small" @click="$router.push('/my-bookings')">
              <template #icon><CalendarIcon /></template>
              去预约
            </t-button>
          </div>
        </t-card>
      </t-col>

      <!-- 通知列表卡片 -->
      <t-col :xs="12" :md="6" :lg="8">
        <t-card title="通知" :bordered="false" class="dashboard-card shadow-card">
          <div v-if="notices.length > 0">
            <t-list :split="true">
              <t-list-item v-for="notice in notices" :key="notice.id" class="notice-list-item">
                <template #content>
                  <div class="notice-item-content">
                    <span class="notice-title" @click="showNoticeDetail(notice)">{{ notice.title }}</span>
                  </div>
                </template>
                <template #action>
                  <span class="notice-time">{{ formatDate(notice.createTime) }}</span>
                </template>
              </t-list-item>
            </t-list>
            <div class="notice-pagination">
              <t-pagination
                v-model:current="noticePage"
                v-model:page-size="noticePageSize"
                :total="noticeTotal"
                size="small"
                show-total
                show-paged
                :show-page-size="false"
                @current-change="fetchNotices"
              />
            </div>
          </div>
          <div v-else class="empty-state">
            <NotificationIcon size="32px" />
            <p>暂无通知</p>
          </div>
        </t-card>
      </t-col>
    </t-row>

    <!-- 通知详情对话框 -->
    <t-dialog
      v-model:visible="noticeVisible"
      :header="selectedNotice?.title"
      :footer="false"
      width="min(600px, 95%)"
    >
      <div v-if="selectedNotice" class="notice-detail">
        <div class="notice-detail-meta">
          <span class="meta-item">发布人：{{ selectedNotice.creator?.name }}</span>
          <span class="meta-item">时间：{{ formatDateTime(selectedNotice.createTime) }}</span>
        </div>
        <t-divider />
        <div class="notice-detail-content">
          {{ selectedNotice.content }}
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronRightIcon,
  LocationIcon,
  TimeIcon,
  InfoCircleIcon,
  CalendarIcon,
  NotificationIcon,
} from 'tdesign-icons-vue-next';
import { ref, onMounted } from 'vue'
import { formatDateTime, formatDate } from '~/utils/format'

useHead({ title: '首页' })

const loading = ref(true)
const latestBooking = ref<any>(null)
const notices = ref<any[]>([])
const noticeTotal = ref(0)
const noticePage = ref(1)
const noticePageSize = ref(5)

const noticeVisible = ref(false)
const selectedNotice = ref<any>(null)

const fetchNotices = async () => {
  try {
    const res: any = await $fetch('/api/notices', {
      query: {
        page: noticePage.value,
        pageSize: noticePageSize.value
      }
    })
    notices.value = res.notices || []
    noticeTotal.value = res.total || 0
  } catch (error) {
    console.error('Failed to fetch notices:', error)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const [bookingsData] = await Promise.all([
      $fetch('/api/bookings'),
      fetchNotices()
    ])
    
    // 获取最近的一条预约
    if (bookingsData && Array.isArray(bookingsData) && bookingsData.length > 0) {
      latestBooking.value = bookingsData[0]
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const showNoticeDetail = (notice: any) => {
  selectedNotice.value = notice
  noticeVisible.value = true
}

const getStatusText = (status: string) => {
  const map: any = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    cancelled: '已取消'
  }
  return map[status] || status
}

const getStatusTheme = (status: string): "success" | "warning" | "danger" | "default" => {
  const map: any = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'default'
  }
  return map[status] || 'default'
}
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
}

.dashboard-card {
  height: 100%;
}

.shadow-card {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
}

.shadow-card:hover {
  transform: translateY(-4px);
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.notice-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
  color: var(--td-text-color-placeholder);
}

.empty-state p {
  margin: 12px 0;
}

.booking-info {
  padding: 8px 0;
}

.booking-room {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.booking-time {
  color: var(--td-text-color-secondary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon {
  color: var(--td-brand-color);
}

.booking-status {
  margin-bottom: 8px;
}

.booking-purpose {
  display: flex;
  font-size: 14px;
}

.booking-purpose .label {
  color: var(--td-text-color-secondary);
  white-space: nowrap;
}

.booking-purpose .value {
  color: var(--td-text-color-primary);
}

.notice-list-item {
  padding: 12px 0;
}

.notice-item-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notice-title {
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
}

.notice-title:hover {
  color: var(--td-brand-color);
}

.notice-time {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
}

.notice-tag {
  flex-shrink: 0;
}

.notice-detail-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
  color: var(--td-text-color-secondary);
  font-size: 14px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
}

.notice-detail-content {
  line-height: 1.8;
  white-space: pre-wrap;
  color: var(--td-text-color-primary);
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
