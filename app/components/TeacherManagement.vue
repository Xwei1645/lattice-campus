<template>
    <div class="management-container">
        <div class="management-header">
            <div class="header-actions">
                <t-input
                    v-model="searchQuery"
                    placeholder="搜索姓名/账号"
                    clearable
                    variant="filled"
                    style="width: 200px"
                />
                <t-select
                    v-model="statusFilter"
                    placeholder="状态筛选"
                    clearable
                    variant="filled"
                    style="width: 120px"
                >
                    <t-option label="待审核" value="pending" />
                    <t-option label="已激活" value="active" />
                    <t-option label="已禁用" value="disabled" />
                </t-select>
                <t-button theme="primary" @click="handleAdd">
                    <template #icon><AddIcon /></template>
                    新增教师
                </t-button>
            </div>
        </div>

        <t-card :bordered="false" class="content-card">
            <t-skeleton :loading="loading" :row-col="tableSkeleton">
                <t-table
                    row-key="id"
                    :data="filteredTeachers"
                    :columns="columns"
                    :hover="true"
                    :loading="loading"
                    :pagination="pagination"
                >
                    <template #status="{ row }">
                        <t-tag
                            :theme="getStatusTheme(row.status)"
                            variant="light"
                        >
                            {{ getStatusName(row.status) }}
                        </t-tag>
                    </template>
                    <template #createTime="{ row }">
                        {{ formatDateTime(row.createTime) }}
                    </template>
                    <template #organizations="{ row }">
                        <t-space break-line :size="4">
                            <t-tag
                                v-for="org in row.organizations"
                                :key="org.id"
                                variant="light"
                            >
                                {{ org.name }}
                            </t-tag>
                        </t-space>
                    </template>
                    <template #dingtalk="{ row }">
                        <t-tag
                            v-if="row.dingTalkOpenId"
                            theme="success"
                            variant="light"
                        >
                            <template #icon>
                                <t-icon name="check-circle" />
                            </template>
                            已绑定
                        </t-tag>
                        <t-tag v-else theme="default" variant="light">
                            <template #icon>
                                <t-icon name="close-circle" />
                            </template>
                            未绑定
                        </t-tag>
                    </template>
                    <template #op="{ row }">
                        <t-space>
                            <t-link
                                theme="primary"
                                hover="color"
                                @click="handleEdit(row)"
                            >
                                编辑
                            </t-link>
                            <t-link
                                theme="warning"
                                hover="color"
                                @click="handleResetPassword(row)"
                            >
                                重置密码
                            </t-link>
                            <t-link
                                v-if="row.dingTalkOpenId"
                                theme="danger"
                                hover="color"
                                @click="handleUnbindDingtalk(row)"
                            >
                                解绑钉钉
                            </t-link>
                            <t-link
                                v-else
                                theme="success"
                                hover="color"
                                @click="handleBindDingtalk(row)"
                            >
                                绑定钉钉
                            </t-link>
                            <t-link
                                theme="danger"
                                hover="color"
                                @click="handleDelete(row)"
                            >
                                删除
                            </t-link>
                        </t-space>
                    </template>
                </t-table>
            </t-skeleton>
        </t-card>

        <!-- 新增/编辑对话框 -->
        <t-dialog
            v-model:visible="dialogVisible"
            :header="dialogTitle"
            :confirm-btn="{ content: '确定', loading: submitLoading }"
            width="min(500px, 95%)"
            @confirm="() => formRef?.submit()"
        >
            <t-form
                ref="formRef"
                :data="formData"
                :rules="rules"
                label-align="top"
                @submit="onFormSubmit"
            >
                <t-form-item label="姓名" name="name">
                    <t-input
                        v-model="formData.name"
                        placeholder="请输入真实姓名"
                        variant="filled"
                    />
                </t-form-item>
                <t-form-item v-if="!isEdit" label="账号" name="account">
                    <t-input
                        v-model="formData.account"
                        placeholder="请输入登录账号"
                        variant="filled"
                    />
                </t-form-item>
                <t-form-item v-if="!isEdit" label="密码" name="password">
                    <t-input
                        v-model="formData.password"
                        type="password"
                        placeholder="请输入初始密码"
                        variant="filled"
                    />
                </t-form-item>
                <t-form-item label="所属部门" name="organizationIds">
                    <t-select
                        v-model="formData.organizationIds"
                        multiple
                        placeholder="请选择部门"
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
            </t-form>
        </t-dialog>

        <!-- 重置密码对话框 -->
        <t-dialog
            v-model:visible="resetVisible"
            header="重置密码"
            :confirm-btn="{ content: '确定重置', loading: resetLoading }"
            width="min(400px, 95%)"
            @confirm="() => resetFormRef?.submit()"
        >
            <t-form
                ref="resetFormRef"
                :data="resetData"
                :rules="resetRules"
                label-align="top"
                @submit="onResetSubmit"
            >
                <t-form-item label="新密码" name="newPassword">
                    <t-input
                        v-model="resetData.newPassword"
                        type="password"
                        placeholder="请输入新密码"
                        variant="filled"
                    />
                </t-form-item>
            </t-form>
        </t-dialog>
    </div>
