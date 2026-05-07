<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useTeacherApiClient } from '@/services/teacherApi'
import { useLiveDashboardStore } from '@/stores/liveDashboard'

const route = useRoute()
const apiClient = useTeacherApiClient()
const liveStore = useLiveDashboardStore()

const releaseId = computed(() => String(route.params.id ?? ''))

watch(
  releaseId,
  (nextReleaseId) => {
    if (!nextReleaseId) {
      return
    }

    void liveStore.startPolling(apiClient, nextReleaseId)
  },
  {
    immediate: true,
  },
)

onBeforeUnmount(() => {
  liveStore.stopPolling()
})
</script>

<template>
  <AppShell
    title="实时看板"
    description="先用轮询保持刷新，等后端 ready 之后再切换成更高效的推送模型。"
  >
    <template #actions>
      <StatusBadge :tone="liveStore.loading ? 'warning' : 'success'">
        {{ liveStore.loading ? '刷新中' : '轮询中' }}
      </StatusBadge>
    </template>

    <section class="live-banner">
      <div>
        <p class="page-header__eyebrow">发布单 {{ liveStore.snapshot?.releaseId || releaseId || '—' }}</p>
        <h2>{{ liveStore.snapshot?.releaseTitle || '实时看板' }}</h2>
      </div>
      <div class="live-banner__meta">
        <span>上次同步</span>
        <strong>{{ liveStore.lastSyncedAt || '等待首轮同步' }}</strong>
      </div>
    </section>

    <p v-if="liveStore.error" role="alert" class="feedback feedback--error">
      {{ liveStore.error }}
    </p>

    <div v-if="!liveStore.snapshot" class="empty-state">
      正在拉取最新课堂进度…
    </div>

    <section v-else class="panel">
      <div class="panel__head">
        <div>
          <h2 class="panel__title">学生最新进度</h2>
          <p class="panel__meta">页面上展示学生最新进度、最新 AI 提示和更新时间。</p>
        </div>
        <StatusBadge tone="info">{{ liveStore.studentCount }} 名学生</StatusBadge>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>学生</th>
              <th>最新进度</th>
              <th>最新 AI 提示</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in liveStore.snapshot.students" :key="student.id">
              <td>{{ student.name }}</td>
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
