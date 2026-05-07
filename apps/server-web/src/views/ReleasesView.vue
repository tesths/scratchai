<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppShell from '@/components/AppShell.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useTeacherApiClient, type TeacherReleaseStatus } from '@/services/teacherApi'
import { useTeacherDirectoryStore } from '@/stores/teacherDirectory'

const apiClient = useTeacherApiClient()
const directoryStore = useTeacherDirectoryStore()

const releases = computed(() => directoryStore.releases)

function releaseTone(status: TeacherReleaseStatus) {
  if (status === 'published') {
    return 'success'
  }

  if (status === 'draft') {
    return 'warning'
  }

  return 'muted'
}

function releaseLabel(status: TeacherReleaseStatus) {
  if (status === 'published') {
    return '已发布'
  }

  if (status === 'draft') {
    return '草稿'
  }

  return '已归档'
}

async function reloadReleases() {
  await directoryStore.loadReleases(apiClient)
}

onMounted(() => {
  void reloadReleases()
})
</script>

<template>
  <AppShell
    title="发布单管理"
    description="先把发布单列表和实时看板入口收拢到一页，方便老师快速跳转。"
  >
    <template #actions>
      <StatusBadge :tone="directoryStore.releasesLoading ? 'warning' : 'success'">
        {{ directoryStore.releasesLoading ? '加载中' : `${directoryStore.releaseCount} 个发布单` }}
      </StatusBadge>
      <button class="button button--ghost" type="button" :disabled="directoryStore.releasesLoading" @click="reloadReleases">
        刷新发布单
      </button>
    </template>

    <section class="panel">
      <div class="panel__head">
        <div>
          <h2 class="panel__title">发布单列表</h2>
          <p class="panel__meta">每个发布单都可以直接跳到 `/releases/:id/live` 的实时看板。</p>
        </div>
      </div>

      <p v-if="directoryStore.releasesError" role="alert" class="feedback feedback--error">
        {{ directoryStore.releasesError }}
      </p>

      <div v-if="!directoryStore.releasesLoading && !releases.length" class="empty-state">
        暂无发布单数据
      </div>

      <div v-else class="card-grid">
        <article v-for="release in releases" :key="release.id" class="release-card">
          <div class="release-card__head">
            <div>
              <h2>{{ release.title }}</h2>
              <p>{{ release.className }}</p>
            </div>
            <StatusBadge :tone="releaseTone(release.status)">
              {{ releaseLabel(release.status) }}
            </StatusBadge>
          </div>

          <dl class="release-card__meta">
            <div>
              <dt>学生数</dt>
              <dd>{{ release.studentCount }}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{{ release.updatedAt }}</dd>
            </div>
          </dl>

          <RouterLink class="button button--primary" :to="`/releases/${release.id}/live`">
            查看实时看板
          </RouterLink>
        </article>
      </div>
    </section>
  </AppShell>
</template>
