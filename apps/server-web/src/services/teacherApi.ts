import { inject, type InjectionKey } from 'vue'
import { buildApiUrl, requestJson, type FetchLike } from './http'

export interface TeacherLoginInput {
  username: string
  password: string
}

export interface TeacherSession {
  token: string
  teacherName: string
}

export interface TeacherStudent {
  id: string
  name: string
  className: string
  progress: number
  latestAiHint: string
  updatedAt: string
}

export type TeacherReleaseStatus = 'draft' | 'published' | 'archived'

export interface TeacherRelease {
  id: string
  title: string
  className: string
  status: TeacherReleaseStatus
  studentCount: number
  updatedAt: string
}

export interface LiveStudentSnapshot {
  id: string
  name: string
  progress: number
  latestAiHint: string
  updatedAt: string
}

export interface LiveDashboardSnapshot {
  releaseId: string
  releaseTitle: string
  updatedAt: string
  students: LiveStudentSnapshot[]
}

export interface TeacherApiClient {
  login(input: TeacherLoginInput): Promise<TeacherSession>
  listStudents(): Promise<TeacherStudent[]>
  listReleases(): Promise<TeacherRelease[]>
  getLiveDashboard(releaseId: string): Promise<LiveDashboardSnapshot>
}

export const teacherApiKey: InjectionKey<TeacherApiClient> = Symbol(
  'teacher-api-client',
)

export class TeacherApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'TeacherApiError'
    this.status = status
  }
}

export function useTeacherApiClient(): TeacherApiClient {
  const client = inject(teacherApiKey)

  if (!client) {
    throw new Error('Teacher API client is not provided.')
  }

  return client
}

export function createFetchTeacherApiClient(options: {
  baseUrl?: string
  fetchImpl?: FetchLike
} = {}): TeacherApiClient {
  const fetchImpl = options.fetchImpl ?? fetch
  const baseUrl = options.baseUrl

  return {
    async login(input) {
      return requestJson<TeacherSession>(
        fetchImpl,
        buildApiUrl(baseUrl, '/api/teacher/login'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        },
      )
    },
    async listStudents() {
      const payload = await requestJson<unknown>(
        fetchImpl,
        buildApiUrl(baseUrl, '/api/students'),
        {
          method: 'GET',
        },
      )
      return normalizeCollection<TeacherStudent>(payload)
    },
    async listReleases() {
      const payload = await requestJson<unknown>(
        fetchImpl,
        buildApiUrl(baseUrl, '/api/releases'),
        {
          method: 'GET',
        },
      )
      return normalizeCollection<TeacherRelease>(payload)
    },
    async getLiveDashboard(releaseId) {
      return requestJson<LiveDashboardSnapshot>(
        fetchImpl,
        buildApiUrl(baseUrl, `/api/dashboard/releases/${releaseId}/live`),
        {
          method: 'GET',
        },
      )
    },
  }
}

function normalizeCollection<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if (Array.isArray(record.items)) {
      return record.items as T[]
    }
  }

  return []
}
