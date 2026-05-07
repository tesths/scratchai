import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LiveReleaseView from './LiveReleaseView.vue'
import { teacherApiKey } from '@/services/teacherApi'

function createRouterForTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/releases/:id/live', component: LiveReleaseView }],
  })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('LiveReleaseView', () => {
  it('polls live dashboard updates and refreshes the latest progress', async () => {
    vi.useFakeTimers()
    const api = {
      getLiveDashboard: vi
        .fn()
        .mockResolvedValueOnce({
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
          ],
        })
        .mockResolvedValueOnce({
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
          ],
        }),
      listStudents: vi.fn(),
      listReleases: vi.fn(),
      login: vi.fn(),
    }
    const router = createRouterForTest()
    router.push('/releases/rel-1/live')
    await router.isReady()

    const wrapper = mount(LiveReleaseView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [teacherApiKey as symbol]: api,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Ada')
    expect(wrapper.text()).toContain('42')
    expect(wrapper.text()).toContain('先把绿旗事件连起来')
    expect(wrapper.text()).toContain('2026-05-07 09:40')

    await vi.advanceTimersByTimeAsync(4000)
    await flushPromises()

    expect(wrapper.text()).toContain('68')
    expect(wrapper.text()).toContain('现在补上角色切换逻辑')
    expect(wrapper.text()).toContain('2026-05-07 09:44')
  })
})
