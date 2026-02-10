<template>
  <div class="display-container" :class="themeClass">
    <!-- 背景层 -->
    <div class="background-overlay"></div>

    <div v-if="loading" class="loading-state">
      <t-loading size="large" text="正在加载班牌信息..." inherit-color />
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-card">
        <t-icon name="error-circle-filled" size="64px" />
        <h2>{{ error }}</h2>
        <p>请检查 URL 参数或联系管理员</p>
      </div>
    </div>

    <div v-else class="content-layout">
      <!-- 头部：房间名与位置 -->
      <header class="display-header">
        <div class="room-info">
          <h1 class="room-name">{{ roomInfo?.name }}</h1>
          <div class="room-location">
            <t-icon name="location" />
            {{ roomInfo?.location || '未知地点' }}
          </div>
        </div>
      </header>

      <main class="grid-layout">
        <!-- 左侧：时间卡片 -->
        <div class="glass-card time-card">
          <div class="card-label">当前时间</div>
          <div class="digital-clock">
            <span>{{ currentHour }}</span>
            <span class="clock-colon" :class="{ 'is-hidden': !isColonVisible }">:</span>
            <span>{{ currentMinute }}</span>
          </div>
          <div class="date-info">{{ currentDate }} · {{ currentWeekDay }}</div>
        </div>

        <!-- 中间：当前占用卡片 -->
        <div class="glass-card status-card" :class="{ 'is-busy': currentBooking }">
          <div class="card-header">
            <div class="label-group">
              <div class="card-label">当前状态</div>
              <div v-if="currentBooking" class="status-tag">使用中</div>
              <div v-else class="status-tag available">空闲中</div>
            </div>
            <t-button
              variant="text"
              class="theme-toggle-btn"
              @click="isDarkMode = !isDarkMode"
            >
              <template #icon>
                <t-icon :name="isDarkMode ? 'moon' : 'sunny'" size="24px" />
              </template>
              {{ isDarkMode ? '夜间' : '日间' }}
            </t-button>
          </div>
          <div v-if="currentBooking" class="status-content">
            <h2 class="booking-purpose">{{ currentBooking.purpose }}</h2>
            <div class="booking-org">{{ currentBooking.organizationName }}</div>
            <div class="booking-time-range">
              {{ formatTime(currentBooking.startTime) }} - {{ formatTime(currentBooking.endTime) }}
            </div>
          </div>
          <div v-else class="status-content empty">
            <h2 class="booking-purpose">当前时段暂无预约</h2>
          </div>
        </div>

        <!-- 下方：后续安排 -->
        <div class="glass-card next-card">
          <div class="card-header">
            <div class="card-label">后续安排 (今日)</div>
            <t-button variant="outline" theme="primary" size="large" @click="showWeekScale = true" class="big-action-btn">
              <template #icon><t-icon name="calendar-1" /></template>
              查看本周安排
            </t-button>
          </div>
          <div class="upcoming-list">
            <transition-group name="list">
              <div v-for="item in upcomingBookings" :key="item.id" class="upcoming-item">
                <div class="item-time">{{ formatTime(item.startTime) }}</div>
                <div class="item-details">
                  <div class="item-purpose">{{ item.purpose }}</div>
                  <div class="item-org">{{ item.organizationName }}</div>
                </div>
              </div>
            </transition-group>
            <div v-if="upcomingBookings.length === 0" class="no-upcoming">
              今日后续暂无更多安排
            </div>
          </div>
        </div>
      </main>

      <!-- 全局弹窗：本周安排 -->
      <t-dialog
        v-model:visible="showWeekScale"
        :header="`${roomInfo?.name} - 本周安排`"
        width="100%"
        top="0"
        :footer="false"
        destroy-on-close
        class="display-dialog full-screen-dialog"
      >
        <div class="week-schedule">
          <table class="custom-display-table">
            <thead>
              <tr>
                <th style="width: 220px">时段</th>
                <th>预约用途</th>
                <th>组织单位</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in weekBookings" :key="row.id">
                <td>
                  <div class="table-time-cell">
                    <span class="table-date">{{ formatDate(row.startTime) }}</span>
                    <span class="table-time">{{ formatTime(row.startTime) }}-{{ formatTime(row.endTime) }}</span>
                  </div>
                </td>
                <td><span class="table-purpose">{{ row.purpose }}</span></td>
                <td><span class="table-org">{{ row.organizationName }}</span></td>
              </tr>
              <tr v-if="weekBookings.length === 0">
                <td colspan="3" class="table-empty-cell">本周暂无预约安排</td>
              </tr>
            </tbody>
          </table>
        </div>
      </t-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import isBetween from 'dayjs/plugin/isBetween'
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'

