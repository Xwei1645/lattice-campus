<template>
  <div class="page-container">
    <!-- 卡片 1: 一言 -->
    <t-card title="一言" :bordered="false" class="content-card quote-card">
      <div class="daily-quote">
        『万千孤单焰火 让这虚构灵魂鲜活』
      </div>
    </t-card>

    <!-- 卡片 2: 我的预约 -->
    <t-card title="我的预约" :bordered="false" class="content-card">
      <template #actions>
        <t-button theme="primary" @click="handleCreateBooking">
          新建预约
        </t-button>
      </template>
      
      <t-table
        row-key="id"
        :data="bookingData"
        :columns="columns"
        :hover="true"
        :pagination="pagination"
      >
        <template #status="{ row }">
          <t-tag v-if="row.status === 'confirmed'" theme="success" variant="light">已确认</t-tag>
          <t-tag v-else-if="row.status === 'pending'" theme="warning" variant="light">待审核</t-tag>
          <t-tag v-else theme="danger" variant="light">已取消</t-tag>
        </template>
        <template #action="{ row }">
          <t-link theme="primary" hover="color" style="margin-right: 8px" @click="handleView(row)">
            查看
          </t-link>
          <t-popconfirm content="确认取消该预约吗？" @confirm="handleCancel(row)">
            <t-link theme="danger" hover="color">取消</t-link>
          </t-popconfirm>
        </template>
      </t-table>
    </t-card>

    <!-- 新建预约对话框 -->
    <t-dialog
      v-model:visible="visible"
      header="新建预约"
      :footer="false"
      width="min(600px, 95%)"
    >
      <t-form
        ref="form"
        :data="formData"
        :rules="rules"
        label-align="top"
        @submit="onSubmit"
      >
        <t-form-item label="预约场地" name="roomId">
          <t-select v-model="formData.roomId" placeholder="请选择场地">
            <t-option v-for="item in roomOptions" :key="item.id" :value="item.id" :label="item.name" :disabled="!item.status" />
          </t-select>
        </t-form-item>

        <t-form-item label="使用组织" name="organizationId">
          <t-select v-model="formData.organizationId" placeholder="请选择使用组织">
            <t-option v-for="org in userOrganizations" :key="org.id" :value="org.id" :label="org.name" />
          </t-select>
        </t-form-item>

        <div style="display: flex; gap: 16px">
          <t-form-item label="使用日期" name="date" style="flex: 1">
            <t-date-picker v-model="formData.date" style="width: 100%" />
          </t-form-item>
          <t-form-item label="开始/结束时间" name="timeRange" style="flex: 1">
            <t-time-range-picker
              v-model="formData.timeRange"
              format="HH:mm"
              :steps="[1, 5]"
              style="width: 100%"
              clearable
            />
          </t-form-item>
        </div>

        <t-form-item label="使用说明" name="purpose">
          <t-textarea
            v-model="formData.purpose"
            placeholder="请用简洁说明场地用途"
            :autosize="{ minRows: 3, maxRows: 5 }"
          />
        </t-form-item>

        <t-form-item label="备注" name="remark">
          <t-input v-model="formData.remark" placeholder="请填写备注（如有）" />
        </t-form-item>

        <t-form-item style="margin-top: 24px">
          <div style="display: flex; justify-content: flex-end; width: 100%; gap: 12px">
            <t-button variant="outline" @click="visible = false">取消</t-button>
            <t-button theme="primary" type="submit">提交预约</t-button>
          </div>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 查看预约详情对话框 -->
    <t-dialog
      v-model:visible="viewVisible"
      header="预约详情"
      :footer="false"
      width="min(500px, 95%)"
    >
      <t-descriptions :column="1" bordered v-if="currentBooking">
        <t-descriptions-item label="预约编号">{{ currentBooking.id }}</t-descriptions-item>
        <t-descriptions-item label="预约地点">{{ currentBooking.roomName }}</t-descriptions-item>
        <t-descriptions-item label="使用组织">{{ currentBooking.orgName }}</t-descriptions-item>
        <t-descriptions-item label="预约时间">{{ currentBooking.time }}</t-descriptions-item>
        <t-descriptions-item label="预约事项">{{ currentBooking.purpose }}</t-descriptions-item>
        <t-descriptions-item label="状态">
          <t-tag v-if="currentBooking.status === 'confirmed'" theme="success" variant="light">已确认</t-tag>
          <t-tag v-else-if="currentBooking.status === 'pending'" theme="warning" variant="light">待审核</t-tag>
          <t-tag v-else theme="danger" variant="light">已取消</t-tag>
        </t-descriptions-item>
        <t-descriptions-item label="备注">{{ currentBooking.remark || '-' }}</t-descriptions-item>
      </t-descriptions>
      <div style="margin-top: 24px; display: flex; justify-content: flex-end">
        <t-button theme="primary" @click="viewVisible = false">确定</t-button>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { MessagePlugin, type PrimaryTableCol, type FormRules } from 'tdesign-vue-next';

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: '预约编号', width: 100 },
  { colKey: 'roomName', title: '预约地点', width: 150 },
  { colKey: 'orgName', title: '使用组织', width: 150 },
  { colKey: 'formattedTime', title: '预约时间', width: 250 },
  { colKey: 'purpose', title: '预约事项' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'action', title: '操作', width: 120, cell: 'action', fixed: 'right' },
];

