<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">总览</h2>
        <t-space align="center" :size="16">
          <t-space align="center" :size="8">
            <span class="filter-label">日期</span>
            <t-date-range-picker
              v-model="dateRange"
              mode="date"
              allow-input
              clearable
              style="width: 240px"
              variant="filled"
            />
          </t-space>

          <t-button variant="outline" shape="square" @click="isSwapped = !isSwapped" title="交换行列">
            <template #icon><swap-icon /></template>
          </t-button>

          <t-space align="center" :size="8">
            <span class="filter-label">场地</span>
            <t-select
              v-model="selectedRoomIds"
              multiple
              placeholder="选择场地"
              :options="roomOptions"
              :min-collapsed-num="1"
              style="width: 180px"
              variant="filled"
            />
          </t-space>

          <t-space align="center" :size="8">
            <span class="filter-label">状态</span>
            <t-select
              v-model="selectedStatuses"
              multiple
              placeholder="选择状态"
              :options="statusOptions"
              :min-collapsed-num="1"
              style="width: 180px"
              variant="filled"
            />
          </t-space>
        </t-space>
      </div>

      <div class="header-right">
        <!-- 图例 -->
        <t-space :size="12" align="center" class="legend-container">
          <template v-for="status in statusOptions" :key="status.value">
            <div v-if="selectedStatuses.includes(status.value)" class="legend-item">
              <span class="legend-dot" :class="status.value"></span>
              <span>{{ status.label }}</span>
            </div>
          </template>
        </t-space>
      </div>
    </div>

    <!-- 表格区域 -->
    <t-card :bordered="false" class="content-card table-card">
      <div class="table-wrapper">
        <table class="schedule-table">
          <thead>
            <tr v-if="!isSwapped">
              <th class="corner-cell">
                <div class="corner-content">
                  <span class="corner-top">场地</span>
                  <span class="corner-line"></span>
                  <span class="corner-bottom">日期</span>
                </div>
              </th>
              <th v-for="room in displayedRooms" :key="room.id">
                {{ room.name }}
              </th>
            </tr>
            <tr v-else>
              <th class="corner-cell">
                <div class="corner-content">
                  <span class="corner-top">日期</span>
                  <span class="corner-line"></span>
                  <span class="corner-bottom">场地</span>
                </div>
              </th>
              <th v-for="day in weekDays" :key="day.dateStr">
                <div class="th-date">{{ day.dateStr }}</div>
                <div class="th-weekday">{{ day.weekday }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-if="!isSwapped">
              <tr v-for="day in weekDays" :key="day.dateStr">
                <td class="row-header">
                  <div class="row-date">{{ day.dateStr }}</div>
                  <div class="row-weekday">{{ day.weekday }}</div>
                </td>
                <td v-for="room in displayedRooms" :key="room.id" class="booking-cell">
                  <div class="booking-list">
                    <div
                      v-for="booking in getBookingsForCell(room.id, day.fullDate)"
                      :key="booking.id"
                      class="booking-item"
                      :class="booking.status"
                      :title="`${booking.startTimeStr} - ${booking.endTimeStr}\n${booking.purpose}\n${booking.organizationName}`"
                      @click="showDetail(booking)"
                    >
                      <div class="booking-time">{{ booking.startTimeStr }} - {{ booking.endTimeStr }}</div>
                      <div class="booking-purpose">{{ booking.purpose }}</div>
                      <div class="booking-user">{{ booking.organizationName }}</div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="room in displayedRooms" :key="room.id">
                <td class="row-header">{{ room.name }}</td>
                <td v-for="day in weekDays" :key="day.dateStr" class="booking-cell">
                  <div class="booking-list">
                    <div
                      v-for="booking in getBookingsForCell(room.id, day.fullDate)"
                      :key="booking.id"
                      class="booking-item"
                      :class="booking.status"
                      :title="`${booking.startTimeStr} - ${booking.endTimeStr}\n${booking.purpose}\n${booking.organizationName}`"
                      @click="showDetail(booking)"
                    >
                      <div class="booking-time">{{ booking.startTimeStr }} - {{ booking.endTimeStr }}</div>
                      <div class="booking-purpose">{{ booking.purpose }}</div>
                      <div class="booking-user">{{ booking.organizationName }}</div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </t-card>

    <!-- 预约详情对话框 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="预约详情"
      :footer="false"
      width="min(500px, 95%)"
    >
      <div v-if="currentBooking" class="booking-detail">
        <t-descriptions :column="1" bordered>
          <t-descriptions-item label="场地">{{ currentBooking.roomName }}</t-descriptions-item>
          <t-descriptions-item label="组织">{{ currentBooking.organizationName }}</t-descriptions-item>
          <t-descriptions-item label="申请人">{{ currentBooking.userName }}</t-descriptions-item>
          <t-descriptions-item label="开始时间">{{ formatFullDateTime(currentBooking.startTime) }}</t-descriptions-item>
          <t-descriptions-item label="结束时间">{{ formatFullDateTime(currentBooking.endTime) }}</t-descriptions-item>
          <t-descriptions-item label="用途">{{ currentBooking.purpose }}</t-descriptions-item>
          <t-descriptions-item label="状态">
            <t-tag :theme="getStatusTheme(currentBooking.status)" variant="light">
              {{ getStatusLabel(currentBooking.status) }}
            </t-tag>
          </t-descriptions-item>
          <t-descriptions-item v-if="currentBooking.remark" label="备注">
            {{ currentBooking.remark }}
          </t-descriptions-item>
        </t-descriptions>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import isoWeek from 'dayjs/plugin/isoWeek'
import { SwapIcon } from 'tdesign-icons-vue-next'

dayjs.extend(isoWeek)
dayjs.locale('zh-cn')

useHead({ title: '总览' })

// --- State ---
const dateRange = ref([
  dayjs().startOf('isoWeek').format('YYYY-MM-DD'),
  dayjs().endOf('isoWeek').format('YYYY-MM-DD')
])
const selectedRoomIds = ref<number[]>([])
const selectedStatuses = ref<string[]>(['approved', 'pending'])
const isSwapped = ref(false)

const statusOptions = [
  { label: '已通过', value: 'approved' },
  { label: '待审批', value: 'pending' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已取消', value: 'cancelled' }
]

// --- Detail Dialog ---
const detailVisible = ref(false)
const currentBooking = ref<any>(null)

const showDetail = (booking: any) => {
  currentBooking.value = booking
  detailVisible.value = true
}

const getStatusTheme = (status: string) => {
  switch (status) {
    case 'approved': return 'success'
    case 'pending': return 'warning'
    case 'rejected':
    case 'cancelled': return 'danger'
    default: return 'default'
  }
}

const getStatusLabel = (status: string) => {
  return statusOptions.find(s => s.value === status)?.label || status
}

const formatFullDateTime = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// --- Data Fetching ---
const { data: rooms } = await useFetch('/api/rooms')
const { data: bookings } = await useFetch('/api/bookings', { query: { scope: 'all' } })

// --- Computed ---
const roomOptions = computed(() => rooms.value?.map(r => ({ label: r.name, value: r.id })) || [])

watchEffect(() => {
  if (rooms.value?.length && !selectedRoomIds.value.length) {
    selectedRoomIds.value = rooms.value.map(r => r.id)
  }
})

const displayedRooms = computed(() => rooms.value?.filter(r => selectedRoomIds.value.includes(r.id)) || [])

const weekDays = computed(() => {
  if (!dateRange.value || dateRange.value.length !== 2) return []
  const start = dayjs(dateRange.value[0])
  const end = dayjs(dateRange.value[1])
  const days = []
  let current = start
  let count = 0
  while ((current.isBefore(end) || current.isSame(end, 'day')) && count < 31) {
    days.push({
      weekday: current.format('dddd'),
      dateStr: current.format('MM-DD'),
      fullDate: current.format('YYYY-MM-DD')
    })
    current = current.add(1, 'day')
    count++
  }
  return days
})

const getBookingsForCell = (roomId: number, dateStr: string) => {
  if (!bookings.value) return []
  return bookings.value
    .filter(b => 
      b.roomId === roomId && 
      dayjs(b.startTime).format('YYYY-MM-DD') === dateStr &&
      selectedStatuses.value.includes(b.status)
    )
    .map(b => ({
      ...b,
      startTimeStr: dayjs(b.startTime).format('HH:mm'),
      endTimeStr: dayjs(b.endTime).format('HH:mm')
    }))
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())
}
</script>

<style scoped>
.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.filter-label {
  font-weight: 500;
  color: var(--td-text-color-primary);
  white-space: nowrap;
  line-height: 32px; /* 与输入框高度对齐 */
}

/* 图例 */
.legend-container {
  padding: 0 4px;
  height: 32px;
  display: flex;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
  white-space: nowrap;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-dot.approved {
  background-color: var(--td-success-color);
}

.legend-dot.pending {
  background-color: var(--td-warning-color);
}

.legend-dot.rejected {
  background-color: var(--td-error-color);
}

.legend-dot.cancelled {
  background-color: var(--td-gray-color-6);
}

/* 表格容器 */
.table-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

:deep(.t-card__body) {
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-wrapper {
  flex: 1;
  overflow: auto;
}

/* 表格 */
.schedule-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

.schedule-table th,
.schedule-table td {
  border: 1px solid var(--td-component-border);
  padding: 8px;
  text-align: center;
  background-color: var(--td-bg-color-container);
}

.schedule-table th {
  background-color: var(--td-bg-color-secondarycontainer);
  font-weight: 600;
  height: 48px;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* 斜线表头 */
.corner-cell {
  width: 120px;
  padding: 0 !important;
  position: sticky;
  left: 0;
  z-index: 20;
}

.corner-content {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 60px;
  background-color: var(--td-bg-color-secondarycontainer);
}

.corner-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to top right,
    transparent calc(50% - 0.5px),
    var(--td-component-border) calc(50% - 0.5px),
    var(--td-component-border) calc(50% + 0.5px),
    transparent calc(50% + 0.5px)
  );
}

.corner-top {
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.corner-bottom {
  position: absolute;
  bottom: 8px;
  left: 12px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

/* 表头日期 */
.th-date {
  font-weight: 600;
  font-size: 14px;
}

.th-weekday {
  font-weight: 400;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

/* 行标题 */
.row-header {
  font-weight: 600;
  background-color: var(--td-bg-color-secondarycontainer) !important;
  position: sticky;
  left: 0;
  z-index: 5;
}

.row-date {
  font-size: 14px;
}

.row-weekday {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

/* 预约单元格 */
.booking-cell {
  vertical-align: top;
  text-align: left;
  padding: 6px !important;
}

.booking-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.booking-item {
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  border-left: 3px solid transparent;
  background-color: var(--td-bg-color-secondarycontainer);
  text-align: left;
  line-height: 1.5;
  transition: all 0.2s;
  cursor: pointer;
}

.booking-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 状态颜色 */
.booking-item.approved {
  background-color: var(--td-success-color-1);
  border-left-color: var(--td-success-color);
  color: var(--td-success-color-8);
}

.booking-item.pending {
  background-color: var(--td-warning-color-1);
  border-left-color: var(--td-warning-color);
  color: var(--td-warning-color-8);
}

.booking-item.rejected,
.booking-item.cancelled {
  background-color: var(--td-error-color-1);
  border-left-color: var(--td-error-color);
  color: var(--td-error-color-8);
  opacity: 0.7;
}

.booking-time {
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 2px;
}

.booking-purpose {
  font-weight: 500;
  margin-bottom: 2px;
  word-break: break-word;
  white-space: normal;
}

.booking-user {
  font-size: 11px;
  opacity: 0.8;
}

.booking-detail {
  padding: 8px 0;
}
</style>
