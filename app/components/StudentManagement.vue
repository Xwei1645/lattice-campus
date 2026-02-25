<template>
    <div class="management-container">
        <div class="management-header">
            <div class="header-actions">
                <t-input
                    v-model="searchQuery"
                    placeholder="搜索姓名/学号/账号"
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
                    <t-option label="已激活" value="active" />
                    <t-option label="已禁用" value="disabled" />
                </t-select>
                <t-button theme="primary" @click="handleAdd">
                    <template #icon><AddIcon /></template>
                    新增学生
                </t-button>
            </div>
        </div>

        <t-card :bordered="false" class="content-card">
            <t-skeleton :loading="loading" :row-col="tableSkeleton">
                <t-table
                    row-key="id"
                    :data="filteredStudents"
                    :columns="columns"
                    :hover="true"
                    :loading="loading"
                    :pagination="pagination"
                >
                    <template #status="{ row }">
                        <t-tag
                            :theme="row.status === 'active' ? 'success' : 'danger'"
                            variant="light"
                        >
                            {{ row.status === 'active' ? '已激活' : '已禁用' }}
                        </t-tag>
                    </template>
                    <template #createTime="{ row }">
                        {{ formatDateTime(row.createTime) }}
                    </template>
                    <template #seewo="{ row }">
                        <t-tag
                            v-if="row.seewoOpenId"
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
                                v-if="row.seewoOpenId"
                                theme="danger"
                                hover="color"
                                @click="handleUnbindSeewo(row)"
                            >
                                解绑希沃
                            </t-link>
                            <t-link
                                v-else
                                theme="success"
                                hover="color"
                                @click="handleBindSeewo(row)"
                            >
                                绑定希沃
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
                <t-form-item label="学号" name="studentId">
                    <t-input
                        v-model="formData.studentId"
                        placeholder="请输入学号"
                        variant="filled"
                        :disabled="isEdit"
                    />
                </t-form-item>
                <t-form-item v-if="!isEdit" label="账号" name="account">
                    <t-input
                        v-model="formData.account"
                        placeholder="请输入登录账号（选填）"
                        variant="filled"
                    />
                </t-form-item>
                <t-form-item v-if="!isEdit" label="密码" name="password">
                    <t-input
                        v-model="formData.password"
                        type="password"
                        placeholder="请输入初始密码（选填）"
                        variant="filled"
                    />
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
import type { Student } from '~/composables/useStudent'

// 加载状态
const loading = ref(false)

// 学生列表
const students = ref<Student[]>([])

// 搜索关键词
const searchQuery = ref('')

// 状态筛选
const statusFilter = ref<string>('')

// 过滤后的学生列表
const filteredStudents = computed(() => {
    let result = students.value

    // 状态筛选
    if (statusFilter.value) {
        result = result.filter((s) => s.status === statusFilter.value)
    }

    // 关键词搜索
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(
            (s) =>
                s.name.toLowerCase().includes(q) ||
                s.studentId.toLowerCase().includes(q) ||
                (s.account && s.account.toLowerCase().includes(q))
        )
    }

    return result
})

// 分页配置
const pagination = reactive({
    defaultCurrent: 1,
    defaultPageSize: 10,
    total: computed(() => filteredStudents.value.length)
})

// 骨架屏配置
const tableSkeleton = Array(6).fill([
    { width: '60px' },
    { width: '100px' },
    { width: '120px' },
    { width: '120px' },
    { width: '100px' },
    { width: '100px' },
    { width: '200px' },
    { width: '200px' }
])

// 表格列配置
const columns: PrimaryTableCol[] = [
    { colKey: 'id', title: 'ID', width: 70 },
    { colKey: 'name', title: '姓名' },
    { colKey: 'studentId', title: '学号' },
    { colKey: 'account', title: '账号' },
    { colKey: 'seewo', title: '希沃绑定', width: 100, cell: 'seewo' },
    { colKey: 'status', title: '状态', width: 100, cell: 'status' },
    {
        colKey: 'createTime',
        title: '创建时间',
        width: 180,
        cell: 'createTime'
    },
    { colKey: 'op', title: '操作', width: 280, fixed: 'right', cell: 'op' }
]

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
const dialogTitle = computed(() => (isEdit.value ? '编辑学生' : '新增学生'))
const formData = reactive({
    id: null as number | null,
    name: '',
    studentId: '',
    account: '',
    password: ''
})

