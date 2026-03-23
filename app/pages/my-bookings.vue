<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">我的预约</h2>
      <div class="header-actions">
        <t-button theme="primary" @click="handleCreateBooking">
          <template #icon><AddIcon /></template>
          新建预约
        </t-button>
      </div>
    </div>
      
    <t-card :bordered="false" class="content-card">
      <t-table
        row-key="id"
        :data="bookingData"
        :columns="columns"
        :hover="true"
        :pagination="pagination"
        :loading="bookingsPending"
      >
        <template #status="{ row }">
          <t-tag v-if="row.status === 'approved'" theme="success" variant="light">已通过</t-tag>
          <t-tag v-else-if="row.status === 'pending'" theme="warning" variant="light">待审批</t-tag>
          <t-tag v-else-if="row.status === 'rejected'" theme="danger" variant="light">已驳回</t-tag>
          <t-tag v-else theme="default" variant="light">已取消</t-tag>
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
      :confirm-btn="{ content: '提交预约', loading: submitLoading, disabled: !formData.recurringEnabled && conflictList.length > 0 }"
      width="min(600px, 95%)"
      @confirm="() => form?.submit()"
    >
      <t-form
        ref="form"
        :data="formData"
        :rules="rules"
        class="booking-form"
        label-align="top"
        @submit="onSubmit"
      >
        <t-form-item label="活动标题" name="title" required-mark>
          <t-input v-model="formData.title" placeholder="请输入活动标题" variant="filled" />
        </t-form-item>

        <t-form-item label="预约场地" name="roomId">
          <t-select v-model="formData.roomId" placeholder="请选择场地" variant="filled">
            <t-option v-for="item in roomOptions" :key="item.id" :value="item.id" :label="item.name" :disabled="!item.status" />
          </t-select>
        </t-form-item>

        <t-form-item label="使用组织" name="organizationId">
          <t-select v-model="formData.organizationId" placeholder="请选择使用组织" variant="filled">
            <t-option v-for="org in organizationOptions" :key="org.id" :value="org.id" :label="org.name" />
          </t-select>
        </t-form-item>

        <div class="recurring-main-row">
          <t-form-item label="周期预约" name="recurringEnabled" class="regular-switch-item" required-mark>
            <t-switch v-model="formData.recurringEnabled" />
          </t-form-item>
          <template v-if="formData.recurringEnabled">
            <t-form-item label="预约日（星期）" name="recurringWeekday" class="weekday-control" :required="formData.recurringEnabled" required-mark>
              <t-select v-model="formData.recurringWeekday" placeholder="请选择预约日" variant="filled">
                <t-option v-for="item in weekdayOptions" :key="item.value" :value="item.value" :label="item.label" />
              </t-select>
            </t-form-item>
            <t-form-item label="间隔（周）" name="recurringIntervalWeeks" class="recurring-interval-control" :required="formData.recurringEnabled" required-mark>
              <t-input-number v-model="formData.recurringIntervalWeeks" :min="1" :max="8" theme="normal" />
            </t-form-item>
            <t-form-item label="循环次数" name="recurringCount" class="recurring-count-control" :required="formData.recurringEnabled" required-mark>
              <t-input-number v-model="formData.recurringCount" :min="1" :max="52" theme="normal" />
            </t-form-item>
          </template>
        </div>

        <div class="date-time-row">
          <t-form-item :label="formData.recurringEnabled ? '首次日期' : '使用日期'" name="date" class="date-control" required-mark>
            <t-date-picker 
              v-model="formData.date" 
              style="width: 100%" 
              :disable-date="{ before: new Date().toISOString().split('T')[0] }"
              variant="filled"
            />
          </t-form-item>
          <t-form-item label="开始/结束时间" name="timeRange" class="time-control">
            <t-time-range-picker
              v-model="formData.timeRange"
              format="HH:mm"
              :steps="[1, 5]"
              style="width: 100%"
              clearable
              variant="filled"
            />
          </t-form-item>
        </div>

        <template v-if="formData.recurringEnabled">
          <div v-if="recurringRangeText" class="regular-hint">
            {{ recurringRangeText }}
          </div>
        </template>
        <div v-if="!formData.recurringEnabled && conflictList.length > 0" class="conflict-tip">
          冲突：与已有预约时间段重叠（
          <span v-for="(c, idx) in conflictList" :key="c.id">
            {{ formatTimeShort(c.startTime) }}-{{ formatTimeShort(c.endTime) }}
            <span v-if="idx < conflictList.length - 1">，</span>
          </span>
          ）
        </div>

        <t-form-item label="备注" name="remark">
          <t-input v-model="formData.remark" placeholder="请填写备注（如有）" variant="filled" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 查看预约详情对话框 -->
    <t-dialog
      v-model:visible="viewVisible"
      header="预约详情"
      :confirm-btn="{ content: '确定', variant: 'base' }"
      :cancel-btn="null"
      width="min(500px, 95%)"
      @confirm="viewVisible = false"
    >
      <t-descriptions :column="1" bordered v-if="currentBooking">
        <t-descriptions-item label="编号">{{ currentBooking.id }}</t-descriptions-item>
        <t-descriptions-item label="预约地点">{{ currentBooking.roomName }}</t-descriptions-item>
        <t-descriptions-item label="使用组织">{{ currentBooking.organizationName }}</t-descriptions-item>
        <t-descriptions-item label="预约时间">{{ currentBooking.time }}</t-descriptions-item>
        <t-descriptions-item label="活动标题">{{ currentBooking.title }}</t-descriptions-item>
        <t-descriptions-item label="状态">
          <t-tag v-if="currentBooking.status === 'approved'" theme="success" variant="light">已通过</t-tag>
          <t-tag v-else-if="currentBooking.status === 'pending'" theme="warning" variant="light">待审批</t-tag>
          <t-tag v-else-if="currentBooking.status === 'rejected'" theme="danger" variant="light">已驳回</t-tag>
          <t-tag v-else theme="default" variant="light">已取消</t-tag>
        </t-descriptions-item>
        <t-descriptions-item label="备注">{{ currentBooking.remark || '-' }}</t-descriptions-item>
      </t-descriptions>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { AddIcon } from 'tdesign-icons-vue-next';
