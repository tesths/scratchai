import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  LiveDashboardSnapshot,
  TeacherApiClient,
} from '@/services/teacherApi'
import { toErrorMessage } from './storeUtils'

export const useLiveDashboardStore = defineStore('liveDashboard', () => {
  const releaseId = ref('')
  const snapshot = ref<LiveDashboardSnapshot | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastSyncedAt = ref<string | null>(null)

  let pollingApi: TeacherApiClient | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let pollingIntervalMs = 4000

  const studentCount = computed(() => snapshot.value?.students.length ?? 0)

  async function refresh() {
    if (!pollingApi || !releaseId.value) {
      return null
    }

    loading.value = true
    error.value = null

    try {
      const nextSnapshot = await pollingApi.getLiveDashboard(releaseId.value)
      snapshot.value = nextSnapshot
      lastSyncedAt.value = nextSnapshot.updatedAt
      return nextSnapshot
    } catch (err) {
      error.value = toErrorMessage(err, '实时看板刷新失败')
      return null
    } finally {
      loading.value = false
    }
  }

  async function startPolling(
    api: TeacherApiClient,
    nextReleaseId: string,
    intervalMs = 4000,
  ) {
    stopPolling()

    pollingApi = api
    releaseId.value = nextReleaseId
    pollingIntervalMs = intervalMs
    snapshot.value = null
    error.value = null
    lastSyncedAt.value = null

    await refresh()
    timer = setInterval(() => {
      void refresh()
    }, pollingIntervalMs)
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }

    pollingApi = null
    releaseId.value = ''
  }

  return {
    releaseId,
    snapshot,
    loading,
    error,
    lastSyncedAt,
    studentCount,
    refresh,
    startPolling,
    stopPolling,
  }
})
