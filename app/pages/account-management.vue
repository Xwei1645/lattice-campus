<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <div class="header-actions">
        <t-input-adornment>
          <t-input v-model="searchQuery" placeholder="搜索用户名/姓名" clearable variant="filled" />
          <template #append>
            <t-button theme="primary" @click="handleAddUser">
              <template #icon><AddIcon /></template>
              新增用户
            </t-button>
          </template>
        </t-input-adornment>
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
                  <t-icon name="logo-dingtalk" />
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
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'account', title: '用户名' },
  { colKey: 'name', title: '姓名' },
  { colKey: 'organizations', title: '所属组织', cell: 'organizations' },
  { colKey: 'role', title: '角色', cell: 'role' },
  { colKey: 'dingtalk', title: '钉钉绑定', width: 120, cell: 'dingtalk' },
  { colKey: 'status', title: '状态', width: 120, cell: 'status' },
  { colKey: 'createTime', title: '创建时间', width: 180, cell: 'createTime' },
  { colKey: 'op', title: '操作', width: 320, fixed: 'right', cell: 'op' },
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
  { width: '150px' },
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
    const state = `bind_${row.id}_${Date.now()}`;
    const res: any = await $fetch('/api/auth/dingtalk/login', {
      query: { state, bind: 'true' }
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

  const state = `bind_${currentBindUser.value.id}_${Date.now()}`;
  // 添加 redirect=true 参数，让后端直接重定向到钉钉授权页面
  const bindUrl = `/api/auth/dingtalk/login?state=${state}&bind=true&redirect=true`;

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

// 监听绑定结果消息
const handleBindMessage = (event: MessageEvent) => {
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

onMounted(() => {
  window.addEventListener('message', handleBindMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', handleBindMessage);
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
.header-actions {
  display: flex;
  gap: 16px;
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
</style>
