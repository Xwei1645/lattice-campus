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
                            <UserIcon />
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

                <t-form-item class="remember-me">
                    <t-checkbox v-model="formData.remember">
                        保持登录状态 7 天
                    </t-checkbox>
                </t-form-item>

                <t-form-item>
                    <t-button
                        theme="primary"
                        type="submit"
                        block
                        size="large"
                        :loading="loading"
                    >
                        <template #icon><LoginIcon /></template>
                        登录
                    </t-button>
                </t-form-item>
            </t-form>

            <!-- 分隔线 -->
            <div class="login-divider">
                <span>或</span>
            </div>

            <!-- 钉钉登录区域 -->
            <div class="dingtalk-login-section">
                <t-button
                    class="dingtalk-login-btn"
                    block
                    size="large"
                    @click="openDingtalkLogin"
                >
                    <template #icon>
                        <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
                            <path d="M277.205 42.667l3.563.149c13.653 1.173 26.56 6.592 36.843 15.424l1.365 1.237 224.64 194.603 59.819 51.221 44.522 37.504 43.392 35.67 25.558 20.416 17.258 13.525 23.552 18.176 18.646 14.208 9.813 7.424c60.16 45.355 57.557 119.083 12.736 168.341l-5.312 5.547-37.93 37.867 1.343.661c26.112 13.803 32.235 50.56 6.294 73.387l-2.518 2.133-323.093 231.104-1.024.81a51.84 51.84 0 01-22.4 8.769l-4.053.426-2.56.064c-40.448 0-54.187-39.168-39.403-67.733l1.515-2.73 67.008-108.673h-5.44c-35.563 0-55.616-35.221-40.427-64.576l28.16-47.36-1.43-.256C337.366 672.384 272.492 612.245 254.7 550.7l-1.28-4.736a55.19 55.19 0 013.626-36.907l1.152-2.219-.597-.597c-44.373-45.973-69.013-108.736-65.216-174.677l.427-6.187c1.77-20.245 12.117-37.93 28.928-46.507l1.77-.853-.341-.768c-24.256-56.107-27.328-121.173-3.883-186.603l2.432-6.528c8.79-22.784 26.411-39.594 51.264-41.301l4.224-.15zm36.907 128.661c-5.76 0-10.453 4.395-13.44 12.245-31.232 81.664 46.165 159.958 95.232 201.664 49.067 41.728 122.155 80.214 167.19 100.459 1.493.747.575 2.73-.854 2.73a1.579 1.579 0 01-.704 0c-82.261-35.69-170.752-67.114-248.341-126.08a14.293 14.293 0 00-8.534-3.413c-4.864 0-8.618 3.862-9.301 11.883-5.76 69.077 66.24 139.35 131.605 164.843 35.072 12.16 71.467 20.224 108.416 24.085 1.856.213 1.451 2.901-.405 2.901h-.917c-50.475-.938-125.355-8.938-172.459-26.837a13.568 13.568 0 00-4.843-.96c-6.293 0-8.426 6.187-7.168 11.392 8.15 32.939 74.368 81.557 140.011 92.203 9.557 1.408 19.2 2.069 28.864 1.984h8.384c2.304 0 3.221 1.493 2.304 3.541l-20.267 34.197-4.906 8.278-21.355 36.053c-1.493 2.517-.576 4.565 2.581 4.565h58.262c2.709 0 4.394 1.707 2.986 3.968l-82.261 134.486c-2.176 3.712-1.024 6.784 1.963 6.784a8.021 8.021 0 00-4.629-1.835l229.355-179.2c3.242-2.56 2.432-5.696-2.07-5.696h-52.821c-3.413 0-4.224-2.347-1.856-4.608 1.579-1.536 27.69-27.179 50.987-50.368l6.869-6.87c8.96-8.98 17.067-17.151 22.507-22.783 21.312-22.08 32.213-62.55-3.862-89.984-111.957-85.419-255.68-212.928-394.24-334.272a18.581 18.581 0 00-13.44-5.632z"/>
                        </svg>
                    </template>
                    钉钉登录
                </t-button>
                <p class="dingtalk-login-hint">
                    支持扫码登录、账号密码登录、通行密钥登录
                </p>
            </div>

            <!-- 底部链接 -->
            <div class="login-footer">
                <p class="contact-admin">
                    没有账号？
                    <t-link theme="primary" underline @click="navigateTo('/register')">
                        立即注册
                    </t-link>
                </p>
                <p class="contact-admin" style="margin-top: 8px;">
                    重置密码请联系校管理员
                </p>
            </div>
        </div>

        <p class="copyright">© 2025-2026 Xwei1645. All Rights Reserved.</p>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import type { FormRules } from 'tdesign-vue-next';
