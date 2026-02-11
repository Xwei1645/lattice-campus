<template>
  <div class="display-page" @click="toggleView">
    <!-- 加载状态 -->
    <div v-if="loading" class="center-state">
      <t-loading size="large" text="加载数据中..." inherit-color />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="center-state error-state">
      <t-icon name="error-circle-filled" size="clamp(3rem, 5vw, 4rem)" />
      <div class="error-text">{{ error }}</div>
      <div class="error-sub">请检查 URL 参数或联系管理员</div>
    </div>

    <!-- 正常显示内容 -->
    <template v-else>
      <transition name="fade" mode="out-in">
        <!-- 视图1: 状态看板 -->
        <div v-if="viewMode === 'status'" key="status" class="view-container status-view">
          <!-- 顶部：场地名与状态 -->
          <header class="page-header">
            <h1 class="room-title">{{ roomInfo?.name || '未知场地' }}</h1>
            <t-tag
              size="large"
              shape="mark"
              :theme="currentBooking ? 'danger' : 'success'"
              variant="light"
              class="status-tag"
            >
              {{ currentBooking ? '使用中' : '空闲' }}
            </t-tag>
          </header>

          <!-- 中部：核心信息 -->
          <main class="main-content">
            <template v-if="currentBooking">
              <div class="content-wrapper active">
                <div class="main-title">{{ currentBooking.purpose }}</div>
                <div class="sub-info organization">
                  <t-icon name="usergroup" /> {{ currentBooking.organizationName }}
                </div>
                <div class="time-range highlight">
                   <t-icon name="time" style="margin-right: 8px" />{{ formatTimeRange(currentBooking.startTime, currentBooking.endTime) }}
                </div>
              </div>
            </template>
            
            <template v-else>
              <div class="content-wrapper idle">
                <template v-if="nextBooking">
                  <div class="label-chip">即将开始</div>
                  <div class="main-title">{{ nextBooking.purpose }}</div>
                  <div class="sub-info organization">
                    <t-icon name="usergroup" /> {{ nextBooking.organizationName }}
                  </div>
                  <div class="time-range">
                     <t-icon name="time" style="margin-right: 8px" />{{ formatFullTime(nextBooking.startTime) }}-{{ formatTime(nextBooking.endTime) }}
                  </div>
                </template>
                <template v-else>
                  <div class="empty-state">
                    <t-icon name="info-circle" size="clamp(4rem, 8vw, 6rem)" />
                    <div class="empty-text">今日后续无预约</div>
                  </div>
                </template>
              </div>
            </template>
          </main>

          <!-- 底部：提示 (已移除点击切换提示) -->
          <footer class="page-footer"></footer>
        </div>

        <!-- 视图2:日程列表 -->
        <div v-else key="schedule" class="view-container schedule-view">
          <header class="schedule-header centered">
            <h2>未来 7 天预约</h2>
          </header>
          
          <div class="schedule-list-container">
            <div v-if="sortedDateKeys.length > 0" class="timeline-wrapper">
              <div v-for="dateKey in sortedDateKeys" :key="dateKey" class="date-group">
                <div class="date-header">{{ formatDateHeader(dateKey) }}</div>
                <div class="event-list">
                  <div v-for="item in groupedBookings[dateKey]" :key="item.id" class="event-card">
                    <div class="event-time-col">
                       <t-icon name="time" class="list-icon" />
                       <span class="event-time-text">
                         {{ formatTime(item.startTime) }}-{{ formatTime(item.endTime) }}
                       </span>
                    </div>
                    <div class="event-details-col">
                      <div class="event-name">{{ item.purpose }}</div>
                      <div class="event-org">
                        <t-icon name="usergroup" class="org-icon" />
                        {{ item.organizationName }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-schedule-view">
               <t-icon name="calendar" size="clamp(3rem, 5vw, 4rem)" />
               <p>暂无后续安排</p>
            </div>
          </div>
        </div>
      </transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import isBetween from 'dayjs/plugin/isBetween'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

dayjs.extend(isBetween)
dayjs.locale('zh-cn')

definePageMeta({ layout: false })

const route = useRoute()
const loading = ref(true)
const error = ref('')
const roomInfo = ref<any>(null)

useHead({
  title: computed(() => roomInfo.value ? `${roomInfo.value.name} - 场地展示` : '场地展示')
})

const bookings = ref<any[]>([])
const viewMode = ref<'status' | 'schedule'>('status')

// 数据获取
const fetchDisplayData = async () => {
  const room = route.query.room as string
  if (!room) {
    error.value = '未指定 room 参数'
    loading.value = false
    return
  }
  try {
    const res: any = await $fetch('/api/display/room', { query: { room } })
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

// 计算属性
const currentBooking = computed(() => {
  const now = dayjs()
  return bookings.value.find(b => now.isBetween(dayjs(b.startTime), dayjs(b.endTime), null, '[)'))
})

const nextBooking = computed(() => {
  const now = dayjs()
  const endOfDay = dayjs().endOf('day')
  // 找当前时间之后的第一个，限制在今天
  return bookings.value
    .filter(b => dayjs(b.startTime).isAfter(now) && dayjs(b.startTime).isBefore(endOfDay))
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())[0]
})

const groupedBookings = computed(() => {
  const now = dayjs()
  const limitDate = now.add(7, 'day').endOf('day')
  
  const futureBookings = bookings.value.filter(b => {
    const start = dayjs(b.startTime)
    return start.isAfter(now) && start.isBefore(limitDate)
  })

  // 按日期分组
  const groups: Record<string, any[]> = {}
  futureBookings.forEach(b => {
    const dateKey = dayjs(b.startTime).format('YYYY-MM-DD')
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(b)
  })
  
  return groups
})

const sortedDateKeys = computed(() => {
  return Object.keys(groupedBookings.value).sort()
})

// 时间格式化
const formatTime = (time: string | Date) => dayjs(time).format('HH:mm')
const formatTimeRange = (start: string | Date, end: string | Date) => {
  return `${dayjs(start).format('HH:mm')}-${dayjs(end).format('HH:mm')}`
}
const formatFullTime = (time: string | Date) => {
  const d = dayjs(time)
  // 如果是今天，只显示时间，否则显示日期+时间
  if (d.isSame(dayjs(), 'day')) return `今天 ${d.format('HH:mm')}`
  if (d.isSame(dayjs().add(1, 'day'), 'day')) return `明天 ${d.format('HH:mm')}`
  return d.format('MM-DD HH:mm')
}

const formatDateHeader = (dateStr: string) => {
  const d = dayjs(dateStr)
  if (d.isSame(dayjs(), 'day')) return '今天'
  if (d.isSame(dayjs().add(1, 'day'), 'day')) return '明天'
  return d.format('MM月DD日 dddd')
}

// 交互逻辑
const toggleView = () => {
  viewMode.value = viewMode.value === 'status' ? 'schedule' : 'status'
}

let inactivityTimer: any = null
const INACTIVITY_LIMIT = 30 * 1000 // 30秒无操作自动返回
const resetInactivityTimer = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  if (viewMode.value === 'schedule') {
    inactivityTimer = setTimeout(() => { viewMode.value = 'status' }, INACTIVITY_LIMIT)
  }
}

watch(viewMode, (val) => {
  if (val === 'schedule') {
    resetInactivityTimer()
    const events = ['mousemove', 'touchstart', 'click', 'keydown']
    events.forEach(e => window.addEventListener(e, resetInactivityTimer))
  } else {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    const events = ['mousemove', 'touchstart', 'click', 'keydown']
    events.forEach(e => window.removeEventListener(e, resetInactivityTimer))
  }
})

// 初始化与定时刷新
let dataTimer: any = null
onMounted(() => {
  fetchDisplayData()
  dataTimer = setInterval(fetchDisplayData, 60 * 1000) // 每分钟刷新
})

onUnmounted(() => {
  if (dataTimer) clearInterval(dataTimer)
  if (inactivityTimer) clearTimeout(inactivityTimer)
})
</script>

<style scoped>
.display-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--td-bg-color-container);
  color: var(--td-text-color-primary);
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  position: relative;
  user-select: none;
}

