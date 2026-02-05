<template>
  <t-layout class="app-layout">
    <t-header class="app-header">
      <div class="logo-container">
        <span class="logo-text">WZHS Booking</span>
      </div>
      <t-head-menu theme="light" value="item1" class="header-menu">
        <template #operations>
          <div class="user-info-header">
            <t-tag theme="primary" variant="light" class="role-tag">{{ getRoleName(userInfo?.role) }}</t-tag>
            <t-dropdown trigger="click" @click="handleDropdownClick">
              <t-link theme="default" class="user-name-link">
                <t-icon name="user-circle" class="user-avatar-icon" />
                <span class="user-name-text">{{ userInfo?.name }} ({{ userInfo?.account }})</span>
                <t-icon name="chevron-down" class="chevron-icon" />
              </t-link>
              <t-dropdown-menu>
                <t-dropdown-item value="profile">个人信息</t-dropdown-item>
                <t-dropdown-item value="password">修改密码</t-dropdown-item>
                <t-dropdown-item value="logout">退出登录</t-dropdown-item>
              </t-dropdown-menu>
            </t-dropdown>
          </div>
        </template>
      </t-head-menu>
    </t-header>
    <t-layout>
      <t-aside class="app-aside" width="180px">
        <t-menu theme="light" :value="$route.path" @change="handleMenuClick" style="width: 100%">
          <t-menu-item value="/" to="/">
            <template #icon><t-icon name="home" /></template>
            首页
          </t-menu-item>
          <t-menu-item value="/my-bookings" to="/my-bookings">
            <template #icon><t-icon name="view-module" /></template>
            我的预约
          </t-menu-item>
          <t-menu-item value="/overview" to="/overview">
            <template #icon><t-icon name="calendar" /></template>
            总览
          </t-menu-item>
          <t-menu-item value="/feedback" to="/feedback">
            <template #icon><t-icon name="chat" /></template>
            意见反馈
          </t-menu-item>

          <template v-if="isAdmin">
            <t-divider style="margin: 8px 0" />
            <t-menu-item value="/booking-management" to="/booking-management">
              <template #icon><t-icon name="assignment" /></template>
              预约审批
            </t-menu-item>
            <t-menu-item value="/auto-approval" to="/auto-approval">
              <template #icon><t-icon name="control-platform" /></template>
              自动审批规则
            </t-menu-item>
            <t-menu-item value="/room-management" to="/room-management">
              <template #icon><t-icon name="location" /></template>
              场地管理
            </t-menu-item>
            <t-menu-item value="/account-management" to="/account-management">
              <template #icon><t-icon name="user-setting" /></template>
              用户管理
            </t-menu-item>
            <t-menu-item value="/organization-management" to="/organization-management">
              <template #icon><t-icon name="usergroup" /></template>
              组织管理
            </t-menu-item>
            <t-menu-item value="/invitation-code-management" to="/invitation-code-management">
              <template #icon><t-icon name="root-list" /></template>
              邀请码管理
            </t-menu-item>
            <t-menu-item value="/notice-management" to="/notice-management">
              <template #icon><t-icon name="notification" /></template>
              通知管理
            </t-menu-item>
            <t-menu-item value="/feedback-management" to="/feedback-management">
              <template #icon><t-icon name="chat-bubble-help" /></template>
              反馈管理
            </t-menu-item>
          </template>

          <t-divider style="margin: 8px 0" />
          <t-menu-item value="/about" to="/about">
            <template #icon><t-icon name="info-circle" /></template>
            关于
          </t-menu-item>
          <t-menu-item v-if="showDebug" value="/debug" to="/debug">
            <template #icon><t-icon name="bug" /></template>
            调试
          </t-menu-item>
        </t-menu>
      </t-aside>
      <t-layout>
        <t-content class="app-content">
          <slot />
        </t-content>
      </t-layout>
    </t-layout>

    <!-- 个人信息对话框 -->
    <t-dialog
      v-model:visible="profileVisible"
      header="个人信息"
      :footer="false"
      width="min(500px, 95%)"
    >
      <div style="padding: 10px 0">
        <t-descriptions :column="1" bordered>
          <t-descriptions-item label="用户 ID">{{ profileData.id }}</t-descriptions-item>
          <t-descriptions-item label="用户名">{{ profileData.account }}</t-descriptions-item>
          <t-descriptions-item label="姓名">{{ profileData.name }}</t-descriptions-item>
          <t-descriptions-item label="角色">
            <t-tag theme="primary" variant="light">{{ getRoleName(profileData.role) }}</t-tag>
          </t-descriptions-item>
          <t-descriptions-item label="所属组织">
            <div v-if="profileData.organizations && profileData.organizations.length > 0" class="org-tags">
              <t-tag v-for="org in profileData.organizations" :key="org.id" variant="light">
                {{ org.name }}
              </t-tag>
            </div>
            <span v-else style="color: var(--td-text-color-placeholder)">暂无所属组织</span>
          </t-descriptions-item>
        </t-descriptions>
      </div>
    </t-dialog>

    <!-- 修改密码对话框 -->
    <t-dialog
      v-model:visible="passwordVisible"
      header="修改密码"
      :confirm-btn="{ content: '确认修改', loading: passwordLoading }"
      width="min(450px, 95%)"
      @confirm="() => passwordFormRef?.submit()"
    >
      <div style="padding: 10px 0">
        <t-form ref="passwordFormRef" :data="passwordData" :rules="passwordRules" label-align="top" @submit="onPasswordSubmit">
          <t-form-item label="旧密码" name="oldPassword">
            <t-input v-model="passwordData.oldPassword" type="password" placeholder="请输入旧密码" variant="filled" />
          </t-form-item>
          <t-form-item label="新密码" name="newPassword">
            <t-input v-model="passwordData.newPassword" type="password" placeholder="请输入新密码" variant="filled" />
          </t-form-item>
          <t-form-item label="确认新密码" name="confirmPassword">
            <t-input v-model="passwordData.confirmPassword" type="password" placeholder="请再次输入新密码" variant="filled" />
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>

    <!-- 通知弹窗 -->
    <t-dialog
      v-model:visible="noticePopupVisible"
      :header="popupNotice?.title"
      :footer="false"
      width="min(500px, 95%)"
    >
      <div v-if="popupNotice" class="notice-popup-content">
        <div class="notice-popup-meta">
          <t-tag :theme="getTypeTheme(popupNotice.type)" variant="light" size="small">{{ getTypeText(popupNotice.type) }}</t-tag>
          <span style="margin-left: 12px; color: var(--td-text-color-placeholder); font-size: 12px">
            {{ formatDateTime(popupNotice.createTime) }}
          </span>
        </div>
        <div class="notice-popup-body" style="margin-top: 16px; line-height: 1.6; white-space: pre-wrap;">
          {{ popupNotice.content }}
        </div>
        <div style="margin-top: 24px; text-align: right;">
          <t-button theme="primary" @click="noticePopupVisible = false">我知道了</t-button>
        </div>
      </div>
    </t-dialog>
  </t-layout>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { formatDateTime } from '~/utils/format';

