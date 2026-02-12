<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
    </div>

    <!-- 用户类型Tab -->
    <t-tabs v-model="activeTab" class="user-tabs">
      <t-tab-panel value="admin" label="管理员">
        <div class="management-container">
          <div class="management-header">
            <div class="header-actions">
              <t-input
                v-model="searchQuery"
                placeholder="搜索用户名/姓名"
                clearable
                variant="filled"
                style="width: 200px"
              />
              <t-button theme="primary" @click="handleAddUser">
                <template #icon><AddIcon /></template>
                新增用户
              </t-button>
            </div>
          </div>
          <t-card :bordered="false" class="content-card">
            <t-skeleton :loading="loading" :row-col="tableSkeleton" animation="gradient">
              <t-table
                row-key="id"
                :data="filteredUserData"
                :columns="columns"
                :hover="true"
                :loading="loading"
                :pagination="pagination"
                :scroll="{ type: 'auto', x: 800 }"
                table-layout="fixed"
              >
                <template #createTime="{ row }">
                  {{ formatDateTime(row.createTime) }}
                </template>
                <template #role="{ row }">
                  <t-tag :theme="getRoleTheme(row.role)" variant="light">
                    {{ getRoleName(row.role) }}
                  </t-tag>
                </template>
                <template #organizations="{ row }">
                  <t-space break-line :size="4">
                    <t-tag v-for="org in row.organizations" :key="org.id" variant="light">
                      {{ org.name }}
                    </t-tag>
                  </t-space>
                </template>
                <template #dingtalk="{ row }">
                  <t-tag v-if="row.dingTalkOpenId" theme="success" variant="light">
                    <template #icon><t-icon name="check-circle" /></template>
                    已绑定
                  </t-tag>
                  <t-tag v-else theme="default" variant="light">
                    <template #icon><t-icon name="close-circle" /></template>
                    未绑定
                  </t-tag>
                </template>
                <template #status="{ row }">
                  <t-switch v-model="row.status" :label="['启用', '禁用']" @change="(val: any) => handleStatusChange(row, val)" />
                </template>
                <template #op="{ row }">
                  <t-link theme="primary" hover="color" style="margin-right: 16px" @click="handleEdit(row)">编辑</t-link>
                  <t-link theme="warning" hover="color" style="margin-right: 16px" @click="handleResetPassword(row)">重置密码</t-link>
                  <t-link 
                    v-if="row.dingTalkOpenId"
                    theme="danger" 
                    hover="color" 
                    style="margin-right: 16px"
                    @click="handleUnbindDingtalk(row)"
                  >
                    解绑钉钉
                  </t-link>
                  <t-link 
                    v-else
                    theme="success" 
                    hover="color" 
                    style="margin-right: 16px"
                    @click="handleBindDingtalk(row)"
                  >
                    绑定钉钉
                  </t-link>
                  <t-link 
                    v-if="currentUser && row.id !== 1 && row.id !== currentUser.id" 
                    theme="danger" 
                    hover="color" 
                    @click="handleDelete(row)"
                  >
                    删除
                  </t-link>
                </template>
              </t-table>
            </t-skeleton>
          </t-card>
        </div>
      </t-tab-panel>
      <t-tab-panel value="teacher" label="教师">
        <TeacherManagement />
      </t-tab-panel>
      <t-tab-panel value="student" label="学生">
        <StudentManagement />
      </t-tab-panel>
    </t-tabs>

    <!-- 新增/编辑对话框 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      :confirm-btn="{ content: '确定', loading: submitLoading }"
      width="min(500px, 95%)"
      @confirm="() => formRef?.submit()"
    >
      <t-form ref="formRef" :data="formData" :rules="rules" label-align="top" @submit="onFormSubmit">
        <t-form-item label="用户名" name="account">
          <t-input v-model="formData.account" placeholder="请输入登录用户名" :disabled="isEdit" variant="filled" />
        </t-form-item>
        <t-form-item label="姓名" name="name">
          <t-input v-model="formData.name" placeholder="请输入真实姓名" variant="filled" />
        </t-form-item>
        <t-form-item v-if="!isEdit" label="初始密码" name="password">
          <t-input v-model="formData.password" type="password" placeholder="请输入初始密码" variant="filled" />
        </t-form-item>
        <t-form-item label="角色权限" name="role">
          <t-select v-model="formData.role" placeholder="请选择角色" variant="filled">
            <t-option label="普通用户" value="user" />
            <t-option label="管理员" value="admin" />
            <t-option label="超级管理员" value="super_admin" />
          </t-select>
        </t-form-item>
        <t-form-item label="所属组织" name="organizationIds">
          <t-select v-model="formData.organizationIds" multiple placeholder="请选择组织" variant="filled">
            <t-option v-for="org in organizations" :key="org.id" :label="org.name" :value="org.id" />
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
      <t-form ref="resetFormRef" :data="resetData" :rules="resetRules" label-align="top" @submit="onResetSubmit">
        <t-form-item label="新密码" name="newPassword">
          <t-input v-model="resetData.newPassword" type="password" placeholder="请输入新密码" variant="filled" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 绑定钉钉对话框 -->
    <t-dialog
      v-model:visible="bindDingtalkVisible"
      header="绑定钉钉账号"
      :footer="false"
      width="min(450px, 95%)"
    >
      <div class="bind-dingtalk-content">
        <t-tabs v-model="bindDingtalkTab" class="bind-tabs">
          <t-tab-panel value="qrcode" label="扫码绑定">
            <div v-if="bindDingtalkLoading" class="bind-loading">
              <t-icon name="loading" size="48px" />
              <p>正在加载...</p>
            </div>
            <iframe
              v-else
              :src="bindDingtalkUrl"
              class="bind-iframe"
              frameborder="0"
              scrolling="no"
            />
            <p class="bind-tip">请使用钉钉扫描二维码完成绑定</p>
          </t-tab-panel>
          <t-tab-panel value="other" label="其他方式">
            <div class="bind-other-content">
              <p class="bind-hint">使用钉钉账号密码或通行密钥绑定</p>
              <div class="bind-other-info">
                <t-icon name="tips" size="24px" class="info-icon" />
                <p class="info-text">点击按钮后将打开钉钉授权页面，登录完成后自动绑定到当前用户</p>
              </div>
              <t-button theme="primary" block size="large" @click="openDingtalkBind">
                <template #icon>
                  <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
                    <path d="M277.205 42.667l3.563.149c13.653 1.173 26.56 6.592 36.843 15.424l1.365 1.237 224.64 194.603 59.819 51.221 44.522 37.504 43.392 35.67 25.558 20.416 17.258 13.525 23.552 18.176 18.646 14.208 9.813 7.424c60.16 45.355 57.557 119.083 12.736 168.341l-5.312 5.547-37.93 37.867 1.343.661c26.112 13.803 32.235 50.56 6.294 73.387l-2.518 2.133-323.093 231.104-1.024.81a51.84 51.84 0 01-22.4 8.769l-4.053.426-2.56.064c-40.448 0-54.187-39.168-39.403-67.733l1.515-2.73 67.008-108.673h-5.44c-35.563 0-55.616-35.221-40.427-64.576l28.16-47.36-1.43-.256C337.366 672.384 272.492 612.245 254.7 550.7l-1.28-4.736a55.19 55.19 0 013.626-36.907l1.152-2.219-.597-.597c-44.373-45.973-69.013-108.736-65.216-174.677l.427-6.187c1.77-20.245 12.117-37.93 28.928-46.507l1.77-.853-.341-.768c-24.256-56.107-27.328-121.173-3.883-186.603l2.432-6.528c8.79-22.784 26.411-39.594 51.264-41.301l4.224-.15zm36.907 128.661c-5.76 0-10.453 4.395-13.44 12.245-31.232 81.664 46.165 159.958 95.232 201.664 49.067 41.728 122.155 80.214 167.19 100.459 1.493.747.575 2.73-.854 2.73a1.579 1.579 0 01-.704 0c-82.261-35.69-170.752-67.114-248.341-126.08a14.293 14.293 0 00-8.534-3.413c-4.864 0-8.618 3.862-9.301 11.883-5.76 69.077 66.24 139.35 131.605 164.843 35.072 12.16 71.467 20.224 108.416 24.085 1.856.213 1.451 2.901-.405 2.901h-.917c-50.475-.938-125.355-8.938-172.459-26.837a13.568 13.568 0 00-4.843-.96c-6.293 0-8.426 6.187-7.168 11.392 8.15 32.939 74.368 81.557 140.011 92.203 9.557 1.408 19.2 2.069 28.864 1.984h8.384c2.304 0 3.221 1.493 2.304 3.541l-20.267 34.197-4.906 8.278-21.355 36.053c-1.493 2.517-.576 4.565 2.581 4.565h58.262c2.709 0 4.394 1.707 2.986 3.968l-82.261 134.486c-2.176 3.712-1.024 6.784 1.963 6.784a8.021 8.021 0 00-4.629-1.835l229.355-179.2c3.242-2.56 2.432-5.696-2.07-5.696h-52.821c-3.413 0-4.224-2.347-1.856-4.608 1.579-1.536 27.69-27.179 50.987-50.368l6.869-6.87c8.96-8.98 17.067-17.151 22.507-22.783 21.312-22.08 32.213-62.55-3.862-89.984-111.957-85.419-255.68-212.928-394.24-334.272a18.56 18.56 0 00-12.032-4.459z" />
                  </svg>
                </template>
                跳转钉钉授权绑定
              </t-button>
            </div>
          </t-tab-panel>
        </t-tabs>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { AddIcon } from 'tdesign-icons-vue-next';
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import type { PrimaryTableCol, FormRules } from 'tdesign-vue-next';