dayjs.extend(isBetween)
dayjs.locale('zh-cn')

definePageMeta({
  layout: false // 班牌全屏展示，不需要默认导航栏
})

const route = useRoute()
const loading = ref(true)
const error = ref('')
const roomInfo = ref<any>(null)
const bookings = ref<any[]>([])
const showWeekScale = ref(false)

// 时间显示
const currentHour = ref(dayjs().format('HH'))
const currentMinute = ref(dayjs().format('mm'))
const isColonVisible = ref(true)
const currentDate = ref(dayjs().format('YYYY年MM月DD日'))
const currentWeekDay = ref(dayjs().format('dddd'))

// 主题逻辑：6:00 - 18:00 为日间模式
const isDarkMode = ref(true)
const themeClass = computed(() => isDarkMode.value ? 'dark-mode' : 'light-mode')

const updateTheme = () => {
  const hour = dayjs().hour()
  isDarkMode.value = hour < 6 || hour >= 18
}

let timer: any = null
let dataTimer: any = null

const fetchDisplayData = async () => {
  const room = route.query.room as string
  if (!room) {
    error.value = '未指定教室参数 (room)'
    loading.value = false
    return
  }

  try {
    const res: any = await $fetch('/api/display/room', {
      query: { room }
    })
    if (res.success) {
      roomInfo.value = res.data.room
      bookings.value = res.data.bookings
      error.value = ''
    } else {
      error.value = res.message || '获取数据失败'
    }
  } catch (err: any) {
    error.value = err.data?.statusMessage || '服务器连接失败'
  } finally {
    loading.value = false
  }
}

// 计算当前预约
const currentBooking = computed(() => {
  const now = dayjs()
  return bookings.value.find(b => 
    now.isBetween(dayjs(b.startTime), dayjs(b.endTime), null, '[)')
  )
})

// 计算今日后续预约
const upcomingBookings = computed(() => {
  const now = dayjs()
  const endOfDay = dayjs().endOf('day')
  return bookings.value.filter(b => 
    dayjs(b.startTime).isAfter(now) && dayjs(b.startTime).isBefore(endOfDay)
  ).slice(0, 5) // 仅展示后续5条
})

// 计算本周预约
const weekBookings = computed(() => {
  return [...bookings.value].sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())
})

const formatTime = (time: string) => dayjs(time).format('HH:mm')
const formatDate = (time: string) => dayjs(time).format('MM-DD')

// 无人操作自动关闭逻辑 (5分钟)
let inactivityTimer: any = null
const INACTIVITY_LIMIT = 5 * 60 * 1000 

const resetInactivityTimer = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  if (showWeekScale.value) {
    inactivityTimer = setTimeout(() => {
      showWeekScale.value = false
    }, INACTIVITY_LIMIT)
  }
}

// 监听弹窗打开，开启计时器
watch(showWeekScale, (val) => {
  if (val) {
    resetInactivityTimer()
    // 添加全局事件监听以重置计时器
    window.addEventListener('mousemove', resetInactivityTimer)
    window.addEventListener('touchstart', resetInactivityTimer)
    window.addEventListener('click', resetInactivityTimer)
  } else {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    window.removeEventListener('mousemove', resetInactivityTimer)
    window.removeEventListener('touchstart', resetInactivityTimer)
    window.removeEventListener('click', resetInactivityTimer)
  }
})