import { UserIcon, LockOnIcon, LoginIcon } from 'tdesign-icons-vue-next';

definePageMeta({
    layout: false,
});

useHead({ title: '登录' });

// 加载状态
const loading = ref(false);

// 表单数据
const formData = reactive({
    account: '',
    password: '',
    remember: true,
});

// 表单验证规则
const rules: FormRules = {
    account: [{ required: true, message: '用户名不能为空', trigger: 'blur' }],
    password: [{ required: true, message: '密码不能为空', trigger: 'blur' }],
};

// 账密登录提交
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
            MessagePlugin.error(
                error.data?.statusMessage || '登录失败，请检查用户名或密码'
            );
        } finally {
            loading.value = false;
        }
    } else {
        MessagePlugin.error(firstError);
    }
};

const route = useRoute();

// 钉钉登录窗口引用
const dingtalkLoginWindow = ref<Window | null>(null);

// 打开钉钉登录窗口
const openDingtalkLogin = () => {
    // 使用小窗口模式，后端会自动生成 state 并重定向到钉钉
    const loginUrl = '/api/auth/dingtalk/login?redirect=true';

    // 打开登录窗口
    dingtalkLoginWindow.value = window.open(
        loginUrl,
        'dingtalkLogin',
        'width=600,height=600'
    );

    // 监听窗口关闭
    const checkWindowClosed = setInterval(() => {
        if (dingtalkLoginWindow.value && dingtalkLoginWindow.value.closed) {
            clearInterval(checkWindowClosed);
            dingtalkLoginWindow.value = null;
        }
    }, 500);
};

// 处理来自桥接页面的消息
const handleBridgeMessage = (event: MessageEvent) => {
    // 验证消息来源，防止跨站攻击
    if (event.origin !== window.location.origin) {
        console.warn('[DingTalk] 收到来自未知来源的消息:', event.origin);
        return;
    }

    const data = event.data;

    if (data && typeof data === 'object' && data.type === 'dingtalk_bridge_result') {
        if (data.success) {
            MessagePlugin.success('登录成功');
            localStorage.setItem('user', JSON.stringify(data.user));
            navigateTo('/');
        } else {
            MessagePlugin.error(data.message || '钉钉登录失败');
        }
    }
};

// 处理来自弹窗的登录完成消息
const handleLoginComplete = (event: MessageEvent) => {
    // 验证消息来源，防止跨站攻击
    if (event.origin !== window.location.origin) {
        return;
    }

    const data = event.data;

    if (data && typeof data === 'object' && data.type === 'dingtalk_login_complete') {
        if (data.success) {
            MessagePlugin.success('登录成功');
            localStorage.setItem('user', JSON.stringify(data.user));
            navigateTo('/');
        } else {
            MessagePlugin.error(data.message || '钉钉登录失败');
        }
    }
};

onMounted(() => {
    // 处理 URL 中的错误参数
    const { error } = route.query;
    if (error === 'dingtalk_user_not_found') {
        MessagePlugin.warning('该钉钉账号尚未绑定系统账号，请联系管理员');
    } else if (error === 'dingtalk_auth_failed') {
        MessagePlugin.error('钉钉登录失败，请稍后重试');
    } else if (error === 'account_disabled') {
        MessagePlugin.error('该账号已被禁用');
    } else if (error === 'dingtalk_state_missing') {
        MessagePlugin.error('授权状态已过期，请重新登录');
    } else if (error === 'dingtalk_state_invalid') {
        MessagePlugin.error('授权状态验证失败，请重新登录');
    }

    // 监听消息
    window.addEventListener('message', handleBridgeMessage);
    window.addEventListener('message', handleLoginComplete);
});

onUnmounted(() => {
    window.removeEventListener('message', handleBridgeMessage);
    window.removeEventListener('message', handleLoginComplete);
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

/* 分隔线样式 */
.login-divider {
    display: flex;
    align-items: center;
    margin: 24px 0;
}

.login-divider::before,
.login-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--td-component-border);
}

.login-divider span {
    padding: 0 16px;
    color: var(--td-text-color-placeholder);
    font-size: 14px;
}

/* 钉钉登录区域 */
.dingtalk-login-section {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.dingtalk-login-btn {
    background-color: #0052d9;
    border-color: #0052d9;
    color: white;
}

.dingtalk-login-btn:hover {
    background-color: #0043b5;
    border-color: #0043b5;
}

.dingtalk-login-hint {
    margin-top: 12px;
    font-size: 12px;
    color: var(--td-text-color-placeholder);
    text-align: center;
}

/* 底部链接 */
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
