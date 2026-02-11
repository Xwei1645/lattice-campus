<template>
  <div class="display-container light-mode">
    <!-- 动态背景 -->
    <div class="background-overlay"></div>

    <!-- 加载状态 -->
    <t-layout v-if="loading" class="state-container">
      <t-loading size="large" text="确认班牌数据中..." inherit-color />
    </t-layout>

    <!-- 错误状态 -->
    <t-layout v-else-if="error" class="state-container">
      <t-card :bordered="false" class="error-glass-card">
        <t-space direction="vertical" align="center" size="large">
          <t-icon name="error-circle-filled" size="80px" style="color: var(--td-error-color)" />
          <h2 class="error-title">{{ error }}</h2>
          <p class="error-desc">请检查 URL 参数或联系系统管理员</p>
        </t-space>
      </t-card>
    </t-layout>

    <!-- 主展示区域 -->
    <div v-else class="content-layout">
      <!-- 动态背景 -->
      <div class="background-overlay"></div>

      <!-- 核心内容卡片 -->
      <div class="main-display-card" :class="{ 'is-busy': currentBooking && viewMode === 'current' }">
        <transition name="fade" mode="out-in">
          
          <!-- 视图 1: 当前占用 - 使用纯原生 Flex 确保绝对居中 -->
          <div v-if="viewMode === 'current'" key="current" class="view-content">
            <!-- 1. 状态顶部 -->
            <div class="status-section">
              <span class="card-label">CURRENT STATUS</span>
              <t-tag 
                shape="round" 
                size="large" 
                class="status-tag-huge" 
                :theme="currentBooking ? 'danger' : 'success'"
              >
                {{ currentBooking ? '使用中' : '空闲中' }}
              </t-tag>
            </div>

            <!-- 2. 预约详情中间 -->
            <div class="details-section">
              <div v-if="currentBooking" class="details-flex">
                <h1 class="display-purpose">{{ currentBooking.purpose }}</h1>
                <span class="display-org">{{ currentBooking.organizationName }}</span>
                <div class="display-time-range">
                  <t-icon name="time" />
                  <span>{{ formatTime(currentBooking.startTime) }} - {{ formatTime(currentBooking.endTime) }}</span>
                </div>
              </div>
              <div v-else class="details-flex empty">
                <h1 class="empty-title">当前时段暂无预约</h1>
                <p class="empty-subtitle">您可以直接使用或通过扫码进行即时预约</p>
              </div>
            </div>

            <!-- 3. 操作区域底部：向下跳动的小箭头 -->
            <div class="action-section">
              <div class="scroll-hint-icon" @click="toggleView('upcoming')">
                <t-icon name="chevron-down" />
              </div>
            </div>
          </div>

          <!-- 视图 2: 后续安排 -->
          <div v-else key="upcoming" class="view-content">
            <!-- 顶部返回：向上箭头 -->
            <div class="action-section back-top">
              <div class="scroll-hint-icon up" @click="toggleView('current')">
                <t-icon name="chevron-up" />
              </div>
            </div>
            
            <div class="status-section">
              <span class="card-label">UPCOMING SCHEDULE</span>
            </div>
            
            <div class="upcoming-list-box">
              <div v-for="item in upcomingBookings" :key="item.id" class="td-schedule-row">
                <div class="row-time-box">
                  <t-tag variant="light-outline" theme="primary" size="large" class="time-tag">
                    {{ formatTime(item.startTime) }} - {{ formatTime(item.endTime) }}
                  </t-tag>
                </div>
                <div class="row-info-box">
                  <div class="row-p">{{ item.purpose }}</div>
                  <div class="row-o">{{ item.organizationName }}</div>
                </div>
              </div>
              <div v-if="upcomingBookings.length === 0" class="td-no-data">
                <t-icon name="article" size="64px" style="opacity: 0.1; margin-bottom: 16px;" />
                <div>今日后续暂无更多安排</div>
              </div>
            </div>
          </div>
        </transition>
      </div>
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

definePageMeta({ layout: false })

const route = useRoute()
const loading = ref(true)
const error = ref('')
const roomInfo = ref<any>(null)
const bookings = ref<any[]>([])
const viewMode = ref<'current' | 'upcoming'>('current')