onMounted(() => {
  fetchDisplayData()
  updateTheme()
  
  // 每秒更新时钟
  timer = setInterval(() => {
    const now = dayjs()
    currentHour.value = now.format('HH')
    currentMinute.value = now.format('mm')
    isColonVisible.value = now.second() !== 59
    currentDate.value = now.format('YYYY年MM月DD日')
    currentWeekDay.value = now.format('dddd')
    // 每分钟检查一次主题切换（如果不手动干预过）
    if (dayjs().second() === 0) {
      const hour = dayjs().hour()
      const shouldBeDark = hour < 6 || hour >= 18
      // 只有在当前模式与应当模式一致时才自动切，避免覆盖手动操作
      // 这里简化处理：每分钟对齐一次
      // updateTheme() 
    }
  }, 1000)

  // 每5分钟自动刷新一次数据
  dataTimer = setInterval(fetchDisplayData, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (dataTimer) clearInterval(dataTimer)
  if (inactivityTimer) clearTimeout(inactivityTimer)
  window.removeEventListener('mousemove', resetInactivityTimer)
  window.removeEventListener('touchstart', resetInactivityTimer)
  window.removeEventListener('click', resetInactivityTimer)
})
</script>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/harmonyos-sans@1.0.0/css/harmonyos-sans.css');

.display-container {
  --display-bg: #0d1117;
  --display-text: #ffffff;
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --accent-color: #3f51b5;
  --accent-color-light: #7986cb;
  --shadow-color: rgba(0, 0, 0, 0.3);
  --card-label-color: rgba(255, 255, 255, 0.5);
  --clock-gradient: linear-gradient(to bottom, #fff, #9fa8da);
  --overlay-gradient: radial-gradient(circle at top right, #1a237e 0%, #0d1117 70%);

  min-height: 100vh;
  color: var(--display-text);
  position: relative;
  overflow: hidden;
  font-family: 'HarmonyOS Sans SC Black', 'HarmonyOS Sans', 'PingFang SC', sans-serif;
  background-color: var(--display-bg);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.display-container.light-mode {
  --display-bg: #f8fafc;
  --display-text: #1e293b;
  --glass-bg: rgba(255, 255, 255, 0.8);
  --glass-border: rgba(0, 0, 0, 0.05);
  --accent-color: #2563eb;
  --accent-color-light: #60a5fa;
  --shadow-color: rgba(0, 0, 0, 0.05);
  --card-label-color: rgba(30, 41, 59, 0.6);
  --clock-gradient: linear-gradient(to bottom, #1e293b, #64748b);
  --overlay-gradient: radial-gradient(circle at top right, #dbeafe 0%, #f8fafc 70%);
}

.background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-gradient);
  z-index: 0;
  transition: background 0.8s ease;
}

.content-layout {
  position: relative;
  z-index: 1;
  padding: 80px 40px 40px 40px;
  max-width: 90%;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.display-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 40px;
}

.room-name {
  font-size: 64px;
  font-weight: 800;
  margin: 0;
  color: var(--display-text);
  text-shadow: 0 10px 30px var(--shadow-color);
}

.room-location {
  font-size: 24px;
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle-btn {
  font-size: 18px !important;
  font-weight: 700 !important;
  opacity: 0.6;
  display: flex !important;
  align-items: center;
  gap: 8px;
  padding: 8px 16px !important;
  background: transparent !important;
  border-radius: 12px !important;
  border: none !important;
  color: var(--display-text) !important;
  transition: all 0.3s ease;
}

.theme-toggle-btn :deep(.t-icon) {
    font-size: 20px;
}

.theme-toggle-btn:hover {
  opacity: 1;
  transform: scale(1.05);
  background: var(--glass-border) !important;
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr;
  gap: 30px;
  flex: 1;
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 32px;
  padding: 40px;
  box-shadow: 0 20px 50px var(--shadow-color);
  transition: all 0.5s ease;
}

.card-label {
  font-size: 18px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--card-label-color);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-label::before {
  content: '';
  width: 12px;
  height: 12px;
  background: var(--accent-color);
  border-radius: 50%;
}

/* 时间卡片 */
.time-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}

.digital-clock {
  font-size: 140px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 0.9;
  margin: 10px 0;
  letter-spacing: -3px;
  color: var(--display-text);
  display: flex;
  align-items: center;
}

.clock-colon {
    transition: opacity 0.2s ease;
    width: 0.3em;
    text-align: center;
    display: inline-block;
}

.clock-colon.is-hidden {
    opacity: 0;
}


.date-info {
  font-size: 28px;
  opacity: 0.8;
}

/* 状态卡片 */
.status-card {
  display: flex;
  flex-direction: column;
}

.status-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.status-card.is-busy {
  background: linear-gradient(135deg, rgba(63, 81, 181, 0.15), var(--glass-bg));
  border: 1px solid rgba(63, 81, 181, 0.3);
}

.light-mode .status-card.is-busy {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), var(--glass-bg));
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.status-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 8px;
  background: #f44336;
  color: white;
  font-size: 14px;
  font-weight: 800;
}

.status-tag.available {
  background: #10b981;
}

.label-group {
    display: flex;
    align-items: center;
    gap: 12px;
}

.label-group .card-label {
    margin-bottom: 0;
}

.booking-purpose {
  font-size: 48px;
  margin: 0;
  font-weight: 700;
  line-height: 1.2;
}

.booking-org {
  font-size: 24px;
  margin-top: 10px;
  opacity: 0.8;
}

.booking-time-range {
  font-size: 32px;
  margin-top: 24px;
  font-weight: 600;
  color: var(--accent-color-light);
}

/* 后续卡片 */
.next-card {
  grid-column: span 2;
  padding: 30px 40px;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.upcoming-list {
  display: flex;
  gap: 20px;
  overflow: hidden;
  flex-wrap: wrap;
}

.upcoming-item {
  flex: 1;
  min-width: 200px;
  background: rgba(255, 255, 255, 0.03);
  padding: 24px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.3s ease;
}

.light-mode .upcoming-item {
  background: rgba(0, 0, 0, 0.02);
}

.item-time {
  font-size: 24px;
  font-weight: 800;
  color: var(--accent-color-light);
}

.item-purpose {
  font-size: 20px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-org {
  font-size: 16px;
  opacity: 0.6;
}

.no-upcoming {
  font-size: 20px;
  opacity: 0.4;
  text-align: center;
  width: 100%;
  padding: 40px;
}

/* 按钮增强 */
.big-action-btn {
  height: 64px !important;
  font-size: 22px !important;
  padding: 0 32px !important;
  border-radius: 16px !important;
  border-width: 2px !important;
}

/* 状态页样式 */
.loading-state, .error-state {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 1;
}

.error-card {
  text-align: center;
  background: rgba(244, 67, 54, 0.1);
  padding: 60px;
  border-radius: 40px;
  border: 1px solid rgba(244, 67, 54, 0.3);
  backdrop-filter: blur(20px);
}

/* 列表动画 */
.list-enter-active, .list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from, .list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 表格适配 */
.week-schedule {
    padding: 20px 0;
}

.table-time-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.table-date {
    font-size: 14px;
    font-weight: 700;
    color: var(--accent-color-light);
}

.table-time {
    font-size: 16px;
}

.table-purpose {
    font-size: 16px;
    font-weight: 600;
}

.table-org {
    font-size: 14px;
    opacity: 0.7;
}

:deep(.display-dialog) {
  &.full-screen-dialog .t-dialog {
    width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    top: 0 !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }
  
  .t-dialog {
    background: var(--display-bg);
    backdrop-filter: blur(40px);
    border: 1px solid var(--glass-border);
    border-radius: 32px;
    color: var(--display-text);
    box-shadow: 0 30px 60px rgba(0,0,0,0.5);
  }

  .t-dialog__header {
    color: var(--display-text);
    font-size: 32px;
    font-weight: 800;
    padding: 40px 40px 0;
  }
  
  .t-dialog__body {
      padding: 40px;
      height: calc(100vh - 120px);
      overflow-y: auto;
  }
  
  .t-dialog__close {
      color: white !important;
      font-size: 48px;
      top: 24px;
      right: 24px;
      width: 80px;
      height: 80px;
      background: #f44336 !important;
      border-radius: 16px;
      display: flex !important;
      align-items: center;
      justify-content: center;
      opacity: 0.9;
      box-shadow: 0 10px 30px rgba(244, 67, 54, 0.4);
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: 100;

      &:hover { 
        opacity: 1;
        transform: scale(1.1) rotate(90deg);
        background: #d32f2f !important;
      }
      
      /* 强制居中图标 */
      svg {
          margin: 0 !important;
      }
  }

  /* 原生表格样式 - 彻底解决背景问题 */
  .custom-display-table {
    width: 100%;
    border-collapse: collapse;
    color: var(--display-text);
    background: transparent;
  }

  .custom-display-table th {
    text-align: left;
    padding: 24px;
    font-size: 16px;
    font-weight: 700;
    color: var(--card-label-color);
    border-bottom: 2px solid var(--glass-border);
    background: rgba(255, 255, 255, 0.05);
  }

  .light-mode & .custom-display-table th {
    background: rgba(0, 0, 0, 0.03);
  }

  .custom-display-table td {
    padding: 24px;
    border-bottom: 1px solid var(--glass-border);
    vertical-align: middle;
  }

  .custom-display-table tr:last-child td {
    border-bottom: none;
  }

  .custom-display-table tr:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .table-empty-cell {
    text-align: center;
    padding: 60px !important;
    font-size: 18px;
    color: var(--card-label-color);
    opacity: 0.5;
  }
}

@media (max-width: 1024px) {
  .grid-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  .next-card {
    grid-column: span 1;
  }
  .digital-clock {
    font-size: 80px;
  }
  .content-layout {
      padding: 20px;
  }
}
</style>