</template>

<script setup lang="ts">
import { AddIcon } from 'tdesign-icons-vue-next'
import { ref, reactive, computed, onMounted } from 'vue'
import type { PrimaryTableCol, FormRules } from 'tdesign-vue-next'
import type { Teacher } from '~/composables/useTeacher'

// 加载状态
const loading = ref(false)

// 教师列表
const teachers = ref<Teacher[]>([])

// 组织列表
const organizations = ref<Array<{ id: number; name: string }>>([])

// 搜索关键词
const searchQuery = ref('')

// 状态筛选
const statusFilter = ref<string>('')

// 过滤后的教师列表
const filteredTeachers = computed(() => {
    let result = teachers.value

    // 状态筛选
    if (statusFilter.value) {
        result = result.filter((t) => t.status === statusFilter.value)
    }

    // 关键词搜索
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(
            (t) =>
                t.name.toLowerCase().includes(q) ||
                (t.account && t.account.toLowerCase().includes(q))
        )
    }

    return result
})

// 分页配置
const pagination = reactive({
    defaultCurrent: 1,
    defaultPageSize: 10,
    total: computed(() => filteredTeachers.value.length)
})

// 骨架屏配置
const tableSkeleton = Array(6).fill([
    { width: '60px' },
    { width: '100px' },
    { width: '120px' },
    { width: '150px' },
    { width: '100px' },
    { width: '100px' },
    { width: '200px' },
    { width: '200px' }
])

// 表格列配置
const columns: PrimaryTableCol[] = [
    { colKey: 'id', title: 'ID', width: 70 },
    { colKey: 'name', title: '姓名' },
    { colKey: 'account', title: '账号' },
    { colKey: 'organizations', title: '所属部门', cell: 'organizations' },
    { colKey: 'dingtalk', title: '钉钉绑定', width: 100, cell: 'dingtalk' },
    { colKey: 'status', title: '状态', width: 100, cell: 'status' },
    {
        colKey: 'createTime',
        title: '创建时间',
        width: 180,
        cell: 'createTime'
    },
    { colKey: 'op', title: '操作', width: 280, fixed: 'right', cell: 'op' }
]

// 获取状态名称
const getStatusName = (status: string) => {
    const map: Record<string, string> = {
        pending: '待审核',
        active: '已激活',
        disabled: '已禁用'
    }
    return map[status] || status
}

// 获取状态主题
const getStatusTheme = (status: string) => {
    const map: Record<string, string> = {
        pending: 'warning',
        active: 'success',
        disabled: 'danger'
    }
    return map[status] || 'default'
}

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const Y = date.getFullYear()
    const M = String(date.getMonth() + 1).padStart(2, '0')
    const D = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    return `${Y}-${M}-${D} ${h}:${m}`
}

// 表单逻辑
const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref<any>(null)
const isEdit = ref(false)
const dialogTitle = computed(() => (isEdit.value ? '编辑教师' : '新增教师'))
const formData = reactive({
    id: null as number | null,
    name: '',
    account: '',
    password: '',
    organizationIds: [] as number[]
})

const rules: FormRules = {
    name: [{ required: true, message: '姓名不能为空', trigger: 'blur' }],
    account: [
        { required: true, message: '账号不能为空', trigger: 'blur' },
        { min: 4, message: '账号至少4个字符', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '密码不能为空', trigger: 'blur' },
        { min: 6, message: '密码至少6个字符', trigger: 'blur' }
    ],
    organizationIds: [
        {
            required: true,
            message: '请至少选择一个部门',
            trigger: 'change'
        }
    ]
}

// 重置密码逻辑
const resetVisible = ref(false)
const resetLoading = ref(false)
const resetFormRef = ref<any>(null)
const resetData = reactive({
    id: null as number | null,
    account: '',
    newPassword: ''
})

const resetRules: FormRules = {
    newPassword: [
        { required: true, message: '新密码不能为空', trigger: 'blur' },
        { min: 6, message: '密码至少6个字符', trigger: 'blur' }
    ]
}

