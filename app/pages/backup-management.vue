<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">数据备份</h2>
      <div class="header-actions">
        <t-button theme="primary" :loading="creating" @click="handleCreateBackup">
          <template #icon><CloudUploadIcon /></template>
          立即备份
        </t-button>
      </div>
    </div>

    <t-card :bordered="false" class="settings-card" title="自动备份设置">
      <t-form :data="settings" label-width="100px">
        <t-space break-line size="32px">
          <t-form-item label="自动备份" name="autoBackupEnabled">
            <t-switch v-model="settings.autoBackupEnabled" @change="handleSaveSettings" />
          </t-form-item>
          <t-form-item label="备份间隔" name="backupInterval">
            <t-input-number v-model="settings.backupInterval" :min="1" :max="168" align="center" style="width: 120px" theme="column" @blur="handleSaveSettings" />
            <span style="margin-left: 8px; color: var(--td-text-color-secondary)">小时</span>
          </t-form-item>
          <t-form-item label="保留数量" name="backupMaxKeep">
            <t-input-number v-model="settings.backupMaxKeep" :min="1" :max="100" align="center" style="width: 120px" theme="column" @blur="handleSaveSettings" />
            <span style="margin-left: 8px; color: var(--td-text-color-secondary)">份</span>
          </t-form-item>
        </t-space>
      </t-form>
    </t-card>

    <t-card :bordered="false" class="content-card">
      <t-alert theme="info" style="margin-bottom: 24px">
        系统会根据上述设置周期性自动备份数据库。还原操作会导致当前数据被完全覆盖，请谨慎操作。
      </t-alert>

      <t-table
        row-key="name"
        :data="backups"
        :columns="columns"
        :hover="true"
        :loading="loading"
        vertical-align="middle"
      >
        <template #size="{ row }">
          {{ formatFileSize(row.size) }}
        </template>
        <template #op="{ row }">
          <t-link theme="primary" hover="color" style="margin-right: 16px" @click="handleRename(row)">重命名</t-link>
          <t-link theme="primary" hover="color" style="margin-right: 16px" @click="handleRestore(row)">还原</t-link>
          <t-link theme="danger" hover="color" @click="handleDelete(row)">删除</t-link>
        </template>
      </t-table>
    </t-card>

    <!-- 重命名对话框 -->
    <t-dialog
      v-model:visible="renameVisible"
      header="重命名备份文件"
      :confirm-btn="{ content: '确定', loading: renameLoading }"
      width="400px"
      @confirm="submitRename"
    >
      <t-form :data="renameData" label-align="top">
        <t-form-item label="文件名" name="newName">
          <t-input v-model="renameData.newName" placeholder="请输入新文件名">
            <template #suffix>.sql</template>
          </t-input>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { CloudUploadIcon } from 'tdesign-icons-vue-next';
import { ref, reactive, onMounted } from 'vue'
import type { PrimaryTableCol, TableRowData } from 'tdesign-vue-next'

useHead({ title: '数据备份' })

const backups = ref<any[]>([])
const loading = ref(false)
const creating = ref(false)

const renameVisible = ref(false)
const renameLoading = ref(false)
const renameData = reactive({
  oldName: '',
  newName: ''
})

const settings = reactive({
  autoBackupEnabled: true,
  backupInterval: 12,
  backupMaxKeep: 10
})

const columns: PrimaryTableCol<TableRowData>[] = [
  { colKey: 'name', title: '备份文件名', minWidth: 280 },
  { colKey: 'size', title: '文件大小', width: 120 },
  { colKey: 'createTime', title: '备份时间', width: 200 },
  { colKey: 'op', title: '操作', width: 150, fixed: 'right' }
]

const fetchBackups = async () => {
  loading.value = true
  try {
    const [backupsRes, settingsRes] = await Promise.all([
      $fetch('/api/backups'),
      $fetch('/api/backups/settings')
    ])
    backups.value = backupsRes
    Object.assign(settings, settingsRes)
  } catch (error: any) {
    MessagePlugin.error(`获取数据失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const handleSaveSettings = async () => {
  try {
    await $fetch('/api/backups/settings', {
      method: 'POST',
      body: settings
    })
    // 自动生效时不需要频繁提示成功
  } catch (error: any) {
    MessagePlugin.error(`设置同步失败: ${error.message}`)
  }
}

const handleCreateBackup = async () => {
  creating.value = true
  try {
    await $fetch('/api/backups/create', { method: 'POST' })
    MessagePlugin.success('手动备份创建成功')
    fetchBackups()
  } catch (error: any) {
    MessagePlugin.error(`备份失败: ${error.message}`)
  } finally {
    creating.value = false
  }
}

const handleRename = (row: any) => {
  renameData.oldName = row.name
  // 移除后缀名显示在输入框，方便用户修改
  renameData.newName = row.name.replace(/\.sql$|\.dump$/, '')
  renameVisible.value = true
}

const submitRename = async () => {
  if (!renameData.newName) {
    MessagePlugin.warning('文件名不能为空')
    return
  }

  const finalNewName = renameData.newName.endsWith('.sql') || renameData.newName.endsWith('.dump') 
    ? renameData.newName 
    : `${renameData.newName}.sql`

  // 如果没有更改文件名，直接关闭对话框
  if (finalNewName === renameData.oldName) {
    renameVisible.value = false
    return
  }

  renameLoading.value = true
  try {
    await $fetch('/api/backups/rename', {
      method: 'POST',
      body: { 
        oldName: renameData.oldName, 
        newName: finalNewName 
      }
    })
    MessagePlugin.success('重命名成功')
    renameVisible.value = false
    fetchBackups()
  } catch (error: any) {
    MessagePlugin.error(`重命名失败: ${error.message}`)
  } finally {
    renameLoading.value = false
  }
}

const handleRestore = async (row: any) => {
  const confirmDialog = DialogPlugin.confirm({
    header: '风险提示',
    theme: 'warning',
    body: `确定要通过备份文件 ${row.name} 还原系统吗？这将覆盖当前所有数据且不可撤销！`,
    onConfirm: async () => {
      try {
        await $fetch('/api/backups/restore', {
          method: 'POST',
          body: { fileName: row.name }
        })
        MessagePlugin.success('数据库已成功恢复')
        confirmDialog.destroy()
      } catch (error: any) {
        MessagePlugin.error(`还原失败: ${error.message}`)
      }
    }
  })
}

const handleDelete = async (row: any) => {
  const confirmDialog = DialogPlugin.confirm({
    header: '确认删除',
    theme: 'danger',
    body: `确定删除备份文件 ${row.name} 吗？`,
    onConfirm: async () => {
      try {
        await $fetch('/api/backups/delete', {
          method: 'POST',
          body: { fileName: row.name }
        })
        MessagePlugin.success('备份文件已删除')
        fetchBackups()
        confirmDialog.destroy()
      } catch (error: any) {
        MessagePlugin.error(`删除失败: ${error.message}`)
      }
    }
  })
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

onMounted(() => {
  fetchBackups()
})
</script>

<style scoped>
.settings-card {
  margin-bottom: 16px;
}
.header-actions {
  display: flex;
  gap: 16px;
}
</style>
