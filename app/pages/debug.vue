<template>
  <div class="page-container">
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
      <h2 class="page-title">调试</h2>
      <t-button variant="outline" @click="handleHide">隐藏调试页面</t-button>
    </div>
    <t-card :bordered="false" class="content-card">
      <div class="debug-content">
        <div class="debug-section">
          <div class="section-title">操作</div>
          <t-space>
            <t-button theme="primary" :loading="loading" @click="handleConfirmLoad">
              加载示例数据
            </t-button>
          </t-space>
        </div>

        <div class="debug-section" style="margin-top: 24px;">
          <div class="section-title">构建信息</div>
          <t-descriptions :column="1" bordered>
            <t-descriptions-item label="版本">{{ buildInfo.version }}</t-descriptions-item>
            <t-descriptions-item label="Git Hash">{{ buildInfo.gitHash }}</t-descriptions-item>
            <t-descriptions-item label="环境">{{ buildInfo.env }}</t-descriptions-item>
            <t-descriptions-item label="Nuxt 版本">{{ buildInfo.nuxtVersion }}</t-descriptions-item>
            <t-descriptions-item label="Vue 版本">{{ buildInfo.vueVersion }}</t-descriptions-item>
            <t-descriptions-item label="构建时间">{{ buildInfo.buildTime }}</t-descriptions-item>
          </t-descriptions>
        </div>

        <div class="debug-section" style="margin-top: 24px;">
          <div class="section-title">系统信息</div>
          <t-descriptions :column="1" bordered>
            <t-descriptions-item label="User Agent">{{ browserInfo.ua }}</t-descriptions-item>
            <t-descriptions-item label="平台">{{ browserInfo.platform }}</t-descriptions-item>
            <t-descriptions-item label="屏幕分辨率">{{ browserInfo.screen }}</t-descriptions-item>
            <t-descriptions-item label="窗口大小">{{ browserInfo.windowSize }}</t-descriptions-item>
            <t-descriptions-item label="语言">{{ browserInfo.language }}</t-descriptions-item>
            <t-descriptions-item label="Cookie 状态">{{ browserInfo.cookieEnabled ? '启用' : '未启用' }}</t-descriptions-item>
          </t-descriptions>
        </div>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
useHead({ title: '调试' })

const showDebug = useState('showDebug', () => false)

// 允许开发环境或超级管理员访问
if (import.meta.client) {
  try {
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    if (!import.meta.env.DEV && user?.role !== 'super_admin' && localStorage.getItem('showDebugMenu') !== 'true') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Page Not Found',
        fatal: true
      })
    }
  } catch (e) {
    if (!import.meta.env.DEV) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Page Not Found',
        fatal: true
      })
    }
  }
}

const browserInfo = ref({
  ua: 'Loading...',
  platform: 'Loading...',
  screen: 'Loading...',
  windowSize: 'Loading...',
  language: 'Loading...',
  cookieEnabled: false
})

const config = useRuntimeConfig()
const buildInfoData = config.public.buildInfo as any
const buildInfo = {
  env: import.meta.env.MODE,
  version: buildInfoData?.version || 'unknown',
  gitHash: buildInfoData?.gitHash || 'unknown',
  nuxtVersion: buildInfoData?.nuxtVersion || 'unknown',
  vueVersion: buildInfoData?.vueVersion || 'unknown',
  buildTime: buildInfoData?.buildTime ? dayjs(buildInfoData.buildTime).format('YYYY-MM-DD HH:mm:ss') : 'unknown'
}

if (import.meta.client) {
  const ua = navigator.userAgent

  browserInfo.value = {
    ua: ua,
    platform: navigator.platform,
    screen: `${window.screen.width} x ${window.screen.height} (DPR: ${window.devicePixelRatio})`,
    windowSize: `${window.innerWidth} x ${window.innerHeight}`,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled
  }
}

const handleHide = () => {
  showDebug.value = false
  localStorage.setItem('showDebugMenu', 'false')
  MessagePlugin.info('调试页面已隐藏')
  navigateTo('/about')
}

const loading = ref(false)

const handleConfirmLoad = () => {
  const confirmDialog = DialogPlugin.confirm({
    header: '确认加载示例数据？',
    body: '这将清空现有数据（保留 system 账号）并加载预设的示例数据。此操作不可逆。',
    onConfirm: async () => {
      confirmDialog.hide()
      await handleLoadExampleData()
    },
  })
}

const handleLoadExampleData = async () => {
  loading.value = true
  try {
    const response = await ($fetch as any)('/api/debug/seed', {
      method: 'POST'
    })
    if (response.success) {
      MessagePlugin.success(`示例数据加载成功: ${response.details.users}个用户, ${response.details.orgs}个组织, ${response.details.rooms}个场地, ${response.details.bookings}条预约`)
    }
  } catch (error: any) {
    MessagePlugin.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.debug-content {
  padding: 16px 0;
}
.debug-section {
  width: 100%;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--td-text-color-primary);
}
</style>