import { ref, reactive, computed, watch, onMounted } from 'vue';
import type { PrimaryTableCol, FormRules } from 'tdesign-vue-next';
import { formatBookingTime, formatDateTime } from '~/utils/format';

useHead({ title: '我的预约' })

// 表格列定义
const columns: PrimaryTableCol[] = [
  { colKey: 'id', title: '编号', width: 80 },
  { colKey: 'roomName', title: '预约地点' },
  { colKey: 'organizationName', title: '使用组织' },
  { colKey: 'formattedTime', title: '预约时间', width: 300 },
  { colKey: 'title', title: '活动标题' },
  { colKey: 'createTime', title: '申请时间', width: 180 },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'action', title: '操作', width: 120, cell: 'action', fixed: 'right' },
];

// 获取预约列表
const { data: bookingsRes, refresh: refreshBookings, pending: bookingsPending } = await useFetch<any>('/api/bookings', {
  key: 'user-bookings',
  headers: useRequestHeaders(['cookie'])
});

onMounted(() => {
  refreshBookings();
  refreshUser();
});

const bookingData = computed(() => {
  const list = bookingsRes.value?.data || [];
  return list.map((b: any) => {
    return {
      ...b,
      formattedTime: formatBookingTime(b.startTime, b.endTime),
      time: formatBookingTime(b.startTime, b.endTime),
      createTime: formatDateTime(b.createTime)
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
const isAdmin = computed(() => ['super_admin', 'admin'].includes(userData.value?.role || ''));

// 获取全量组织列表（仅管理员需要，但为了逻辑简单可以统一获取或按需获取）
const { data: allOrgsRes } = await useFetch<any>('/api/organizations');
const allOrganizations = computed(() => allOrgsRes.value?.data || []);

const organizationOptions = computed(() => {
  if (isAdmin.value) return allOrganizations.value;
  return userOrganizations.value;
});

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
const submitLoading = ref(false);
const form = ref<any>(null);
const viewVisible = ref(false);
const currentBooking = ref<any>(null);

const formData = reactive({
  roomId: undefined as number | undefined,
  organizationId: undefined as number | undefined,
  date: '',
  timeRange: [] as string[],
  title: '',
  remark: '',
  recurringEnabled: false,
  recurringWeekday: undefined as number | undefined,
  recurringIntervalWeeks: 1,
  recurringCount: 4,
});

const weekdayOptions = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]

// 冲突检测结果
const conflictList = ref<any[]>([])

const formatTimeShort = (iso: string) => {
  try {
    const d = new Date(iso)
    return d.toTimeString().slice(0,5)
  } catch {
    return iso
  }
}

const toDateText = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const recurringLastDateText = computed(() => {
  if (!formData.recurringEnabled || !formData.date || !formData.recurringWeekday || !formData.recurringCount || !formData.recurringIntervalWeeks) {
    return ''
  }

  const firstDate = new Date(`${formData.date}T00:00:00`)
  if (Number.isNaN(firstDate.getTime())) {
    return ''
  }

  const totalDays = (formData.recurringCount - 1) * formData.recurringIntervalWeeks * 7
  const lastDate = addDays(firstDate, totalDays)
  return toDateText(lastDate)
})

const recurringRangeText = computed(() => {
  if (!recurringLastDateText.value) {
    return ''
  }
  return `最后一次日期：${recurringLastDateText.value}`
})

const checkConflict = async () => {
  conflictList.value = []
  if (formData.recurringEnabled) return
  if (!formData.roomId || !formData.date || !formData.timeRange || formData.timeRange.length < 2) return

  const start = `${formData.date}T${formData.timeRange[0]}:00`
  const end = `${formData.date}T${formData.timeRange[1]}:00`

  try {
    const res: any = await $fetch('/api/bookings/check', {
      method: 'GET',
      query: {
        roomId: formData.roomId,
        startTime: start,
        endTime: end
      }
    })
    conflictList.value = res.data || []
  } catch (e) {
    // 不阻塞提交，仅记录
    console.error('check conflict failed', e)
    conflictList.value = []
  }
}

// 监听表单相关字段，实时检测冲突
watch(() => [formData.roomId, formData.date, formData.timeRange], () => {
  checkConflict()
}, { deep: true })

watch(() => formData.recurringEnabled, (enabled) => {
  if (enabled) {
    conflictList.value = []
    return
  }
  checkConflict()
})

const rules: FormRules = {
  roomId: [{ required: true, message: '请选择场地', trigger: 'change' }],
  organizationId: [{ required: true, message: '请选择使用组织', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  timeRange: [{ required: true, message: '请选择时间范围', trigger: 'change' }],
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
};

const { data: roomsRes, pending: roomsPending } = await useFetch<any>('/api/rooms');
const roomOptions = computed(() => roomsRes.value?.data || []);


// 方法
const handleCreateBooking = () => {
  // 如果用户只有一个组织可供选择，自动预选
  if (organizationOptions.value.length === 1) {
    formData.organizationId = organizationOptions.value[0].id;
  }
  visible.value = true;
};

const onSubmit = async ({ validateResult, firstError }: any) => {
  if (validateResult === true) {
    if (!formData.date) {
      MessagePlugin.error(formData.recurringEnabled ? '请选择首次日期' : '请选择使用日期');
      return;
    }

    if (!formData.recurringEnabled) {
      const startTime = new Date(`${formData.date}T${formData.timeRange[0]}:00`);
      if (startTime < new Date()) {
        MessagePlugin.error('预约时间不能早于当前时间');
        return;
      }
    } else {
      if (!formData.recurringWeekday) {
        MessagePlugin.error('请选择预约日');
        return;
      }
      if (!formData.recurringIntervalWeeks || formData.recurringIntervalWeeks < 1) {
        MessagePlugin.error('间隔至少为1周');
        return;
      }
      if (!formData.recurringCount || formData.recurringCount < 1) {
        MessagePlugin.error('循环次数至少为1');
        return;
      }
    }

    submitLoading.value = true;
    try {
      const res: any = await $fetch('/api/bookings', {
        method: 'POST',
        body: {
          roomId: formData.roomId,
          organizationId: formData.organizationId,
          date: formData.date,
          timeRange: formData.timeRange,
          title: formData.title,
          remark: formData.remark,
          recurringBooking: formData.recurringEnabled ? {
            enabled: true,
            weekday: formData.recurringWeekday,
            intervalWeeks: formData.recurringIntervalWeeks,
            repeatCount: formData.recurringCount
          } : undefined
        }
      });
      
      if (res?.data?.isRecurringBooking) {
        MessagePlugin.success(`周期预约提交成功，共 ${res.data.totalCreated} 条`);
      } else {
        MessagePlugin.success('预约提交成功');
      }
      visible.value = false;
      refreshBookings(); // 刷新列表
      
      // 重置表单
      Object.assign(formData, {
        roomId: undefined,
        organizationId: undefined,
        date: '',
        timeRange: [],
        title: '',
        remark: '',
        recurringEnabled: false,
        recurringWeekday: undefined,
        recurringIntervalWeeks: 1,
        recurringCount: 4,
      });
      conflictList.value = [];
    } catch (error: any) {
      console.error('Submit booking error:', error);
      const detailError = error.data?.data?.errors?.[0]?.message || error.data?.statusMessage || '提交失败';
      MessagePlugin.error(detailError);
    } finally {
      submitLoading.value = false;
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
.conflict-tip {
  color: #d93025;
  font-size: 12px;
  margin-top: 6px;
}

.date-time-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.date-control {
  flex: 1;
  min-width: 0;
}

.weekday-control {
  flex: 1;
  min-width: 0;
}

.time-control {
  flex: 2;
  min-width: 0;
}

.recurring-count-control {
  flex: 1;
  min-width: 0;
}

.recurring-interval-control {
  flex: 1;
  min-width: 0;
}

.recurring-main-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.recurring-main-row :deep(.t-form__controls-content) {
  height: 32px;
  display: flex;
  align-items: center;
}

.regular-switch-item {
  flex: 1;
  min-width: 0;
}

.regular-hint {
  color: var(--td-text-color-secondary);
  font-size: 12px;
  margin-top: 2px;
  margin-bottom: 12px;
}

.booking-form :deep(.t-form__item) {
  margin-bottom: 16px;
}

.date-time-row :deep(.t-form__item),
.recurring-main-row :deep(.t-form__item) {
  margin-bottom: 0;
}
</style>
