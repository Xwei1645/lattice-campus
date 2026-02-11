<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">日志管理</h2>
      <div class="header-actions">
        <t-space :size="8">
          <t-select
            v-model="filters.actionType"
            placeholder="操作类型"
            clearable
            style="width: 150px"
            @change="fetchLogs"
          >
            <t-option value="" label="全部"></t-option>
            <t-option value="login" label="登录"></t-option>
            <t-option value="logout" label="登出"></t-option>
            <t-option value="register" label="注册"></t-option>
            <t-option value="dingtalk_login" label="钉钉登录"></t-option>
            <t-option value="user_create" label="创建用户"></t-option>
            <t-option value="user_update" label="更新用户"></t-option>
            <t-option value="user_delete" label="删除用户"></t-option>
            <t-option value="user_reset_password" label="重置密码"></t-option>
            <t-option value="booking_create" label="创建预约"></t-option>
            <t-option value="booking_update" label="更新预约"></t-option>
            <t-option value="booking_cancel" label="取消预约"></t-option>
            <t-option value="organization_create" label="创建组织"></t-option>
            <t-option value="organization_delete" label="删除组织"></t-option>
            <t-option value="room_create" label="创建房间"></t-option>
            <t-option value="room_delete" label="删除房间"></t-option>
            <t-option value="backup_create" label="创建备份"></t-option>
            <t-option value="backup_delete" label="删除备份"></t-option>
            <t-option value="backup_restore" label="恢复备份"></t-option>
            <t-option value="notice_create" label="创建公告"></t-option>
            <t-option value="notice_delete" label="删除公告"></t-option>
          </t-select>
          <t-select
            v-model="filters.status"
            placeholder="状态"
            clearable
            style="width: 120px"
            @change="fetchLogs"
          >
            <t-option value="" label="全部"></t-option>
            <t-option value="success" label="成功"></t-option>
            <t-option value="failed" label="失败"></t-option>
          </t-select>
        </t-space>
      </div>
    </div>

    <t-card :bordered="false" class="content-card">
      <t-skeleton :loading="loading" :row-col="tableSkeleton" animation="gradient">
        <t-table
          row-key="id"
          :data="logs"
          :columns="columns"
          :hover="true"
          :loading="loading"
          vertical-align="middle"
          :pagination="pagination"
          @page-change="onPageChange"
        >
          <template #actionType="{ row }">
            <t-tag :theme="getActionTypeTheme(row.actionType)" variant="light" size="small">
              {{ getActionTypeLabel(row.actionType) }}
            </t-tag>
          </template>
          <template #status="{ row }">
            <t-tag :theme="row.status === 'success' ? 'success' : 'danger'" variant="light" size="small">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </t-tag>
          </template>
          <template #createTime="{ row }">
            {{ formatDateTime(row.createTime) }}
          </template>
          <template #details="{ row }">
            <t-button variant="text" size="small" @click="showDetail(row)">
              查看详情
            </t-button>
          </template>
        </t-table>
      </t-skeleton>
    </t-card>

    <!-- 日志详情对话框 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="日志详情"
      :footer="false"
      width="min(600px, 95%)"
    >
      <div v-if="currentLog" class="log-detail">
        <t-descriptions :column="2" bordered>
          <t-descriptions-item label="操作类型" :span="2">
            <t-tag :theme="getActionTypeTheme(currentLog.actionType)" variant="light">
              {{ getActionTypeLabel(currentLog.actionType) }}
            </t-tag>
          </t-descriptions-item>
          <t-descriptions-item label="操作人">
            {{ currentLog.userName }}
            <t-tag v-if="currentLog.userRole" variant="light" theme="primary" size="small" style="margin-left: 8px">
              {{ getRoleName(currentLog.userRole) }}
            </t-tag>
          </t-descriptions-item>
          <t-descriptions-item label="状态">
            <t-tag :theme="currentLog.status === 'success' ? 'success' : 'danger'" variant="light">
              {{ currentLog.status === 'success' ? '成功' : '失败' }}
            </t-tag>
          </t-descriptions-item>
          <t-descriptions-item v-if="currentLog.targetId" label="目标对象">
            {{ currentLog.targetType }} (ID: {{ currentLog.targetId }})
          </t-descriptions-item>
          <t-descriptions-item label="IP地址">
            {{ currentLog.ipAddress }}
          </t-descriptions-item>
          <t-descriptions-item label="User-Agent">
            <div class="user-agent">{{ currentLog.userAgent }}</div>
          </t-descriptions-item>
          <t-descriptions-item v-if="currentLog.errorMessage" label="错误信息" :span="2">
            <t-tag theme="danger" variant="light">{{ currentLog.errorMessage }}</t-tag>
          </t-descriptions-item>
          <t-descriptions-item v-if="currentLog.details" label="详细信息" :span="2">
            <pre class="detail-json">{{ JSON.stringify(currentLog.details, null, 2) }}</pre>
          </t-descriptions-item>
          <t-descriptions-item label="操作时间" :span="2">
            {{ formatFullDateTime(currentLog.createTime) }}
          </t-descriptions-item>
        </t-descriptions>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { FileIcon } from 'tdesign-icons-vue-next';
