<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1 class="logo-text">WZHS Booking</h1>
        <p class="sub-title">温州中学场地预约系统</p>
      </div>

      <!-- 账密登录表单 -->
      <t-form
        ref="form"
        :data="formData"
        :rules="rules"
        label-width="0"
        @submit="onSubmit"
      >
        <t-form-item name="account">
          <t-input
            v-model="formData.account"
            placeholder="请输入用户名"
            size="large"
            variant="filled"
          >
            <template #prefix-icon>
              <t-icon name="user" />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item name="password">
          <t-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            variant="filled"
          >
            <template #prefix-icon>
              <t-icon name="lock-on" />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item class="remember-me">
          <t-checkbox v-model="formData.remember">保持登录状态 7 天</t-checkbox>
        </t-form-item>

        <t-form-item>
          <t-button
            theme="primary"
            type="submit"
            block
            size="large"
            :loading="loading"
          >
            <template #icon><t-icon name="login" /></template>
            登录
          </t-button>
        </t-form-item>
      </t-form>

      <!-- 分隔线 -->
      <t-divider class="divider">或</t-divider>

      <!-- 钉钉登录按钮 -->
      <t-button
        theme="default"
        variant="outline"
        block
        size="large"
        class="dingtalk-btn"
        @click="openDingtalkLogin"
      >
        <template #icon>
          <t-icon name="logo-dingtalk" color="#0052d9" />
        </template>
        使用钉钉登录
      </t-button>

      <div class="login-footer">
        <p class="contact-admin">
          没有账号？
          <t-link theme="primary" underline @click="navigateTo('/register')">立即注册</t-link>
        </p>
        <p class="contact-admin" style="margin-top: 8px;">重置密码请联系校管理员</p>
      </div>
    </div>

    <p class="copyright">© 2025-2026 Xwei1645. All Rights Reserved.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import type { FormRules } from 'tdesign-vue-next';

definePageMeta({
  layout: false,
});

useHead({ title: '登录' });

const loading = ref(false);
const dingtalkLoginWindow = ref<Window | null>(null);
const dingtalkCheckInterval = ref<NodeJS.Timeout | null>(null);

const formData = reactive({
  account: '',
  password: '',
  remember: true,
});

const rules: FormRules = {
  account: [{ required: true, message: '用户名不能为空', trigger: 'blur' }],
  password: [{ required: true, message: '密码不能为空', trigger: 'blur' }],
};

const onSubmit = async ({ validateResult, firstError }: any) => {
  if (validateResult === true) {
    loading.value = true;
    try {
      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: {
          account: formData.account,
          password: formData.password
        }
      });
      
      MessagePlugin.success('登录成功');
      localStorage.setItem('user', JSON.stringify(response));
      navigateTo('/');
    } catch (error: any) {
      MessagePlugin.error(error.data?.statusMessage || '登录失败，请检查用户名或密码');
    } finally {
      loading.value = false;
    }
  } else {
    MessagePlugin.error(firstError);
  }
};

const route = useRoute();

// 打开钉钉登录窗口（弹出窗口）
const openDingtalkLogin = () => {
  const state = Date.now().toString();
  // 打开桥接页面
  const bridgeUrl = `/dingtalk-bridge.html?state=${state}`;
  
  // 打开居中弹窗
  const width = 600;
  const height = 700;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  
  dingtalkLoginWindow.value = window.open(
    bridgeUrl,
    'dingtalkLogin',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
  
  // 监听窗口关闭
  dingtalkCheckInterval.value = setInterval(() => {
    if (dingtalkLoginWindow.value && dingtalkLoginWindow.value.closed) {
      if (dingtalkCheckInterval.value) {
        clearInterval(dingtalkCheckInterval.value);
        dingtalkCheckInterval.value = null;
      }
      dingtalkLoginWindow.value = null;
      // 窗口关闭后，检查是否已登录
      checkLoginStatus();
    }
  }, 500);
};

// 检查登录状态
const checkLoginStatus = async () => {
  try {
    // 尝试获取当前用户信息，如果已登录则会返回用户信息
    const response = await $fetch('/api/auth/me', {
      credentials: 'include'
    });
    if (response) {
      MessagePlugin.success('登录成功');
      localStorage.setItem('user', JSON.stringify(response));
      window.location.href = '/';
    }
  } catch (error) {
    // 未登录，不做处理
    console.log('Not logged in yet');
  }
};

// 处理来自桥接页面的消息
const handleBridgeMessage = (event: MessageEvent) => {
  const data = event.data;
  
  if (data && typeof data === 'object' && data.type === 'dingtalk_bridge_result') {
    if (data.success) {
      MessagePlugin.success('登录成功');
      localStorage.setItem('user', JSON.stringify(data.user));
      // 关闭弹窗
      if (dingtalkLoginWindow.value && !dingtalkLoginWindow.value.closed) {
        dingtalkLoginWindow.value.close();
        dingtalkLoginWindow.value = null;
      }
      // 清除定时器
      if (dingtalkCheckInterval.value) {
        clearInterval(dingtalkCheckInterval.value);
        dingtalkCheckInterval.value = null;
      }
      // 使用 window.location.href 进行硬刷新，确保 Cookie 生效
      window.location.href = '/';
    } else {
      MessagePlugin.error(data.message || '钉钉登录失败');
    }
  }
};

onMounted(() => {
  const { error, dingName } = route.query;
  if (error === 'dingtalk_user_not_found') {
    MessagePlugin.warning(`钉钉用户 [${dingName}] 尚未绑定系统账号，请联系管理员关联 OpenID`);
  } else if (error === 'dingtalk_auth_failed') {
    MessagePlugin.error('钉钉登录失败，请稍后重试');
  } else if (error === 'account_disabled') {
    MessagePlugin.error('该账号已被禁用');
  }
  
  // 监听桥接页面的消息
  window.addEventListener('message', handleBridgeMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', handleBridgeMessage);
  // 清除定时器
  if (dingtalkCheckInterval.value) {
    clearInterval(dingtalkCheckInterval.value);
  }
});
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--td-bg-color-page);
  position: relative;
  padding: 24px;
}

.login-box {
  width: 100%;
  max-width: 450px;
  padding: 40px;
  background: var(--td-bg-color-container);
  border-radius: var(--td-radius-large);
  box-shadow: var(--td-shadow-2);
  box-sizing: border-box;
}

@media (max-width: 480px) {
  .login-box {
    padding: 24px;
  }
  
  .logo-text {
    font-size: 24px;
  }
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-text {
  font-size: 28px;
  font-weight: bold;
  color: var(--td-brand-color);
  margin-bottom: 8px;
}

.sub-title {
  color: var(--td-text-color-secondary);
  font-size: 14px;
}

.remember-me {
  margin-bottom: 16px;
}

.divider {
  margin: 24px 0;
  color: var(--td-text-color-placeholder);
}

.dingtalk-btn {
  border-color: #0052d9;
  color: #0052d9;
}

.dingtalk-btn:hover {
  background-color: rgba(0, 82, 217, 0.05);
}

.login-footer {
  margin-top: 24px;
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid var(--td-component-border);
}

.contact-admin {
  font-size: 14px;
  color: var(--td-text-color-placeholder);
  margin: 0;
}

.copyright {
  margin-top: 24px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
