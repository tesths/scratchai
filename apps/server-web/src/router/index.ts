import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import type { Pinia } from 'pinia'
import { useSessionStore } from '@/stores/session'
import DashboardView from '@/views/DashboardView.vue'
import LiveReleaseView from '@/views/LiveReleaseView.vue'
import LoginView from '@/views/LoginView.vue'
import ReleasesView from '@/views/ReleasesView.vue'
import StudentsView from '@/views/StudentsView.vue'

export function createTeacherRouter(pinia: Pinia) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        redirect: '/dashboard',
      },
      {
        path: '/login',
        name: 'login',
        component: LoginView,
        meta: {
          publicRoute: true,
        },
      },
      {
        path: '/dashboard',
        name: 'dashboard',
        component: DashboardView,
      },
      {
        path: '/students',
        name: 'students',
        component: StudentsView,
      },
      {
        path: '/releases',
        name: 'releases',
        component: ReleasesView,
      },
      {
        path: '/releases/:id/live',
        name: 'release-live',
        component: LiveReleaseView,
        props: true,
      },
      {
        path: '/:pathMatch(.*)*',
        redirect: '/dashboard',
      },
    ],
  })

  router.beforeEach((to: RouteLocationNormalized) => {
    const sessionStore = useSessionStore(pinia)

    if (to.meta.publicRoute) {
      if (sessionStore.isAuthenticated) {
        return '/dashboard'
      }
      return true
    }

    if (!sessionStore.isAuthenticated) {
      return {
        path: '/login',
        query: {
          redirect: to.fullPath,
        },
      }
    }

    return true
  })

  return router
}