import { ref, reactive } from 'vue';
import type { PrimaryTableCol, TableRowData } from 'tdesign-vue-next';
import { formatDateTime, formatDate } from '~/utils/format';

useHead({ title: '日志管理' });

const logs = ref<any[]>([]);
const loading = ref(false);
const detailVisible = ref(false);
const currentLog = ref<any>(null);

const filters = reactive({
  actionType: '',
  status: '',
  userId: undefined as number | undefined
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
});

const columns: PrimaryTableCol<TableRowData>[] = [
  { colKey: 'actionType', title: '操作类型', width: 120 },
  { colKey: 'userName', title: '操作人', width: 120 },
  { colKey: 'targetType', title: '目标对象', width: 100 },
  { colKey: 'ipAddress', title: 'IP地址', width: 140 },
  { colKey: 'status', title: '状态', width: 80 },
  { colKey: 'createTime', title: '操作时间', width: 180 },
  { colKey: 'details', title: '详情', width: 100, fixed: 'right' }
];

const tableSkeleton = Array(5).fill([
  { width: '120px' },
  { width: '120px' },
  { width: '100px' },
  { width: '140px' },
  { width: '80px' },
  { width: '180px' },
  { width: '100px' }
]);

const fetchLogs = async () => {
  loading.value = true;
  try {
    const query: any = {
      page: pagination.current,
      pageSize: pagination.pageSize
    };
    if (filters.actionType) {
      query.actionType = filters.actionType;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.userId) {
      query.userId = filters.userId;
    }
    
    const res: any = await $fetch('/api/audit-logs', { query });
    logs.value = res.data?.logs || [];
    pagination.total = res.data?.pagination?.total || 0;
  } catch (error: any) {
    console.error('Failed to fetch audit logs:', error);
  } finally {
    loading.value = false;
  }
};

const onPageChange = (pageInfo: any) => {
  pagination.current = pageInfo.current;
  pagination.pageSize = pageInfo.pageSize;
  fetchLogs();
};

const showDetail = (log: any) => {
  currentLog.value = log;
  detailVisible.value = true;
};

const getActionTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    login: '登录',
    logout: '登出',
    register: '注册',
    dingtalk_login: '钉钉登录',
    user_create: '创建用户',
    user_update: '更新用户',
    user_delete: '删除用户',
    user_reset_password: '重置密码',
    booking_create: '创建预约',
    booking_update: '更新预约',
    booking_cancel: '取消预约',
    organization_create: '创建组织',
    organization_delete: '删除组织',
    room_create: '创建房间',
    room_delete: '删除房间',
    backup_create: '创建备份',
    backup_delete: '删除备份',
    backup_restore: '恢复备份',
    notice_create: '创建公告',
    notice_delete: '删除公告'
  };
  return map[type] || type;
};

const getActionTypeTheme = (type: string): 'success' | 'warning' | 'danger' | 'default' => {
  const authActions = ['login', 'logout', 'register', 'dingtalk_login'];
  const userActions = ['user_create', 'user_update', 'user_delete', 'user_reset_password'];
  const bookingActions = ['booking_create', 'booking_update', 'booking_cancel'];
  const systemActions = ['backup_create', 'backup_delete', 'backup_restore', 'notice_create', 'notice_delete'];
  const orgRoomActions = ['organization_create', 'organization_delete', 'room_create', 'room_delete'];
  
  if (authActions.includes(type)) return 'default';
  if (userActions.includes(type)) return 'warning';
  if (bookingActions.includes(type)) return 'primary';
  if (systemActions.includes(type)) return 'danger';
  if (orgRoomActions.includes(type)) return 'success';
  return 'default';
};

const getRoleName = (role: string) => {
  const map: Record<string, string> = {
    root: '根管理员',
    super_admin: '超级管理员',
    admin: '管理员',
    user: '普通用户'
  };
  return map[role] || role;
};

const formatFullDateTime = (date: string) => {
  return formatDate(date) + ' ' + formatDateTime(date);
};

fetchLogs();
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
}

.content-card {
  min-height: 500px;
}

.log-detail {
  padding: 8px 0;
}

.user-agent {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  word-break: break-all;
  max-height: 100px;
  overflow-y: auto;
}

.detail-json {
  background-color: var(--td-bg-color-secondarycontainer);
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
