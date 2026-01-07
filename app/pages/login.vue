<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1 class="logo-text">WZHS Booking</h1>
        <p class="sub-title">温州中学场地预约系统</p>
      </div>

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
            登录
          </t-button>
        </t-form-item>
      </t-form>

      <div class="other-login">
        <t-divider align="center">第三方登录</t-divider>
        <t-button
          variant="outline"
          block
          size="large"
          @click="onDingtalkLogin"
        >
          <template #icon>
            <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
              <path d="M277.205 42.667l3.563.149c13.653 1.173 26.56 6.592 36.843 15.424l1.365 1.237 224.64 194.603 59.819 51.221 44.522 37.504 43.392 35.67 25.558 20.416 17.258 13.525 23.552 18.176 18.646 14.208 9.813 7.424c60.16 45.355 57.557 119.083 12.736 168.341l-5.312 5.547-37.93 37.867 1.343.661c26.112 13.803 32.235 50.56 6.294 73.387l-2.518 2.133-323.093 231.104-1.024.81a51.84 51.84 0 01-22.4 8.769l-4.053.426-2.56.064c-40.448 0-54.187-39.168-39.403-67.733l1.515-2.73 67.008-108.673h-5.44c-35.563 0-55.616-35.221-40.427-64.576l28.16-47.36-1.43-.256C337.366 672.384 272.492 612.245 254.7 550.7l-1.28-4.736a55.19 55.19 0 013.626-36.907l1.152-2.219-.597-.597c-44.373-45.973-69.013-108.736-65.216-174.677l.427-6.187c1.77-20.245 12.117-37.93 28.928-46.507l1.77-.853-.341-.768c-24.256-56.107-27.328-121.173-3.883-186.603l2.432-6.528c8.79-22.784 26.411-39.594 51.264-41.301l4.224-.15zm36.907 128.661c-5.76 0-10.453 4.395-13.44 12.245-31.232 81.664 46.165 159.958 95.232 201.664 49.067 41.728 122.155 80.214 167.19 100.459 1.493.747.575 2.73-.854 2.73a1.579 1.579 0 01-.704 0c-82.261-35.69-170.752-67.114-248.341-126.08a14.293 14.293 0 00-8.534-3.413c-4.864 0-8.618 3.862-9.301 11.883-5.76 69.077 66.24 139.35 131.605 164.843 35.072 12.16 71.467 20.224 108.416 24.085 1.856.213 1.451 2.901-.405 2.901h-.917c-50.475-.938-125.355-8.938-172.459-26.837a13.568 13.568 0 00-4.843-.96c-6.293 0-8.426 6.187-7.168 11.392 8.15 32.939 74.368 81.557 140.011 92.203 9.557 1.408 19.2 2.069 28.864 1.984h8.384c2.304 0 3.221 1.493 2.304 3.541l-20.267 34.197-4.906 8.278-21.355 36.053c-1.493 2.517-.576 4.565 2.581 4.565h58.262c2.709 0 4.394 1.707 2.986 3.968l-82.261 134.486c-2.176 3.712-1.024 6.784 1.963 6.784a8.021 8.021 0 00-4.629-1.835l229.355-179.2c3.242-2.56 2.432-5.696-2.07-5.696h-52.821c-3.413 0-4.224-2.347-1.856-4.608 1.579-1.536 27.69-27.179 50.987-50.368l6.869-6.87c8.96-8.98 17.067-17.151 22.507-22.783 21.312-22.08 32.213-62.55-3.862-89.984-111.957-85.419-255.68-212.928-394.24-334.272a18.581 18.581 0 00-11.52-5.334z" />
            </svg>
          </template>
          钉钉
        </t-button>
      </div>

      <div class="login-footer">
        <p class="contact-admin">注册用户或重置密码请联系校管理员</p>
      </div>
    </div>
    <p class="copyright">©Xwei1645 2025 All Rights Reserved.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { FormRules } from 'tdesign-vue-next';

// 禁用默认布局
definePageMeta({
  layout: false,
});

useHead({ title: '登录' })

const loading = ref(false);

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
      // 存储用户信息用于前端显示（session token已通过httpOnly cookie自动设置）
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

const onDingtalkLogin = () => {
  MessagePlugin.info('钉钉登录功能开发中...');
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--td-bg-color-page);
  position: relative;
}

.login-box {
  width: 90%;
  max-width: 400px;
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
  margin-bottom: 40px;
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

.other-login {
  margin-top: 16px;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
}

.contact-admin {
  font-size: 14px;
  color: var(--td-text-color-placeholder);
  margin: 0;
}

.copyright {
  position: absolute;
  bottom: 24px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin: 0;
}
</style>
