<template>
    <div class="init-container">
        <div class="init-box">
            <div class="init-header">
                <h1 class="logo-text">教师账号初始化</h1>
                <p class="sub-title">请完善您的个人信息</p>
            </div>

            <t-form
                ref="formRef"
                :data="formData"
                :rules="rules"
                label-align="top"
                @submit="onSubmit"
            >
                <t-form-item label="姓名" name="name">
                    <t-input
                        v-model="formData.name"
                        placeholder="请输入真实姓名"
                        size="large"
                        variant="filled"
                    />
                </t-form-item>

                <t-form-item label="账号（选填）" name="account">
                    <t-input
                        v-model="formData.account"
                        placeholder="用于账密登录，不填则只能钉钉登录"
                        size="large"
                        variant="filled"
                    />
                </t-form-item>

                <t-form-item label="密码（选填）" name="password">
                    <t-input
                        v-model="formData.password"
                        type="password"
                        placeholder="用于账密登录，不填则只能钉钉登录"
                        size="large"
                        variant="filled"
                    />
                </t-form-item>

                <t-form-item label="所属部门" name="organizationIds">
                    <t-select
                        v-model="formData.organizationIds"
                        multiple
                        placeholder="请选择所属部门"
                        size="large"
                        variant="filled"
                    >
                        <t-option
                            v-for="org in organizations"
                            :key="org.id"
                            :label="org.name"
                            :value="org.id"
                        />
                    </t-select>
                </t-form-item>

                <t-form-item>
                    <t-button
                        theme="primary"
                        type="submit"
                        block
                        size="large"
                        :loading="loading"
                    >
                        提交初始化
                    </t-button>
                </t-form-item>
            </t-form>

            <div class="init-footer">
                <p class="hint">
                    提交后需要管理员审核通过才能使用系统
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { FormRules } from 'tdesign-vue-next'

definePageMeta({
    layout: false
})

useHead({ title: '教师账号初始化' })

// 加载状态
const loading = ref(false)

// 表单数据
const formData = reactive({
    name: '',
    account: '',
    password: '',
    organizationIds: [] as number[]
})

// 组织列表
const organizations = ref<Array<{ id: number; name: string }>>([])

// 表单验证规则
const rules: FormRules = {
    name: [
        { required: true, message: '姓名不能为空', trigger: 'blur' },
        { min: 2, message: '姓名至少2个字符', trigger: 'blur' },
        { max: 20, message: '姓名最多20个字符', trigger: 'blur' }
    ],
    account: [
        { min: 4, message: '账号至少4个字符', trigger: 'blur' },
        { max: 20, message: '账号最多20个字符', trigger: 'blur' },
        {
            pattern: /^[a-zA-Z0-9_]+$/,
            message: '账号只能包含字母、数字和下划线',
            trigger: 'blur'
        }
    ],
    password: [
        { min: 6, message: '密码至少6个字符', trigger: 'blur' },
        { max: 20, message: '密码最多20个字符', trigger: 'blur' }
    ],
    organizationIds: [
        {
            required: true,
            message: '请至少选择一个部门',
            trigger: 'change',
            validator: (val: any) => val && val.length > 0
        }
    ]
}

const formRef = ref<any>(null)

// 获取初始化token和预填姓名
const route = useRoute()
const initToken = computed(() => route.query.token as string)
const prefillName = computed(() => route.query.name as string)

// 获取组织列表和预填姓名
onMounted(async () => {
    try {
        const response = await $fetch<any>('/api/organizations')
        organizations.value = response.data || []
    } catch (error) {
        console.error('获取组织列表失败:', error)
    }
    
    // 预填姓名
    if (prefillName.value) {
        formData.name = decodeURIComponent(prefillName.value)
    }
})

// 提交表单
const onSubmit = async ({ validateResult, firstError }: any) => {
    if (validateResult !== true) {
        MessagePlugin.error(firstError)
        return
    }

    if (!initToken.value) {
        MessagePlugin.error('缺少初始化token，请重新登录')
        return
    }

    loading.value = true
    try {
        await $fetch('/api/auth/teacher/initialize', {
            method: 'POST',
            body: {
                token: initToken.value,
                name: formData.name,
                account: formData.account || undefined,
                password: formData.password || undefined,
                organizationIds: formData.organizationIds
            }
        })

        MessagePlugin.success('初始化成功，请等待管理员审核')
        navigateTo('/login')
    } catch (error: any) {
        MessagePlugin.error(
            error.data?.statusMessage || '初始化失败，请稍后重试'
        )
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.init-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: var(--td-bg-color-page);
    padding: 24px;
}

.init-box {
    width: 100%;
    max-width: 450px;
    padding: 40px;
    background: var(--td-bg-color-container);
    border-radius: var(--td-radius-large);
    box-shadow: var(--td-shadow-2);
    box-sizing: border-box;
}

.init-header {
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

.init-footer {
    margin-top: 24px;
    text-align: center;
    padding-top: 16px;
    border-top: 1px solid var(--td-component-border);
}

.hint {
    font-size: 13px;
    color: var(--td-text-color-placeholder);
    margin: 0;
}

@media (max-width: 480px) {
    .init-box {
        padding: 24px;
    }

    .logo-text {
        font-size: 24px;
    }
}
</style>
