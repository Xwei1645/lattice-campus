<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1 class="logo-text">Lattice Campus</h1>
        <p class="sub-title">欢迎登录校园服务平台</p>
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
          >
            <template #prefix-icon>
              <user-icon />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item name="password">
          <t-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            size="large"
          >
            <template #prefix-icon>
              <lock-on-icon />
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

      <div class="login-footer">
        <p class="contact-admin">注册用户或重置密码请联系校管理员</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { MessagePlugin, type FormRules } from 'tdesign-vue-next';
import { UserIcon, LockOnIcon } from 'tdesign-icons-vue-next';

// 禁用默认布局
definePageMeta({
  layout: false,
});

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
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, var(--td-brand-color-light) 0%, var(--td-bg-color-page) 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: var(--td-radius-large);
  box-shadow: var(--td-shadow-2);
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

.login-footer {
  margin-top: 24px;
  text-align: center;
}

.contact-admin {
  font-size: 14px;
  color: var(--td-text-color-placeholder);
}
</style>
