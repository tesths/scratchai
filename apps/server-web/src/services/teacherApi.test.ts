import { describe, expect, it, vi } from 'vitest'
import { createFetchTeacherApiClient } from './teacherApi'

function createFetchResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  }
}

describe('createFetchTeacherApiClient', () => {
  it('posts teacher login to /api/teacher/login', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createFetchResponse({
        token: 'token-1',
        teacherName: '王老师',
      }),
    )
    const api = createFetchTeacherApiClient({
      baseUrl: 'https://teacher.example',
      fetchImpl,
    })

    const session = await api.login({
      username: 'teacher',
      password: 'teach123',
    })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://teacher.example/api/teacher/login',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'teacher',
          password: 'teach123',
        }),
      }),
    )
    expect(session).toEqual({
      token: 'token-1',
      teacherName: '王老师',
    })
  })

  it('reads students, releases and live dashboard from the expected paths', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createFetchResponse({
          items: [
            {
              id: 'stu-1',
              name: 'Ada',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createFetchResponse({
          items: [
            {
              id: 'rel-1',
              title: '第一期发布单',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createFetchResponse({
          releaseId: 'rel-1',
          releaseTitle: '第一期发布单',
          students: [],
        }),
      )
    const api = createFetchTeacherApiClient({
      baseUrl: 'https://teacher.example',
      fetchImpl,
    })

    await api.listStudents()
    await api.listReleases()
    await api.getLiveDashboard('rel-1')

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'https://teacher.example/api/students',
      expect.objectContaining({
        method: 'GET',
      }),
    )
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'https://teacher.example/api/releases',
      expect.objectContaining({
        method: 'GET',
      }),
    )
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      'https://teacher.example/api/dashboard/releases/rel-1/live',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })
})