const route = useRoute();
const router = useRouter();

const isDev = import.meta.env.DEV;
const showDebug = useState('showDebug', () => false);

// 使用响应式对象存储用户信息
const userInfo = ref<any>(null);

// 通知弹窗
const noticePopupVisible = ref(false);
const popupNotice = ref<any>(null);

const fetchPopupNotice = async () => {
    try {
        const notices: any[] = await ($fetch as any)('/api/notices');
        // 查找最新的需要弹窗的通知
        const popup = notices.find(n => n.showPopup && n.status === 'published');
        if (popup) {
            // 简单的防重复：如果本次会话已经显示过该 ID，则不再显示
            const shownList = JSON.parse(sessionStorage.getItem('shown_notices') || '[]');
            if (!shownList.includes(popup.id)) {
                popupNotice.value = popup;
                noticePopupVisible.value = true;
                shownList.push(popup.id);
                sessionStorage.setItem('shown_notices', JSON.stringify(shownList));
            }
        }
    } catch (error) {
        console.error('Failed to fetch popup notice:', error);
    }
};

const getTypeText = (type: string) => {
  const map: any = {
    info: '普通',
    success: '通知',
    warning: '重要',
    danger: '紧急'
  }
  return map[type] || type
}

const getTypeTheme = (type: string): "danger" | "primary" | "default" | "warning" | "success" => {
  const map: any = {
    info: 'primary',
    success: 'success',
    warning: 'warning',
    danger: 'danger'
  }
  return map[type] || 'default'
}

// 在客户端从localStorage加载用户信息
onMounted(() => {
  showDebug.value = localStorage.getItem('showDebugMenu') === 'true';
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      userInfo.value = JSON.parse(userStr);
    } catch {
      userInfo.value = null;
    }
  }
  fetchPopupNotice();
});

const isAdmin = computed(() => {
  const role = userInfo.value?.role;
  return ['root', 'super_admin', 'admin'].includes(role);
});

// 个人信息逻辑
const profileVisible = ref(false);
const passwordVisible = ref(false);
const passwordLoading = ref(false);
const passwordFormRef = ref<any>(null);

const profileData = reactive({
  id: null as number | null,
  account: '',
  name: '',
  role: '',
  organizations: [] as any[],
});

// 修改密码逻辑
const passwordData = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const passwordRules: any = {
  oldPassword: [{ required: true, message: '旧密码不能为空', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '新密码不能为空', trigger: 'blur' },
    { min: 6, message: '新密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (val: string) => val === passwordData.newPassword,
      message: '两次输入的密码不一致',
      trigger: 'blur',
    },
  ],
};

