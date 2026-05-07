import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import LoginView from './LoginView.vue'
import { teacherApiKey } from '@/services/teacherApi'

function createRouterForTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/dashboard', component: { template: '<div>dashboard</div>' } },
    ],
  })
}

describe('LoginView', () => {
  it('shows error feedback when login fails', async () => {
    const api = {
      login: vi.fn().mockRejectedValue(new Error('用户名或密码错误')),
    }
    const router = createRouterForTest()
    router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [teacherApiKey as symbol]: api,
        },
      },
    })

    await wrapper.get('input[name="username"]').setValue('wrong-user')
    await wrapper.get('input[name="password"]').setValue('wrong-pass')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('用户名或密码错误')
    expect(router.currentRoute.value.fullPath).toBe('/login')
  })

  it('shows success feedback and navigates after login succeeds', async () => {
    const api = {
      login: vi.fn().mockResolvedValue({
        token: 'token-1',
        teacherName: '王老师',
      }),
    }
    const router = createRouterForTest()
    router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [teacherApiKey as symbol]: api,
        },
      },
    })

    await wrapper.get('input[name="username"]').setValue('teacher')
    await wrapper.get('input[name="password"]').setValue('teach123')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toContain('登录成功')
    expect(router.currentRoute.value.fullPath).toBe('/dashboard')
  })
})
