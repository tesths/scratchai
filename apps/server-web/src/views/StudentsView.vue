<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppShell from '@/components/AppShell.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useTeacherApiClient } from '@/services/teacherApi'
import { useTeacherDirectoryStore } from '@/stores/teacherDirectory'

const apiClient = useTeacherApiClient()
const directoryStore = useTeacherDirectoryStore()

const students = computed(() => directoryStore.students)

async function reloadStudents() {
  await directoryStore.loadStudents(apiClient)
}

onMounted(() => {
  void reloadStudents()
})
</script>

<template>
  <AppShell
    title="学生管理"
    description="展示学生最新进度、AI 提示和更新时间。"
  >
    <template #actions>
      <StatusBadge :tone="directoryStore.studentsLoading ? 'warning' : 'success'">
        {{ directoryStore.studentsLoading ? '加载中' : `${directoryStore.studentCount} 名学生` }}
      </StatusBadge>
      <button class="button button--ghost" type="button" :disabled="directoryStore.studentsLoading" @click="reloadStudents">
        刷新列表
      </button>
    </template>

    <section class="panel">
      <div class="panel__head">
        <div>
          <h2 class="panel__title">学生列表</h2>
          <p class="panel__meta">后续只要后端保持 `/api/students` 输出一致，就可以直接接上。</p>
        </div>
      </div>

      <p v-if="directoryStore.studentsError" role="alert" class="feedback feedback--error">
        {{ directoryStore.studentsError }}
      </p>

      <div v-if="!directoryStore.studentsLoading && !students.length" class="empty-state">
        暂无学生数据
      </div>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>学生</th>
              <th>班级</th>
              <th>最新进度</th>
              <th>最新 AI 提示</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in students" :key="student.id">
              <td>{{ student.name }}</td>
              <td>{{ student.className }}</td>
              <td>
                <div class="progress-track" :aria-label="`${student.name} 进度 ${student.progress}%`">
                  <div class="progress-bar" :style="{ width: `${student.progress}%` }" />
                </div>
                <span class="cell-subtle">{{ student.progress }}%</span>
              </td>
              <td>{{ student.latestAiHint }}</td>
              <td>{{ student.updatedAt }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </AppShell>
</template>
