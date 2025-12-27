<template>
  <div class="page-container">
    <t-card title="用户管理" :bordered="false" class="content-card">
      <template #actions>
        <div class="header-actions">
          <t-input-adornment>
            <t-input v-model="searchQuery" placeholder="搜索用户名/姓名" clearable />
            <template #append>
              <t-button theme="primary" @click="handleAddUser">
                <template #icon><add-icon /></template>
                新增用户
              </t-button>
            </template>
          </t-input-adornment>
        </div>
      </template>

      <t-table
        row-key="id"
        :data="filteredUserData"
        :columns="columns"
        :hover="true"
        :pagination="pagination"
      >
        <template #role="{ row }">
          <t-tag :theme="getRoleTheme(row.role)" variant="light">
            {{ getRoleName(row.role) }}
          </t-tag>
        </template>
        <template #organizations="{ row }">
          <t-space break-line :size="4">
            <t-tag v-for="org in row.organizations" :key="org.id" variant="light-outline">
              {{ org.name }}
            </t-tag>
          </t-space>
        </template>
        <template #status="{ row }">
          <t-switch v-model="row.status" :label="['启用', '禁用']" @change="(val) => handleStatusChange(row, val)" />
        </template>
        <template #op="{ row }">
          <t-link theme="primary" hover="color" style="margin-right: 16px" @click="handleEdit(row)">编辑</t-link>
          <t-link theme="warning" hover="color" style="margin-right: 16px" @click="handleResetPassword(row)">重置密码</t-link>
          <t-link theme="danger" hover="color" @click="handleDelete(row)">删除</t-link>
        </template>
      </t-table>
    </t-card>

    <!-- 新增/编辑对话框 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      :footer="false"
      width="500px"
    >
      <t-form :data="formData" :rules="rules" label-align="top" @submit="onFormSubmit">
        <t-form-item label="用户名" name="account">
          <t-input v-model="formData.account" placeholder="请输入登录用户名" :disabled="isEdit" />
        </t-form-item>
        <t-form-item label="姓名" name="name">
          <t-input v-model="formData.name" placeholder="请输入真实姓名" />
        </t-form-item>
        <t-form-item v-if="!isEdit" label="初始密码" name="password">
          <t-input v-model="formData.password" type="password" placeholder="请输入初始密码" />
        </t-form-item>
        <t-form-item label="角色权限" name="role">
          <t-select v-model="formData.role" placeholder="请选择角色" :disabled="isSuperAdminRole">
            <t-option label="普通用户" value="user" />
            <t-option label="管理员" value="admin" />
            <t-option label="超级管理员" value="super_admin" />
          </t-select>
          <div v-if="isSuperAdminRole" style="font-size: 12px; color: var(--td-text-color-placeholder); margin-top: 4px;">
            超级管理员权限不可修改
          </div>
        </t-form-item>
        <t-form-item label="所属组织" name="organizationIds">
          <t-select v-model="formData.organizationIds" multiple placeholder="请选择组织">
            <t-option v-for="org in organizations" :key="org.id" :label="org.name" :value="org.id" />
          </t-select>
        </t-form-item>
        <t-form-item style="margin-top: 32px">
          <div style="display: flex; justify-content: flex-end; width: 100%; gap: 12px">
            <t-button variant="outline" @click="dialogVisible = false">取消</t-button>
            <t-button theme="primary" type="submit">确定</t-button>
          </div>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 重置密码对话框 -->
    <t-dialog
      v-model:visible="resetVisible"
      header="重置密码"
      :footer="false"
      width="400px"
    >
      <t-form :data="resetData" :rules="resetRules" label-align="top" @submit="onResetSubmit">
        <t-form-item label="新密码" name="newPassword">
          <t-input v-model="resetData.newPassword" type="password" placeholder="请输入新密码" />
        </t-form-item>
        <t-form-item style="margin-top: 24px">
          <div style="display: flex; justify-content: flex-end; width: 100%; gap: 12px">
            <t-button variant="outline" @click="resetVisible = false">取消</t-button>
            <t-button theme="primary" type="submit">确定重置</t-button>
          </div>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { MessagePlugin, DialogPlugin, type PrimaryTableCol, type FormRules } from 'tdesign-vue-next';
