import {
  TeacherApiError,
  type LiveDashboardSnapshot,
  type TeacherApiClient,
  type TeacherLoginInput,
  type TeacherRelease,
  type TeacherSession,
  type TeacherStudent,
} from './teacherApi'

const demoSession: TeacherSession = {
  token: 'mock-session-token',
  teacherName: '王老师',
}

const demoStudents: TeacherStudent[] = [
  {
    id: 'stu-1',
    name: 'Ada',
    className: '四年级一班',
    progress: 72,
    latestAiHint: '补上广播消息后再测试一次',
    updatedAt: '2026-05-07 09:20',
  },
  {
    id: 'stu-2',
    name: 'Alan',
    className: '四年级二班',
    progress: 38,
    latestAiHint: '先把重复积木整理成三个步骤',
    updatedAt: '2026-05-07 09:24',
  },
  {
    id: 'stu-3',
    name: 'Mia',
    className: '四年级一班',
    progress: 55,
    latestAiHint: '把下一步提示做成可复用流程',
    updatedAt: '2026-05-07 09:27',
  },
]

const demoReleases: TeacherRelease[] = [
  {
    id: 'rel-1',
    title: '第一期发布单',
    className: '四年级一班',
    status: 'published',
    studentCount: 24,
    updatedAt: '2026-05-07 09:10',
  },
  {
    id: 'rel-2',
    title: '第二期发布单',
    className: '四年级二班',
    status: 'draft',
    studentCount: 18,
    updatedAt: '2026-05-07 09:30',
  },
]

const demoSnapshots: Record<string, LiveDashboardSnapshot[]> = {
  'rel-1': [
    {
      releaseId: 'rel-1',
      releaseTitle: '第一期发布单',
      updatedAt: '2026-05-07 09:40',
      students: [
        {
          id: 'stu-1',
          name: 'Ada',
          progress: 42,
          latestAiHint: '先把绿旗事件连起来',
          updatedAt: '2026-05-07 09:40',
        },
        {
          id: 'stu-2',
          name: 'Alan',
          progress: 33,
          latestAiHint: '先整理重复执行的脚本块',
          updatedAt: '2026-05-07 09:40',
        },
      ],
    },
    {
      releaseId: 'rel-1',
      releaseTitle: '第一期发布单',
      updatedAt: '2026-05-07 09:44',
      students: [
        {
          id: 'stu-1',
          name: 'Ada',
          progress: 68,
          latestAiHint: '现在补上角色切换逻辑',
          updatedAt: '2026-05-07 09:44',
        },
        {
          id: 'stu-2',
          name: 'Alan',
          progress: 51,
          latestAiHint: '把等待和广播组合起来',
          updatedAt: '2026-05-07 09:44',
        },
      ],
    },
  ],
  'rel-2': [
    {
      releaseId: 'rel-2',
      releaseTitle: '第二期发布单',
      updatedAt: '2026-05-07 09:36',
      students: [
        {
          id: 'stu-3',
          name: 'Mia',
          progress: 24,
          latestAiHint: '先确认消息广播的接收端',
          updatedAt: '2026-05-07 09:36',
        },
      ],
    },
  ],
}

export function createMockTeacherApiClient(): TeacherApiClient {
  const cursorByRelease = new Map<string, number>()

  return {
    async login(input: TeacherLoginInput) {
      if (input.username === 'teacher' && input.password === 'teach123') {
        return clone(demoSession)
      }

      throw new TeacherApiError('用户名或密码错误', 401)
    },
    async listStudents() {
      return clone(demoStudents)
    },
    async listReleases() {
      return clone(demoReleases)
    },
    async getLiveDashboard(releaseId: string) {
      const fallbackSnapshots = demoSnapshots['rel-1']!
      const snapshots =
        demoSnapshots[releaseId] ?? fallbackSnapshots
      const cursor = cursorByRelease.get(releaseId) ?? 0
      const index = Math.min(cursor, snapshots.length - 1)
      cursorByRelease.set(releaseId, cursor + 1)
      return clone(snapshots[index] ?? snapshots[snapshots.length - 1]!)
    },
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}
