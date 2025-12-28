<template>
  <div class="page-container">
    <t-card title="关于" :bordered="false" class="content-card">
      <div class="about-content">
        <div class="section">
          <div class="section-title">项目简介</div>
          <p class="section-text">
            Lattice Campus 是为校园场景开发的场地预约管理系统。旨在简化校园场地的申请、审批和管理流程，提高资源利用效率，为师生提供便捷的场地使用体验。
          </p>
        </div>

        <div class="section">
          <div class="section-title">碎碎念</div>
          <p class="section-text">
            开发 Lattice Campus 的想法始于 2025 年 12 月 22 日学联大会对办公组中空间组的介绍。一个人在短时间内搭建出这样相对完善的框架并不容易，但 Vibe Coding 改变了这一切。
          </p>
        </div>

        <div class="section">
          <div class="section-title">技术栈</div>
          <p class="section-text">本项目使用了以下优秀的技术栈：</p>
          <ul class="tech-bullet-list">
            <li><t-link href="https://nuxt.com/" target="_blank" theme="primary" hover="color">Nuxt 4</t-link> - 全栈 Vue 框架</li>
            <li><t-link href="https://vuejs.org/" target="_blank" theme="primary" hover="color">Vue 3</t-link> - 渐进式 JavaScript 框架</li>
            <li><t-link href="https://tdesign.tencent.com/" target="_blank" theme="primary" hover="color">TDesign Vue Next</t-link> - 企业级设计语言和组件库</li>
            <li><t-link href="https://www.prisma.io/" target="_blank" theme="primary" hover="color">Prisma</t-link> - 下一代 Node.js 和 TypeScript ORM</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-title">致谢</div>
          <p class="section-text">
            特别感谢团委学联对本项目的大力支持。
          </p>
          <p class="section-text">
            感谢 <t-link href="https://github.com/education" target="_blank" theme="primary" hover="color">GitHub Education</t-link> Benefits 提供的 Copilot Pro。
          </p>
        </div>

        <div class="section">
          <div class="section-title">帮助</div>
          <p class="section-text">
            如需帮助请联系校管理员。
          </p>
        </div>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.about-content {
  padding: 8px 0;
}

.section {
  padding: 16px 0;
}

.section:first-child {
  padding-top: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.section-title::before {
  content: '';
  width: 3px;
  height: 16px;
  background-color: var(--td-brand-color);
  margin-right: 8px;
  border-radius: var(--td-radius-small);
}

.section-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--td-text-color-secondary);
  margin: 0;
}

.tech-bullet-list {
  padding-left: 20px;
  margin: 0;
  color: var(--td-text-color-secondary);
  font-size: 14px;
  line-height: 2;
}

.tech-bullet-list li {
  margin-bottom: 4px;
}
</style>