const rules: FormRules = {
    name: [{ required: true, message: '姓名不能为空', trigger: 'blur' }],
    studentId: [{ required: true, message: '学号不能为空', trigger: 'blur' }],
    account: [{ min: 4, message: '账号至少4个字符', trigger: 'blur' }],
    password: [{ min: 6, message: '密码至少6个字符', trigger: 'blur' }]
}

// 重置密码逻辑
const resetVisible = ref(false)
const resetLoading = ref(false)
const resetFormRef = ref<any>(null)
const resetData = reactive({
    id: null as number | null,
    name: '',
    newPassword: ''
})

const resetRules: FormRules = {
    newPassword: [
        { required: true, message: '新密码不能为空', trigger: 'blur' },
        { min: 6, message: '密码至少6个字符', trigger: 'blur' }
    ]
}

// 获取学生列表
const fetchStudents = async () => {
    loading.value = true
    try {
        const response = await $fetch<any>('/api/students')
        students.value = response.data?.list || []
    } catch (error: any) {
        MessagePlugin.error('获取学生列表失败')
    } finally {
        loading.value = false
    }
}

// 新增学生
const handleAdd = () => {
    isEdit.value = false
    Object.assign(formData, {
        id: null,
        name: '',
        studentId: '',
        account: '',
        password: ''
    })
    dialogVisible.value = true
}

// 编辑学生
const handleEdit = (row: Student) => {
    isEdit.value = true
    Object.assign(formData, {
        id: row.id,
        name: row.name,
        studentId: row.studentId,
        account: row.account || '',
        password: ''
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
            await $fetch(`/api/students/${formData.id}`, {
                method: 'PUT',
                body: {
                    name: formData.name,
                    studentId: formData.studentId
                }
            })
            MessagePlugin.success('修改成功')
        } else {
            await $fetch('/api/students', {
                method: 'POST',
                body: {
                    name: formData.name,
                    studentId: formData.studentId,
                    account: formData.account || undefined,
                    password: formData.password || undefined
                }
            })
            MessagePlugin.success('新增成功')
        }
        await fetchStudents()
        dialogVisible.value = false
    } catch (error: any) {
        MessagePlugin.error(error.data?.statusMessage || '操作失败')
    } finally {
        submitLoading.value = false
    }
}

// 重置密码
const handleResetPassword = (row: Student) => {
    resetData.id = row.id
    resetData.name = row.name
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
        await $fetch(`/api/students/${resetData.id}/reset-password`, {
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

// 绑定希沃
const handleBindSeewo = async (row: Student) => {
    MessagePlugin.info('请在希沃中完成绑定')
}

// 解绑希沃
const handleUnbindSeewo = async (row: Student) => {
    const confirmDialog = DialogPlugin.confirm({
        header: '确认解绑',
        body: `确定解绑学生 ${row.name} 的希沃账号吗？`,
        onConfirm: async () => {
            try {
                await $fetch(`/api/students/${row.id}/unbind-seewo`, {
                    method: 'POST'
                })
                MessagePlugin.success('解绑成功')
                await fetchStudents()
                confirmDialog.destroy()
            } catch (error: any) {
                MessagePlugin.error(error.data?.statusMessage || '解绑失败')
            }
        }
    })
}

// 删除学生
const handleDelete = async (row: Student) => {
    const confirmDialog = DialogPlugin.confirm({
        header: '确认删除',
        body: `确定删除学生 ${row.name} 吗？删除后无法恢复。`,
        onConfirm: async () => {
            try {
                await $fetch(`/api/students/${row.id}`, {
                    method: 'DELETE'
                })
                MessagePlugin.success('删除成功')
                await fetchStudents()
                confirmDialog.destroy()
            } catch (error: any) {
                MessagePlugin.error(error.data?.statusMessage || '删除失败')
            }
        }
    })
}

onMounted(() => {
    fetchStudents()
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