// 获取预约列表
const { data: bookings, refresh: refreshBookings } = await useFetch<any[]>('/api/bookings', {
  key: 'user-bookings',
  headers: useRequestHeaders(['cookie'])
});

onMounted(() => {
  refreshBookings();
  refreshUser();
});

const bookingData = computed(() => {
  return (bookings.value || []).map((b: any) => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    const dateStr = start.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const startTimeStr = start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endTimeStr = end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    return {
      ...b,
      formattedTime: `${dateStr} ${startTimeStr}-${endTimeStr}`,
      time: `${dateStr} ${startTimeStr}-${endTimeStr}` // Keep for compatibility if needed
    };
  });
});

// 使用 useFetch 获取最新用户信息，确保服务端和客户端都能获取到数据
const { data: userData, refresh: refreshUser } = await useFetch<any>('/api/auth/me', {
  key: 'current-user-info',
  headers: useRequestHeaders(['cookie']),
  onResponseError({ response }) {
    if (response.status === 401) {
      navigateTo('/login');
    }
  }
});

const userOrganizations = computed(() => userData.value?.organizations || []);

// 监听用户信息变化并同步到 localStorage
watch(userData, (val) => {
  if (val && import.meta.client) {
    localStorage.setItem('user', JSON.stringify(val));
  }
}, { immediate: true });

// 分页配置
const pagination = reactive({
  defaultCurrent: 1,
  defaultPageSize: 10,
  total: 0,
});

watch(bookingData, (newData) => {
  pagination.total = newData.length;
});

// 对话框相关
const visible = ref(false);
const viewVisible = ref(false);
const currentBooking = ref<any>(null);

const formData = reactive({
  roomId: undefined as number | undefined,
  organizationId: undefined as number | undefined,
  date: '',
  timeRange: [] as string[],
  purpose: '',
  remark: '',
});

const rules: FormRules = {
  roomId: [{ required: true, message: '请选择场地', trigger: 'change' }],
  organizationId: [{ required: true, message: '请选择使用组织', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  timeRange: [{ required: true, message: '请选择时间范围', trigger: 'change' }],
  purpose: [{ required: true, message: '请输入使用说明', trigger: 'blur' }],
};

const { data: roomsData } = await useFetch<any[]>('/api/rooms');
const roomOptions = computed(() => roomsData.value || []);


// 方法
const handleCreateBooking = () => {
  // 如果用户只有一个组织，自动预选
  if (userOrganizations.value.length === 1) {
    formData.organizationId = userOrganizations.value[0].id;
  }
  visible.value = true;
};

const onSubmit = async ({ validateResult, firstError }: any) => {
  if (validateResult === true) {
    try {
      await $fetch('/api/bookings', {
        method: 'POST',
        body: {
          roomId: formData.roomId,
          organizationId: formData.organizationId,
          date: formData.date,
          timeRange: formData.timeRange,
          purpose: formData.purpose,
          remark: formData.remark
        }
      });
      
      MessagePlugin.success('预约提交成功');
      visible.value = false;
      refreshBookings(); // 刷新列表
      
      // 重置表单
      Object.assign(formData, {
        roomId: undefined,
        organizationId: undefined,
        date: '',
        timeRange: [],
        purpose: '',
        remark: '',
      });
    } catch (error: any) {
      MessagePlugin.error(error.data?.statusMessage || '提交失败');
    }
  } else {
    MessagePlugin.error(firstError);
  }
};

const handleView = (row: any) => {
  currentBooking.value = row;
  viewVisible.value = true;
};

const handleCancel = async (row: any) => {
  try {
    await $fetch('/api/bookings/update', {
      method: 'POST',
      body: { id: row.id, status: 'cancelled' }
    });
    MessagePlugin.success(`已取消预约: ${row.id}`);
    refreshBookings();
  } catch (error: any) {
    MessagePlugin.error(error.data?.statusMessage || '取消失败');
  }
};
</script>

<style scoped>
.quote-card {
  border-left: 4px solid var(--td-brand-color);
}

:deep(.quote-card .t-card__body) {
  padding-top: 0;
}

.daily-quote {
  font-size: 16px;
  color: var(--td-text-color-secondary);
  font-style: italic;
  padding: 0 0 8px 0;
}
</style>