.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
}

.error-state {
  color: var(--td-error-color);
}
.error-text { font-size: clamp(1.2rem, 3vw, 1.8rem); font-weight: bold; }
.error-sub { font-size: clamp(1rem, 2vw, 1.4rem); color: var(--td-text-color-secondary); }

/* 视图容器 */
.view-container {
  width: 100%;
  height: 100%;
  padding: clamp(20px, 4vw, 40px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* 状态视图 (Status View) */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: clamp(16px, 3vh, 32px);
}

.room-title {
  font-size: clamp(2rem, 4vw, 3rem);
  margin: 0;
  font-weight: 800;
  color: var(--td-text-color-primary);
}

.status-tag {
  font-size: clamp(1.2rem, 2vw, 1.6rem);
  padding: 0.5em 1.5em;
  height: auto;
  border-radius: 8px;
  font-weight: bold;
}

.main-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.content-wrapper {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 3vh, 32px);
  width: 100%;
  max-width: 90%;
}

.main-title {
  font-size: clamp(3rem, 7vw, 6rem);
  font-weight: 900;
  line-height: 1.2;
  margin: 0;
  color: var(--td-text-color-primary);
}

.sub-info {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  color: var(--td-text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0.85;
}

.time-range {
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: bold;
  margin-top: clamp(10px, 2vh, 20px);
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-range.highlight {
  color: var(--td-brand-color);
}

.label-chip {
  font-size: clamp(1.2rem, 2vw, 1.8rem);
  color: var(--td-brand-color);
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 4px;
  margin-bottom: -10px;
  opacity: 0.9;
}

/* 空闲状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  color: var(--td-text-color-secondary);
  opacity: 0.7;
}
.empty-text {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 500;
}

/* 底部 */
.page-footer {
  text-align: center;
  padding-top: 20px;
  min-height: 20px;
}

/* 日程列表视图 (Schedule View) */
.schedule-view {
  background-color: var(--td-bg-color-container);
  padding-top: clamp(10px, 2vw, 20px);
  padding-bottom: 0;
}

.schedule-header {
  border-bottom: 2px solid var(--td-border-level-1-color);
  padding-bottom: clamp(8px, 1.5vh, 16px);
  margin-bottom: 0;
}
.schedule-header.centered {
  display: flex;
  justify-content: center;
}

.schedule-header h2 {
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  margin: 0;
  text-align: center;
}

.schedule-list-container {
  flex: 1;
  overflow-y: auto;
  /* 隐藏滚动条但保留功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.schedule-list-container::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.timeline-wrapper {
  padding-bottom: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.date-group {
  margin-bottom: clamp(20px, 4vh, 40px);
}

.date-header {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  font-weight: bold;
  color: var(--td-text-color-secondary);
  margin-bottom: 24px;
  background: var(--td-bg-color-container);
  padding: 10px 0;
  text-align: center;
}

.event-card {
  display: flex;
  align-items: center;
  padding: clamp(20px, 3vh, 32px) 0;
  gap: clamp(24px, 5vw, 64px);
}

/* 布局调整：左右对齐 */
.event-time-col {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  text-align: right;
  color: var(--td-brand-color);
}
.event-time-text {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  font-weight: bold;
}
.list-icon {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
}

.event-details-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  text-align: left;
  gap: 8px;
}

.event-name {
  font-size: clamp(1.8rem, 3.5vw, 3rem);
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.event-org {
  font-size: clamp(1.2rem, 2vw, 1.8rem);
  color: var(--td-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.org-icon {
  font-size: 1em;
}

.empty-schedule-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--td-text-color-disabled);
  gap: 16px;
}
.empty-schedule-view p {
  font-size: clamp(1.2rem, 2vw, 1.8rem);
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>