const fetchDisplayData = async () => {
  const room = route.query.room as string
  if (!room) {
    error.value = '未指定教室参数 (room)'
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

const currentBooking = computed(() => {
  const now = dayjs()
  return bookings.value.find(b => now.isBetween(dayjs(b.startTime), dayjs(b.endTime), null, '[)'))
})

const upcomingBookings = computed(() => {
  const now = dayjs()
  const endOfDay = dayjs().endOf('day')
  return bookings.value.filter(b => dayjs(b.startTime).isAfter(now) && dayjs(b.startTime).isBefore(endOfDay))
})

const formatTime = (time: string) => dayjs(time).format('HH:mm')

// 自动返回逻辑
let inactivityTimer: any = null
const INACTIVITY_LIMIT = 5 * 60 * 1000 
const resetInactivityTimer = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  if (viewMode.value === 'upcoming') {
    inactivityTimer = setTimeout(() => { viewMode.value = 'current' }, INACTIVITY_LIMIT)
  }
}

const toggleView = (mode: 'current' | 'upcoming') => { viewMode.value = mode }

watch(viewMode, (val) => {
  if (val === 'upcoming') {
    resetInactivityTimer()
    const events = ['mousemove', 'touchstart', 'click', 'keydown']
    events.forEach(e => window.addEventListener(e, resetInactivityTimer))
  } else {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    const events = ['mousemove', 'touchstart', 'click', 'keydown']
    events.forEach(e => window.removeEventListener(e, resetInactivityTimer))
  }
})

let dataTimer: any = null
onMounted(() => {
  fetchDisplayData()
  dataTimer = setInterval(fetchDisplayData, 5 * 60 * 1000)
})
onUnmounted(() => {
  if (dataTimer) clearInterval(dataTimer)
  if (inactivityTimer) clearTimeout(inactivityTimer)
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #f8fafc;
}
</style>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/harmonyos-sans@1.0.0/css/harmonyos-sans.css');

.display-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  color: #1e293b;
  font-family: 'HarmonyOS Sans SC Black', sans-serif;
  overflow: hidden;
  z-index: 1;
}

.background-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, #dbeafe 0%, #f1f5f9 100%);
  z-index: 0;
}

.content-layout {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-display-card {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(40px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.main-display-card.is-busy {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(239, 246, 255, 0.95));
}

.view-content {
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

/* 顶部状态组 */
.status-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.card-label {
  font-size: 24px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 6px;
  line-height: 1;
}

.status-tag-huge {
  padding: 0 40px !important;
  height: 64px !important;
  font-size: 32px !important;
  font-weight: 900 !important;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

/* 中间详情组 - 绝对对称的核心 */
.details-section {
  margin: 60px 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.details-flex {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
}

.display-purpose {
  font-size: 110px;
  font-weight: 950;
  margin: 0;
  line-height: 1.1;
  color: #0f172a;
  text-align: center;
}

.display-org {
  font-size: 40px;
  opacity: 0.6;
  font-weight: 600;
}

.display-time-range {
  font-size: 80px;
  font-weight: 900;
  color: var(--td-brand-color);
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
}

.empty-title {
  font-size: 90px;
  font-weight: 950;
  color: #475569;
  margin: 0;
}

.empty-subtitle {
  font-size: 32px;
  opacity: 0.4;
  font-weight: 600;
}

/* 后续安排列表布局 */
.upcoming-list-box {
  width: 100%;
  max-width: 1000px;
  margin: 40px 0 60px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.td-schedule-row {
  background: rgba(255, 255, 255, 0.4);
  padding: 24px 40px;
  border-radius: 32px;
  display: flex;
  align-items: center;
  gap: 40px;
  width: 100%;
}

.row-time-box {
  min-width: 280px;
}

.time-tag {
  font-size: 32px !important;
  height: 64px !important;
  font-weight: 900 !important;
  width: 100%;
}

.row-info-box {
  flex: 1;
  text-align: left;
}

.row-p {
  font-size: 32px;
  font-weight: 800;
  color: #1e293b;
}

.row-org {
  font-size: 20px;
  opacity: 0.5;
}

.td-no-data {
  width: 100%;
  padding: 120px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  opacity: 0.2;
  font-weight: 800;
}

/* 引导箭头样式 */
.action-section {
  width: 100%;
  display: flex;
  justify-content: center;
  position: absolute;
  bottom: 60px;
}

.action-section.back-top {
  position: absolute;
  top: 60px;
  bottom: auto;
}

.scroll-hint-icon {
  font-size: 64px;
  color: var(--td-brand-color);
  cursor: pointer;
  opacity: 0.4;
  transition: all 0.3s ease;
}

/* 状态页 */
.state-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

.error-glass-card {
  padding: 80px;
  background: white;
  border-radius: 48px;
  box-shadow: 0 40px 100px rgba(0,0,0,0.05);
}

.error-title { font-size: 40px; font-weight: 900; }

/* 动画 - 原地淡入淡出 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@media (max-width: 1280px) {
  .display-purpose { font-size: 80px; }
  .display-time-range { font-size: 56px; }
}
</style>