useHead({ title: '用户管理' })

// 当前激活的Tab
const activeTab = ref<'admin' | 'teacher' | 'student'>('admin');

interface Organization {
  id: number;
  name: string;
}

interface User {
  id: number;
  account: string;
  name: string;
  role: string;
  status: boolean;
  createTime: string;
  dingTalkOpenId?: string;
  password?: string;
  organizations?: Organization[];
}

// 获取当前用户信息
const currentUser = ref<any>(null);

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}`;
};

onMounted(() => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      currentUser.value = JSON.parse(userStr);
    }
  } catch (e) {
    console.error('Failed to parse user info', e);
  }
});

// 获取后端数据
const { data: userResponse, refresh, pending: loading } = await useFetch<any>('/api/users');
const { data: orgResponse } = await useFetch<any>('/api/organizations');
const userData = computed(() => userResponse.value?.data || []);
const organizations = computed(() => orgResponse.value?.data || []);

const searchQuery = ref('');
const filteredUserData = computed(() => {
  if (!searchQuery.value) return userData.value;
  const q = searchQuery.value.toLowerCase();
  return userData.value.filter((u: User) => 
    u.account.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
  );
});

const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 70 },
  { colKey: 'account', title: '用户名', width: 120 },
  { colKey: 'name', title: '姓名', width: 100 },
  { colKey: 'organizations', title: '所属组织', width: 150, cell: 'organizations' },
  { colKey: 'role', title: '角色', width: 120, cell: 'role' },
  { colKey: 'dingtalk', title: '钉钉绑定', width: 100, cell: 'dingtalk' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'createTime', title: '创建时间', width: 180, cell: 'createTime' },
  { colKey: 'op', title: '操作', width: 120, fixed: 'right', cell: 'op' },
];

const pagination = reactive({
  defaultCurrent: 1,
  defaultPageSize: 10,
  total: computed(() => filteredUserData.value.length),
});

// 骨架屏配置
const tableSkeleton = Array(8).fill([
  { width: '40px' },
  { width: '120px' },
  { width: '100px' },
  { width: '180px' },
  { width: '100px' },
  { width: '100px' },
  { width: '100px' },
  { width: '200px' },
  { width: '150px' },
]);

const getRoleName = (role: string) => {
  const map: Record<string, string> = {
    super_admin: '超级管理员',
    admin: '管理员',
    user: '普通用户',
  };
  return map[role] || role;
};

const getRoleTheme = (role: string) => {
  if (role === 'super_admin') return 'danger';
  if (role === 'admin') return 'warning';
  return 'default';
};

// 表单逻辑
const dialogVisible = ref(false);
const submitLoading = ref(false);
const formRef = ref<any>(null);
const isEdit = ref(false);
const dialogTitle = computed(() => isEdit.value ? '编辑用户' : '新增用户');
const formData = reactive({
  id: null as number | null,
  account: '',
  name: '',
  password: '',
  role: 'user',
  organizationIds: [] as number[],
});

const rules: FormRules = {
  account: [{ required: true, message: '用户名不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '姓名不能为空', trigger: 'blur' }],
  password: [{ required: !isEdit.value, message: '初始密码不能为空', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
};

// 重置密码逻辑
const resetVisible = ref(false);
const resetLoading = ref(false);
const resetFormRef = ref<any>(null);
const resetData = reactive({
  id: null as number | null,
  account: '',
  newPassword: '',
});

const resetRules: FormRules = {
  newPassword: [{ required: true, message: '新密码不能为空', trigger: 'blur' }],
};

// 绑定钉钉逻辑
const bindDingtalkVisible = ref(false);
const bindDingtalkLoading = ref(false);
const bindDingtalkUrl = ref('');
const bindDingtalkTab = ref<string>('qrcode');
const currentBindUser = ref<User | null>(null);

const handleAddUser = () => {
  isEdit.value = false;
  Object.assign(formData, { id: null, account: '', name: '', password: '', role: 'user', organizationIds: [] });
  dialogVisible.value = true;
};

const handleEdit = (row: User) => {
  isEdit.value = true;
  Object.assign(formData, { ...row, password: '', organizationIds: row.organizations?.map((o: any) => o.id) || [] });
  dialogVisible.value = true;
};

const onFormSubmit = async ({ validateResult, firstError }: any) => {
  if (validateResult === true) {
    submitLoading.value = true;
    try {
      if (isEdit.value && formData.id !== null) {
        await $fetch('/api/users/update', {
          method: 'POST',
          body: {
            id: formData.id,
            name: formData.name,
            role: formData.role,
            organizationIds: formData.organizationIds
          }
        });
        MessagePlugin.success('修改成功');
      } else {
        await $fetch('/api/users', {
          method: 'POST',
          body: {
            account: formData.account,
            name: formData.name,
            password: formData.password,
            role: formData.role,
            organizationIds: formData.organizationIds
          }
        });
        MessagePlugin.success('新增成功');
      }
      await refresh();
      dialogVisible.value = false;
    } catch (error: any) {
      MessagePlugin.error(error.data?.statusMessage || '操作失败');
    } finally {
      submitLoading.value = false;
    }
  } else {
    MessagePlugin.error(firstError);
  }
};

const handleStatusChange = async (row: User, val: any) => {
  try {
    await $fetch('/api/users/update', {
      method: 'POST',
      body: {
        id: row.id,
        name: row.name,
        role: row.role,
        status: val
      }
    });
    MessagePlugin.success(`用户 ${row.account} 已${val ? '启用' : '禁用'}`);
    await refresh();
  } catch (error: any) {
    MessagePlugin.error('状态更新失败');
    row.status = !val; // 回滚
  }
};

const handleResetPassword = (row: User) => {
  resetData.id = row.id;
  resetData.account = row.account;
  resetData.newPassword = '';
  resetVisible.value = true;
};

const onResetSubmit = async ({ validateResult, firstError }: any) => {
  if (validateResult === true) {
    resetLoading.value = true;
    try {
      await $fetch(`/api/users/${resetData.id}/reset-password`, {
        method: 'POST',
        body: { password: resetData.newPassword }
      });
      MessagePlugin.success(`用户 ${resetData.account} 的密码已成功重置`);
      resetVisible.value = false;
    } catch (error: any) {
      MessagePlugin.error('重置失败');
    } finally {
      resetLoading.value = false;
    }
  } else {
    MessagePlugin.error(firstError);
  }
};

// 钉钉绑定窗口引用
const dingtalkBindWindow = ref<Window | null>(null);

// 绑定钉钉 - 扫码方式
const handleBindDingtalk = async (row: User) => {
  currentBindUser.value = row;
  bindDingtalkVisible.value = true;
  bindDingtalkTab.value = 'qrcode';
  bindDingtalkLoading.value = true;

  try {
    // 使用绑定模式，回调到 dingtalk-bind-bridge.html
    // 使用 bindUserId 参数，后端会自动生成 state
    const res: any = await $fetch('/api/auth/dingtalk/login', {
      query: { bind: 'true', bindUserId: row.id.toString() }
    });
    const authUrl = res.url || '';
    // 使用 dingtalk-bind.html 显示二维码
    bindDingtalkUrl.value = `/dingtalk-bind.html?authUrl=${encodeURIComponent(authUrl)}&userId=${row.id}`;
  } catch (error: any) {
    console.error('Failed to load dingtalk auth URL:', error);
    MessagePlugin.error('加载钉钉绑定失败');
  } finally {
    bindDingtalkLoading.value = false;
  }
};

// 打开钉钉授权绑定（新窗口）- 密码/通行密钥方式
const openDingtalkBind = () => {
  if (!currentBindUser.value) return;

  // 使用 bindUserId 参数，后端会自动生成 state
  const bindUrl = `/api/auth/dingtalk/login?bind=true&bindUserId=${currentBindUser.value.id}&redirect=true`;

  // 打开绑定窗口
  dingtalkBindWindow.value = window.open(bindUrl, 'dingtalkBind', 'width=600,height=600');

  // 监听窗口关闭
  const checkWindowClosed = setInterval(() => {
    if (dingtalkBindWindow.value && dingtalkBindWindow.value.closed) {
      clearInterval(checkWindowClosed);
      dingtalkBindWindow.value = null;
      // 刷新用户列表
      refresh();
    }
  }, 500);
};

// 解绑钉钉
const handleUnbindDingtalk = async (row: User) => {
  const confirmDialog = DialogPlugin.confirm({
    header: '确认解绑',
    body: `确定解绑用户 ${row.account} 的钉钉账号吗？解绑后将无法使用钉钉登录。`,
    onConfirm: async () => {
      try {
        await $fetch('/api/users/unbind-dingtalk', {
          method: 'POST',
          body: { id: row.id }
        });
        MessagePlugin.success('解绑成功');
        await refresh();
        confirmDialog.destroy();
      } catch (error: any) {
        MessagePlugin.error(error.data?.statusMessage || '解绑失败');
      }
    },
  });
};

// 监听绑定结果消息（来自 iframe）
const handleBindMessage = (event: MessageEvent) => {
  // 验证消息来源
  if (event.origin !== window.location.origin) {
    return;
  }

  const data = event.data;

  if (data && typeof data === 'object' && data.type === 'dingtalk_bind_result') {
    if (data.success) {
      MessagePlugin.success('钉钉绑定成功');
      bindDingtalkVisible.value = false;
      refresh();
    } else {
      MessagePlugin.error(data.message || '钉钉绑定失败');
    }
  }
};

// 监听绑定完成消息（来自弹窗）
const handleBindComplete = (event: MessageEvent) => {
  // 验证消息来源
  if (event.origin !== window.location.origin) {
    return;
  }

  const data = event.data;

  if (data && typeof data === 'object' && data.type === 'dingtalk_bind_complete') {
    if (data.success) {
      MessagePlugin.success('钉钉绑定成功');
      bindDingtalkVisible.value = false;
      refresh();
    } else {
      MessagePlugin.error(data.message || '钉钉绑定失败');
    }
  }
};

onMounted(() => {
  window.addEventListener('message', handleBindMessage);
  window.addEventListener('message', handleBindComplete);
});

onUnmounted(() => {
  window.removeEventListener('message', handleBindMessage);
  window.removeEventListener('message', handleBindComplete);
});

const handleDelete = async (row: User) => {
  const confirmDialog = DialogPlugin.confirm({
    header: '确认删除',
    body: `确定删除用户 ${row.account} 吗？删除后无法恢复。`,
    onConfirm: async () => {
      try {
        await $fetch('/api/users/delete', { 
          method: 'POST',
          body: { id: row.id }
        });
        MessagePlugin.success('删除成功');
        await refresh();
        confirmDialog.destroy();
      } catch (error: any) {
        MessagePlugin.error('删除失败');
      }
    },
  });
};
</script>

<style scoped>
.user-tabs {
    margin-top: 16px;
}

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

.bind-dingtalk-content {
  padding: 16px 0;
}

.bind-tabs {
  margin-bottom: 16px;
}

.bind-iframe {
  width: 100%;
  height: 280px;
  border: none;
  border-radius: 8px;
}

.bind-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--td-text-color-secondary);
  height: 280px;
}

.bind-tip {
  margin-top: 12px;
  font-size: 13px;
  color: var(--td-text-color-placeholder);
  text-align: center;
}

.bind-other-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.bind-hint {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  margin-bottom: 20px;
}

.bind-other-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background-color: var(--td-bg-color-container-hover);
  border-radius: 8px;
  margin-bottom: 24px;
}

.info-icon {
  color: var(--td-brand-color);
  flex-shrink: 0;
}

.info-text {
  font-size: 13px;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
  margin: 0;
}

/* 表格横向滚动 */
:deep(.t-table__content) {
    overflow-x: auto;
}

/* 移动端适配 */
@media (max-width: 767px) {
    .management-header {
        margin-bottom: 12px;
    }

    .header-actions {
        flex-direction: column;
        gap: 8px;
    }

    .header-actions :deep(.t-input) {
        width: 100% !important;
    }

    .header-actions :deep(.t-button) {
        width: 100%;
    }

    :deep(.t-table) {
        font-size: 12px;
    }

    :deep(.t-table th),
    :deep(.t-table td) {
        padding: 8px 10px !important;
    }

    :deep(.t-form-item) {
        margin-bottom: 16px;
    }

    .bind-iframe {
        height: 240px;
    }

    .bind-other-content {
        padding: 16px;
    }

    .bind-other-info {
        flex-direction: column;
        align-items: center;
        text-align: center;
    }
}
</style>
