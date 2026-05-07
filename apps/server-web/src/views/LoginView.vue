<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/stores/storeUtils'
import { useTeacherApiClient } from '@/services/teacherApi'

const router = useRouter()
const route = useRoute()
const sessionStore = useSessionStore()
const apiClient = useTeacherApiClient()

const form = reactive({
  username: '',
  password: '',
})

const submitting = ref(false)
const feedback = ref('')
const feedbackTone = ref<'error' | 'success' | ''>('')

const redirectTarget = computed(() => {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect
  }

  return '/dashboard'
})

async function handleSubmit() {
  if (!form.username.trim() || !form.password.trim()) {
    feedback.value = '请输入账号和密码。'
    feedbackTone.value = 'error'
    return
  }

  submitting.value = true
  feedback.value = ''
  feedbackTone.value = ''

  try {
    await sessionStore.login(apiClient, {
      username: form.username.trim(),
      password: form.password,
    })

    feedback.value = '登录成功，正在进入看板。'
    feedbackTone.value = 'success'
    await router.push(redirectTarget.value)
  } catch (error) {
    feedback.value = toErrorMessage(error, '登录失败，请检查账号或密码。')
    feedbackTone.value = 'error'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-layout">
    <section class="auth-hero">
      <div class="stack">
        <p class="auth-hero__eyebrow">Scratch Teacher Backend</p>
        <h1>教师后台基础页</h1>
        <p>
          用于查看学生最新进度、整理发布单，并在实时看板里跟进 AI 提示更新。
        </p>
      </div>

      <ul class="auth-hero__points">
        <li>登录后进入总览、学生和发布单页面。</li>
        <li>实时看板当前采用轮询模型，便于后端替换。</li>
        <li>默认可直接使用 mock client 开发与联调。</li>
      </ul>
    </section>

    <section class="auth-card">
      <div class="stack">
        <h2>登录教师后台</h2>
        <p class="auth-card__description">
          这里先接 mock client，等后端就绪后再切到真实 `/api/teacher/login`。
        </p>
      </div>

      <form class="form-grid" @submit.prevent="handleSubmit">
        <label class="field">
          <span>账号</span>
          <input
            v-model="form.username"
            class="input"
            name="username"
            autocomplete="username"
            placeholder="teacher"
          />
        </label>

        <label class="field">
          <span>密码</span>
          <input
            v-model="form.password"
            class="input"
            name="password"
            type="password"
            autocomplete="current-password"
            placeholder="teach123"
          />
        </label>

        <button class="button button--primary" type="submit" :disabled="submitting">
          {{ submitting ? '登录中…' : '登录' }}
        </button>
      </form>

      <p class="helper-text">
        Mock 登录：
        <code>teacher</code> / <code>teach123</code>
      </p>

      <p v-if="feedback" :role="feedbackTone === 'error' ? 'alert' : 'status'" class="feedback" :class="`feedback--${feedbackTone}`">
        {{ feedback }}
      </p>
    </section>
  </div>
</template>
