<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">关于</h2>
      <div class="header-actions">
        <t-button theme="primary" @click="handleFeedback">
          <template #icon><t-icon name="chat" /></template>
          意见反馈
        </t-button>
      </div>
    </div>
    <t-card :bordered="false" class="content-card">
      <div class="about-content">
        <div class="section">
          <div class="section-title">项目简介</div>
          <p class="section-text">
            WZHS Booking 是为校园场景开发的场地预约管理系统。旨在简化校园场地的申请、审批和管理流程，提高资源利用效率，为师生提供便捷的场地使用体验。
          </p>
        </div>

        <div class="section">
          <div class="section-title">碎碎念</div>
          <p class="section-text">
            vibe coding 真好吃:) WSL 大抵不会流畅到哪里去罢（（
          </p>
        </div>

        <div class="section">
          <div class="section-title">技术栈</div>
          <p class="section-text">本项目使用了以下优秀的技术栈：</p>
          <ul class="tech-list">
            <li>
              <t-link href="https://nuxt.com/" target="_blank" theme="primary">Nuxt 4</t-link>
              <span class="tech-desc"> - 全栈 Vue 框架</span>
            </li>
            <li>
              <t-link href="https://vuejs.org/" target="_blank" theme="primary">Vue 3</t-link>
              <span class="tech-desc"> - 渐进式 JavaScript 框架</span>
            </li>
            <li>
              <t-link href="https://tdesign.tencent.com/" target="_blank" theme="primary">TDesign Vue Next</t-link>
              <span class="tech-desc"> - 企业级设计语言和组件库</span>
            </li>
            <li>
              <t-link href="https://www.prisma.io/" target="_blank" theme="primary">Prisma</t-link>
              <span class="tech-desc"> - 下一代 Node.js 和 TypeScript ORM</span>
            </li>
          </ul>
        </div>

        <div class="section">
          <div class="section-title">致谢</div>
          <p class="section-text">
            特别感谢团委学联对本项目的大力支持。
          </p>
          <p class="section-text">
            感谢 <t-link href="https://github.com/education" target="_blank" theme="primary">GitHub Education</t-link> Benefits 提供的 Copilot Pro。
          </p>
        </div>

        <div class="section">
          <div class="section-title">帮助</div>
          <p class="section-text">
            如需帮助请联系校管理员。
          </p>
        </div>
      </div>

      <div class="secret-trigger" :class="{ 'animate': isAnimating }" @click="handleSecretClick">
        <img :src="quanweiImage" alt="quanwei" />
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
useHead({ title: '关于' })

const quanweiImage = '/images/quanwei.png'

const showDebug = useState('showDebug', () => false)
const clickCount = ref(0)
const isAnimating = ref(false)
let timer: any = null

const handleFeedback = () => {
  navigateTo('/feedback')
}

const handleSecretClick = () => {
  // 触发点击动画
  isAnimating.value = true
  setTimeout(() => {
    isAnimating.value = false
  }, 100)

  // 清除之前的重置定时器
  if (timer) clearTimeout(timer)
  
  clickCount.value++
  
  if (clickCount.value >= 10) {
    if (import.meta.client) {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          // 只有超级管理员可以激活调试页面
          if (user.role === 'super_admin') {
            showDebug.value = true
            localStorage.setItem('showDebugMenu', 'true')
            MessagePlugin.success('调试模式已激活')
            navigateTo('/debug')
          }
        }
      } catch (e) {
        console.error('Failed to parse user from localStorage', e)
      }
    }
    clickCount.value = 0
  } else {
    // 800ms内没有连续点击则重置计数
    timer = setTimeout(() => {
      clickCount.value = 0
    }, 800)
  }
}
</script>

<style scoped>
.about-content {
  padding: 8px 0 80px 0;
}

.section {
  padding: 8px 0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 18px;
  background-color: var(--td-brand-color);
  margin-right: 12px;
  border-radius: var(--td-radius-small);
}

.section-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--td-text-color-secondary);
  margin: 0 0 8px 0;
}

.tech-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0 0;
}

.tech-list li {
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--td-text-color-secondary);
  display: flex;
  align-items: center;
}

.tech-list li::before {
  content: '•';
  color: var(--td-brand-color);
  margin-right: 8px;
  font-weight: bold;
}

.tech-desc {
  color: var(--td-text-color-placeholder);
  margin-left: 4px;
}

.content-card {
  position: relative;
}

.secret-trigger {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: 80px;
  height: 80px;
  cursor: pointer;
  transition: transform 0.1s ease;
  z-index: 10;
  user-select: none;
}

.secret-trigger img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.secret-trigger.animate {
  transform: scale(0.9);
}

.secret-trigger:hover img {
  opacity: 1;
}
</style>
