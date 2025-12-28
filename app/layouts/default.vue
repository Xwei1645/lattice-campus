<template>
  <t-layout class="app-layout">
    <t-header class="app-header">
      <div class="logo-container">
        <span class="logo-text">Lattice Campus | 温州中学场地预约系统</span>
      </div>
      <t-head-menu theme="light" value="item1" class="header-menu">
        <template #operations>
          <div class="user-info-header">
            <t-tag theme="primary" variant="light" class="role-tag">{{ getRoleName(userInfo?.role) }}</t-tag>
            <t-dropdown trigger="click" @click="handleDropdownClick">
              <t-link theme="default" class="user-name-link">
                <span class="user-name-text">{{ userInfo?.name }} ({{ userInfo?.account }})</span>
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
      <t-aside class="app-aside">
        <t-menu theme="light" :value="$route.path" @change="handleMenuClick">
          <t-menu-item value="/" to="/">
            <template #icon><home-icon /></template>
            首页
          </t-menu-item>
          <t-menu-item v-if="isAdmin" value="/booking-management" to="/booking-management">
            <template #icon><assignment-icon /></template>
            预约审批
          </t-menu-item>
          <t-menu-item v-if="isAdmin" value="/room-management" to="/room-management">
            <template #icon><layers-icon /></template>
            场地管理
          </t-menu-item>
          <t-menu-item v-if="isAdmin" value="/account-management" to="/account-management">
            <template #icon><user-setting-icon /></template>
            用户管理
          </t-menu-item>
          <t-menu-item v-if="isAdmin" value="/organization-management" to="/organization-management">
            <template #icon><usergroup-icon /></template>
            组织管理
          </t-menu-item>
        </t-menu>
      </t-aside>
      <t-layout>
        <t-content class="app-content">
          <slot />
        </t-content>
        <t-footer class="app-footer">
          ©Xwei1645 2025 All Rights Reserved.
        </t-footer>
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
              <t-tag v-for="org in profileData.organizations" :key="org.id" variant="outline">
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
      :footer="false"
      width="min(450px, 95%)"
    >
      <div style="padding: 10px 0">
        <t-form :data="passwordData" :rules="passwordRules" label-align="top" @submit="onPasswordSubmit">
          <t-form-item label="旧密码" name="oldPassword">
            <t-input v-model="passwordData.oldPassword" type="password" placeholder="请输入旧密码" />
          </t-form-item>
          <t-form-item label="新密码" name="newPassword">
            <t-input v-model="passwordData.newPassword" type="password" placeholder="请输入新密码" />
          </t-form-item>
          <t-form-item label="确认新密码" name="confirmPassword">
            <t-input v-model="passwordData.confirmPassword" type="password" placeholder="请再次输入新密码" />
          </t-form-item>
          <t-form-item style="margin-top: 24px">
            <div style="display: flex; justify-content: flex-end; width: 100%">
              <t-button theme="primary" type="submit" :loading="passwordLoading">确认修改</t-button>
            </div>
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
  </t-layout>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { HomeIcon, UserSettingIcon, LogoutIcon, UsergroupIcon, AssignmentIcon, LayersIcon } from 'tdesign-icons-vue-next';

const route = useRoute();
const router = useRouter();

// 使用响应式对象存储用户信息
const userInfo = ref<any>(null);

// 在客户端从localStorage加载用户信息
onMounted(() => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      userInfo.value = JSON.parse(userStr);
    } catch {
      userInfo.value = null;
    }
  }
});

const isAdmin = computed(() => {
  const role = userInfo.value?.role;
  return ['root', 'super_admin', 'admin'].includes(role);
});

// 个人信息逻辑
const profileVisible = ref(false);
const passwordVisible = ref(false);
const passwordLoading = ref(false);

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

.user-name-text {
  font-size: 14px;
  color: var(--td-text-color-primary);
}

@media (max-width: 768px) {
  .user-name-text {
    display: none;
  }
  
  .logo-container {
    font-size: 18px;
    margin-right: 12px;
  }
  
  .app-header {
    padding: 0 12px;
  }
}

.org-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.app-aside {
  border-right: 1px solid var(--td-component-border);
}

.app-content {
  padding: 0;
  background-color: var(--td-bg-color-page);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.app-content > div {
  flex: 1;
}

.app-footer {
  padding: 16px;
  text-align: center;
  color: var(--td-text-color-placeholder);
  background-color: var(--td-bg-color-page);
  font-size: 12px;
}

/* 全局卡片样式统一 */
.page-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 768px) {
  .page-container {
    padding: 12px;
  }
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

/* 移除默认 margin */
body {
  margin: 0;
}
</style>