const getRoleName = (role: string) => {
  const map: Record<string, string> = {
    root: '根管理员',
    super_admin: '超级管理员',
    admin: '管理员',
    user: '普通用户',
  };
  return map[role] || role;
};

const handleDropdownClick = async (data: any) => {
  if (data.value === 'logout') {
    handleLogout();
  } else if (data.value === 'password') {
    passwordVisible.value = true;
  } else if (data.value === 'profile') {
    // 打开个人信息前，先获取最新数据
    try {
      const user: any = await $fetch('/api/auth/me');
      Object.assign(profileData, {
        id: user.id,
        account: user.account,
        name: user.name,
        role: user.role,
        organizations: user.organizations || [],
      });
      // 同步更新本地存储
      localStorage.setItem('user', JSON.stringify(user));
      userInfo.value = user;
      profileVisible.value = true;
    } catch (error) {
      // 如果获取失败，使用缓存数据
      if (userInfo.value) {
        Object.assign(profileData, {
          id: userInfo.value.id,
          account: userInfo.value.account,
          name: userInfo.value.name,
          role: userInfo.value.role,
          organizations: userInfo.value.organizations || [],
        });
        profileVisible.value = true;
      } else {
        MessagePlugin.error('获取用户信息失败');
      }
    }
  }
};

const onPasswordSubmit = async ({ validateResult, firstError }: any) => {
  if (validateResult === true) {
    passwordLoading.value = true;
    try {
      await $fetch('/api/auth/update-profile', {
        method: 'POST',
        body: {
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        }
      });

      MessagePlugin.success('密码修改成功');
      // 重置密码表单并关闭对话框
      passwordData.oldPassword = '';
      passwordData.newPassword = '';
      passwordData.confirmPassword = '';
      passwordVisible.value = false;
    } catch (error: any) {
      MessagePlugin.error(error.data?.statusMessage || '修改失败');
    } finally {
      passwordLoading.value = false;
    }
  } else {
    MessagePlugin.error(firstError);
  }
};

const handleLogout = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // 即使logout API失败也继续清理本地状态
  }
  userInfo.value = null;
  localStorage.removeItem('user');
  navigateTo('/login');
};

const handleMenuClick = (value: any) => {
  router.push(value);
};
</script>

<style>
.app-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.app-layout > .t-layout {
  flex: 1;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  padding: 0 24px;
  background-color: #fff;
  border-bottom: 1px solid var(--td-component-border);
  z-index: 100;
}

.logo-container {
  flex-shrink: 0;
  margin-right: 24px;
  font-size: 20px;
  font-weight: bold;
  color: var(--td-brand-color);
  white-space: nowrap;
}

.header-menu {
  flex: 1;
  min-width: 0;
}

.user-info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 8px;
}

.role-tag {
  margin-right: 4px;
}

.user-name-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.user-avatar-icon {
  font-size: 18px;
  color: var(--td-text-color-secondary);
}

.chevron-icon {
  color: var(--td-text-color-placeholder);
}

.user-name-text {
  font-size: 14px;
  color: var(--td-text-color-primary);
}

.org-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.app-aside {
  border-right: 1px solid var(--td-component-border);
  position: relative;
  z-index: 1;
  overflow: hidden;
}

/* 强制菜单宽度跟随父容器，防止出现232px的默认宽度背景块 */
:deep(.t-default-menu) {
  width: 100% !important;
}

/* 适配 180px 侧边栏的内边距 */
:deep(.t-default-menu .t-menu__item) {
  padding-left: 16px;
  padding-right: 12px;
  margin-bottom: 4px;
}
:deep(.t-default-menu .t-menu__item .t-icon) {
  margin-right: 8px;
}

/* 修复侧边栏下方重复页脚问题 */
.app-aside + .t-layout {
  flex: 1;
}

.app-content {
  padding: 0;
  background-color: var(--td-bg-color-page);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-content > div {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

/* 全局卡片样式统一 */
.page-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0 auto;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--td-text-color-primary);
}

.content-card {
  width: 100%;
  border-radius: var(--td-radius-medium);
  box-shadow: 0 1px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  background-color: var(--td-bg-color-container);
  box-sizing: border-box;
}

.content-card:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

/* 统一表格样式 */
:deep(.t-table) {
  background-color: transparent;
}

:deep(.t-table th) {
  background-color: var(--td-bg-color-secondarycontainer) !important;
  font-weight: 600;
}

:deep(.t-table td) {
  padding: 12px 16px !important;
  white-space: nowrap;
}

/* 移除默认 margin 并防止全屏滚动 */
body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

.app-footer {
  padding: 16px;
  text-align: center;
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  background-color: var(--td-bg-color-page);
}
</style>