// 获取教师列表
const fetchTeachers = async () => {
    loading.value = true
    try {
        const response = await $fetch<any>('/api/teachers')
        teachers.value = response.data?.list || []
    } catch (error: any) {
        MessagePlugin.error('获取教师列表失败')
    } finally {
        loading.value = false
    }
}

// 获取组织列表
const fetchOrganizations = async () => {
    try {
        const response = await $fetch<any>('/api/organizations')
        organizations.value = response.data || []
    } catch (error: any) {
        console.error('获取组织列表失败:', error)
    }
}

// 新增教师
const handleAdd = () => {
    isEdit.value = false
    Object.assign(formData, {
        id: null,
        name: '',
        account: '',
        password: '',
        organizationIds: []
    })
    dialogVisible.value = true
}

// 编辑教师
const handleEdit = (row: Teacher) => {
    isEdit.value = true
    Object.assign(formData, {
        id: row.id,
        name: row.name,
        account: row.account || '',
        password: '',
        organizationIds: row.organizations?.map((o) => o.id) || []
    })
    dialogVisible.value = true
}

// 提交表单
const onFormSubmit = async ({ validateResult, firstError }: any) => {
    if (validateResult !== true) {
        MessagePlugin.error(firstError)
        return
    }

    submitLoading.value = true
    try {
        if (isEdit.value && formData.id !== null) {
            await $fetch(`/api/teachers/${formData.id}`, {
                method: 'PUT',
                body: {
                    name: formData.name,
                    organizationIds: formData.organizationIds
                }
            })
            MessagePlugin.success('修改成功')
        } else {
            await $fetch('/api/teachers', {
                method: 'POST',
                body: {
                    name: formData.name,
                    account: formData.account,
                    password: formData.password,
                    organizationIds: formData.organizationIds
                }
            })
            MessagePlugin.success('新增成功')
        }
        await fetchTeachers()
        dialogVisible.value = false
    } catch (error: any) {
        MessagePlugin.error(error.data?.statusMessage || '操作失败')
    } finally {
        submitLoading.value = false
    }
}

// 重置密码
const handleResetPassword = (row: Teacher) => {
    resetData.id = row.id
    resetData.account = row.account || ''
    resetData.newPassword = ''
    resetVisible.value = true
}

// 提交重置密码
const onResetSubmit = async ({ validateResult, firstError }: any) => {
    if (validateResult !== true) {
        MessagePlugin.error(firstError)
        return
    }

    resetLoading.value = true
    try {
        await $fetch(`/api/teachers/${resetData.id}/reset-password`, {
            method: 'POST',
            body: { password: resetData.newPassword }
        })
        MessagePlugin.success('密码重置成功')
        resetVisible.value = false
    } catch (error: any) {
        MessagePlugin.error(error.data?.statusMessage || '重置失败')
    } finally {
        resetLoading.value = false
    }
}

// 绑定钉钉
const handleBindDingtalk = async (row: Teacher) => {
    MessagePlugin.info('请在钉钉中完成绑定')
}

// 解绑钉钉
const handleUnbindDingtalk = async (row: Teacher) => {
    const confirmDialog = DialogPlugin.confirm({
        header: '确认解绑',
        body: `确定解绑教师 ${row.name} 的钉钉账号吗？`,
        onConfirm: async () => {
            try {
                await $fetch(`/api/teachers/${row.id}/unbind-dingtalk`, {
                    method: 'POST'
                })
                MessagePlugin.success('解绑成功')
                await fetchTeachers()
                confirmDialog.destroy()
            } catch (error: any) {
                MessagePlugin.error(error.data?.statusMessage || '解绑失败')
            }
        }
    })
}

// 删除教师
const handleDelete = async (row: Teacher) => {
    const confirmDialog = DialogPlugin.confirm({
        header: '确认删除',
        body: `确定删除教师 ${row.name} 吗？删除后无法恢复。`,
        onConfirm: async () => {
            try {
                await $fetch(`/api/teachers/${row.id}`, {
                    method: 'DELETE'
                })
                MessagePlugin.success('删除成功')
                await fetchTeachers()
                confirmDialog.destroy()
            } catch (error: any) {
                MessagePlugin.error(error.data?.statusMessage || '删除失败')
            }
        }
    })
}

onMounted(() => {
    fetchTeachers()
    fetchOrganizations()
})
</script>

<style scoped>
.management-container {
    width: 100%;
}

.management-header {
    margin-bottom: 16px;
}

.header-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}
</style>
