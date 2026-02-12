<template>
    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">待审核教师</h2>
            <div class="header-actions">
                <t-input
                    v-model="searchQuery"
                    placeholder="搜索姓名/账号"
                    clearable
                    variant="filled"
                    style="width: 200px"
                />
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
                                theme="success"
                                hover="color"
                                @click="handleApprove(row)"
                            >
                                通过
                            </t-link>
                            <t-link
                                theme="danger"
                                hover="color"
                                @click="handleReject(row)"
                            >
                                拒绝
                            </t-link>
                        </t-space>
                    </template>
                </t-table>
            </t-skeleton>
        </t-card>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { PrimaryTableCol } from 'tdesign-vue-next'
import type { Teacher } from '~/composables/useTeacher'

useHead({ title: '待审核教师' })

// 加载状态
const loading = ref(false)

// 教师列表
const teachers = ref<Teacher[]>([])

// 搜索关键词
const searchQuery = ref('')

// 过滤后的教师列表
const filteredTeachers = computed(() => {
    if (!searchQuery.value) return teachers.value
    const q = searchQuery.value.toLowerCase()
    return teachers.value.filter(
        (t) =>
            t.name.toLowerCase().includes(q) ||
            (t.account && t.account.toLowerCase().includes(q))
    )
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
    { width: '200px' },
    { width: '120px' }
])

// 表格列配置
const columns: PrimaryTableCol[] = [
    { colKey: 'id', title: 'ID', width: 70 },
    { colKey: 'name', title: '姓名' },
    { colKey: 'account', title: '账号' },
    { colKey: 'organizations', title: '所属部门', cell: 'organizations' },
    { colKey: 'dingtalk', title: '钉钉绑定', width: 100, cell: 'dingtalk' },
    {
        colKey: 'createTime',
        title: '申请时间',
        width: 180,
        cell: 'createTime'
    },
    { colKey: 'op', title: '操作', width: 120, fixed: 'right', cell: 'op' }
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

// 获取待审核教师列表
const fetchPendingTeachers = async () => {
    loading.value = true
    try {
        const response = await $fetch<any>('/api/teachers?status=pending')
        teachers.value = response.data?.list || []
    } catch (error: any) {
        MessagePlugin.error('获取待审核教师列表失败')
    } finally {
        loading.value = false
    }
}

// 审核通过
const handleApprove = async (row: Teacher) => {
    const confirmDialog = DialogPlugin.confirm({
        header: '确认通过',
        body: `确定通过教师 ${row.name} 的申请吗？`,
        onConfirm: async () => {
            try {
                await $fetch(`/api/teachers/${row.id}/approve`, {
                    method: 'POST'
                })
                MessagePlugin.success('审核通过')
                await fetchPendingTeachers()
                confirmDialog.destroy()
            } catch (error: any) {
                MessagePlugin.error(
                    error.data?.statusMessage || '审核失败'
                )
            }
        }
    })
}

// 审核拒绝
const handleReject = async (row: Teacher) => {
    const confirmDialog = DialogPlugin.confirm({
        header: '确认拒绝',
        body: `确定拒绝教师 ${row.name} 的申请吗？此操作不可撤销。`,
        onConfirm: async () => {
            try {
                await $fetch(`/api/teachers/${row.id}/reject`, {
                    method: 'POST'
                })
                MessagePlugin.success('已拒绝该申请')
                await fetchPendingTeachers()
                confirmDialog.destroy()
            } catch (error: any) {
                MessagePlugin.error(
                    error.data?.statusMessage || '操作失败'
                )
            }
        }
    })
}

onMounted(() => {
    fetchPendingTeachers()
})
</script>

<style scoped>
.header-actions {
    display: flex;
    gap: 16px;
}
</style>
