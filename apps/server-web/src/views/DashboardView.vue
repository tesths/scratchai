<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppShell from '@/components/AppShell.vue'
import MetricCard from '@/components/MetricCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useTeacherApiClient } from '@/services/teacherApi'
import { useSessionStore } from '@/stores/session'
import { useTeacherDirectoryStore } from '@/stores/teacherDirectory'

const apiClient = useTeacherApiClient()
const sessionStore = useSessionStore()
const directoryStore = useTeacherDirectoryStore()

const averageProgress = computed(() => {
  if (!directoryStore.students.length) {
    return '0%'
  }

  const sum = directoryStore.students.reduce((total, student) => total + student.progress, 0)
  return `${Math.round(sum / directoryStore.students.length)}%`
})

const latestStudent = computed(() => directoryStore.students[0] ?? null)
const latestRelease = computed(() => directoryStore.releases[0] ?? null)

async function loadDashboard() {
  await Promise.all([
    directoryStore.loadStudents(apiClient),
    directoryStore.loadReleases(apiClient),
  ])
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <AppShell
    title="实时总览"
    description="先把当天课堂中最关键的状态放在一页里，方便老师快速判断要不要进入学生或发布单页。"
  >
    <template #actions>
      <StatusBadge tone="success">
        {{ sessionStore.teacherName ? `欢迎 ${sessionStore.teacherName}` : '已登录' }}
      </StatusBadge>
    </template>

    <section class="metric-grid">
      <MetricCard
        label="在册学生"
        :value="directoryStore.studentCount"
        note="来自 /api/students"
      />
      <MetricCard
        label="发布单"
        :value="`${directoryStore.publishedReleaseCount} / ${directoryStore.releaseCount}`"
        note="已发布 / 总发布单"
      />
      <MetricCard
        label="平均进度"
        :value="averageProgress"
        note="按当前学生进度计算"
      />
    </section>

    <section class="panel">
      <div class="panel__head">
        <div>
          <h2 class="panel__title">课堂最新状态</h2>
          <p class="panel__meta">优先看最后一条学生进度和最新发布单，作为进入详情页的入口。</p>
        </div>
      </div>

      <div class="card-grid">
        <article class="release-card">
          <div class="release-card__head">
            <div>
              <h2>最新学生进度</h2>
              <p>{{ latestStudent?.name || '暂无学生数据' }}</p>
            </div>
            <StatusBadge :tone="latestStudent ? 'info' : 'muted'">
              {{ latestStudent ? `${latestStudent.progress}%` : '空' }}
            </StatusBadge>
          </div>

          <dl class="release-card__meta">
            <div>
              <dt>最新 AI 提示</dt>
              <dd>{{ latestStudent?.latestAiHint || '等待接口返回' }}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{{ latestStudent?.updatedAt || '—' }}</dd>
            </div>
          </dl>
        </article>

        <article class="release-card">
          <div class="release-card__head">
            <div>
              <h2>最新发布单</h2>
              <p>{{ latestRelease?.title || '暂无发布单数据' }}</p>
            </div>
            <StatusBadge :tone="latestRelease?.status === 'published' ? 'success' : 'warning'">
              {{ latestRelease?.status === 'published' ? '已发布' : latestRelease?.status || '空' }}
            </StatusBadge>
          </div>

          <dl class="release-card__meta">
            <div>
              <dt>班级</dt>
              <dd>{{ latestRelease?.className || '—' }}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{{ latestRelease?.updatedAt || '—' }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  </AppShell>
</template>
