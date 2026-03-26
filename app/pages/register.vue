<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1 class="logo-text">WZHS Booking</h1>
        <p class="sub-title">邀请码注册</p>
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
              <UserIcon />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item name="name">
          <t-input
            v-model="formData.name"
            placeholder="请输入真实姓名"
            size="large"
            variant="filled"
          >
            <template #prefix-icon>
              <UserCircleIcon />
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
              <LockOnIcon />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item name="invitationCode">
          <t-input
            v-model="formData.invitationCode"
            placeholder="请输入6位邀请码"
            size="large"
            variant="filled"
            :maxlength="6"
          >
            <template #prefix-icon>
              <RootListIcon />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item>
          <t-button
            theme="primary"
            type="submit"
            block
            size="large"
            :loading="loading"
          >
            <template #icon><UserAddIcon /></template>
            注册
          </t-button>
        </t-form-item>
      </t-form>

      <div class="login-footer">
        <p class="contact-admin">
          已有账号？
          <t-link theme="primary" underline @click="navigateTo('/login')">立即登录</t-link>
        </p>
      </div>
    </div>
    <p class="copyright">© 2025-2026 Xwei1645. All Rights Reserved.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { FormRules, SubmitContext } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next'
import { UserIcon, UserCircleIcon, LockOnIcon, RootListIcon, UserAddIcon } from 'tdesign-icons-vue-next'

// 禁用默认布局
definePageMeta({
  layout: false,
});

useHead({ title: '注册' })

const loading = ref(false);

const formData = reactive({
  account: '',
  name: '',
  password: '',
  invitationCode: '',
});

const rules: FormRules = {
  account: [{ required: true, message: '用户名必填', trigger: 'blur' }],
  name: [{ required: true, message: '真实姓名必填', trigger: 'blur' }],
  password: [
    { required: true, message: '密码必填', trigger: 'blur' },
    { min: 6, message: '密码长度至少为 6 位', trigger: 'blur' },
  ],
  invitationCode: [
    { required: true, message: '邀请码必填', trigger: 'blur' },
    { len: 6, message: '邀请码必须为 6 位', trigger: 'blur' },
  ],
};

const onSubmit = async ({ validateResult, firstError }: SubmitContext) => {
  if (validateResult !== true) {
    if (firstError) MessagePlugin.warning(firstError);
    return;
  }

  loading.value = true;
  try {
    const res = await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        ...formData,
        invitationCode: formData.invitationCode.trim().toUpperCase(),
      },
    });
    
    MessagePlugin.success('注册成功，请登录');
    navigateTo('/login');
  } catch (error: any) {
    MessagePlugin.error(error.data?.statusMessage || '注册失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--td-bg-color-page);
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