import { AddIcon } from 'tdesign-icons-vue-next';

interface User {
  id: number;
  account: string;
  name: string;
  role: string;
  status: boolean;
  createTime: string;
  password?: string;
}

// 获取后端数据
const { data: users, refresh } = await useFetch<User[]>('/api/users');
const { data: organizations } = await useFetch('/api/organizations');
const userData = computed(() => users.value || []);

const searchQuery = ref('');
const filteredUserData = computed(() => {
  if (!searchQuery.value) return userData.value;
  const q = searchQuery.value.toLowerCase();
  return userData.value.filter(u => 
    u.account.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
  );
});

const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'account', title: '用户名', width: 150 },
  { colKey: 'name', title: '姓名', width: 120 },
  { colKey: 'organizations', title: '所属组织', width: 200, cell: 'organizations' },
  { colKey: 'role', title: '角色', width: 150, cell: 'role' },
  { colKey: 'status', title: '状态', width: 120, cell: 'status' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'op', title: '操作', width: 220, fixed: 'right', cell: 'op' },
];

const pagination = reactive({
  defaultCurrent: 1,
  defaultPageSize: 10,
  total: computed(() => filteredUserData.value.length),
});

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
const isEdit = ref(false);
const dialogTitle = computed(() => isEdit.value ? '编辑用户' : '新增用户');
const isSuperAdminRole = computed(() => isEdit.value && formData.role === 'super_admin');
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
const resetData = reactive({
  id: null as number | null,
  account: '',
  newPassword: '',
});

const resetRules: FormRules = {
  newPassword: [{ required: true, message: '新密码不能为空', trigger: 'blur' }],
};

const handleAddUser = () => {
  isEdit.value = false;
  Object.assign(formData, { id: null, account: '', name: '', password: '', role: 'user', organizationIds: [] });
  dialogVisible.value = true;
};

const handleEdit = (row: any) => {
  isEdit.value = true;
  Object.assign(formData, { ...row, password: '', organizationIds: row.organizations?.map((o: any) => o.id) || [] });
  dialogVisible.value = true;
};

const onFormSubmit = async ({ validateResult, firstError }: any) => {
  if (validateResult === true) {
    try {
      if (isEdit.value && formData.id !== null) {
        await $fetch('/api/users/update', {
          method: 'POST',
          body: {
            id: formData.id,
            name: formData.name,
            role: formData.role,
            status: true // 保持当前状态或根据需要修改
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
            role: formData.role
          }
        });
        MessagePlugin.success('新增成功');
      }
      await refresh();
      dialogVisible.value = false;
    } catch (error: any) {
      MessagePlugin.error(error.data?.statusMessage || '操作失败');
    }
  } else {
    MessagePlugin.error(firstError);
  }
};

const handleStatusChange = async (row: any, val: any) => {
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

const handleResetPassword = (row: any) => {
  resetData.id = row.id;
  resetData.account = row.account;
  resetData.newPassword = '';
  resetVisible.value = true;
};

const onResetSubmit = async ({ validateResult, firstError }: any) => {
  if (validateResult === true) {
    try {
      await $fetch(`/api/users/${resetData.id}/reset-password`, {
        method: 'POST',
        body: { password: resetData.newPassword }
      });
      MessagePlugin.success(`用户 ${resetData.account} 的密码已成功重置`);
      resetVisible.value = false;
    } catch (error: any) {
      MessagePlugin.error('重置失败');
    }
  } else {
    MessagePlugin.error(firstError);
  }
};

const handleDelete = async (row: any) => {
  if (row.id === 1) {
    MessagePlugin.warning('系统默认超级管理员不能删除');
    return;
  }
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
}

.ml-2 {
  margin-left: 8px;
}
</style>
