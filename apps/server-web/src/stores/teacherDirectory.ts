import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  TeacherApiClient,
  TeacherRelease,
  TeacherStudent,
} from '@/services/teacherApi'
import { toErrorMessage } from './storeUtils'

export const useTeacherDirectoryStore = defineStore('teacherDirectory', () => {
  const students = ref<TeacherStudent[]>([])
  const releases = ref<TeacherRelease[]>([])
  const studentsLoading = ref(false)
  const releasesLoading = ref(false)
  const studentsError = ref<string | null>(null)
  const releasesError = ref<string | null>(null)

  const studentCount = computed(() => students.value.length)
  const releaseCount = computed(() => releases.value.length)
  const publishedReleaseCount = computed(
    () => releases.value.filter((release) => release.status === 'published').length,
  )

  async function loadStudents(api: TeacherApiClient) {
    studentsLoading.value = true
    studentsError.value = null

    try {
      students.value = await api.listStudents()
    } catch (error) {
      studentsError.value = toErrorMessage(error, '学生列表加载失败')
    } finally {
      studentsLoading.value = false
    }
  }

  async function loadReleases(api: TeacherApiClient) {
    releasesLoading.value = true
    releasesError.value = null

    try {
      releases.value = await api.listReleases()
    } catch (error) {
      releasesError.value = toErrorMessage(error, '发布单列表加载失败')
    } finally {
      releasesLoading.value = false
    }
  }

  return {
    students,
    releases,
    studentsLoading,
    releasesLoading,
    studentsError,
    releasesError,
    studentCount,
    releaseCount,
    publishedReleaseCount,
    loadStudents,
    loadReleases,
  }
})
