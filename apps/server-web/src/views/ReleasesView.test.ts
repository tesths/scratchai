import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ReleasesView from './ReleasesView.vue'
import { teacherApiKey } from '@/services/teacherApi'

function createRouterForTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/releases', component: ReleasesView }],
  })
}

describe('ReleasesView', () => {
  it('renders the release list', async () => {
    const api = {
      listReleases: vi.fn().mockResolvedValue([
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
      ]),
      listStudents: vi.fn(),
      getLiveDashboard: vi.fn(),
      login: vi.fn(),
    }
    const router = createRouterForTest()
    router.push('/releases')
    await router.isReady()

    const wrapper = mount(ReleasesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [teacherApiKey as symbol]: api,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('第一期发布单')
    expect(wrapper.text()).toContain('第二期发布单')
    expect(wrapper.text()).toContain('24')
    expect(wrapper.text()).toContain('18')
  })
})
