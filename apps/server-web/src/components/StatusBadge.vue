<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'info' | 'success' | 'warning' | 'danger' | 'muted'
  }>(),
  {
    tone: 'info',
  },
)
</script>

<template>
  <span class="status-badge" :class="`status-badge--${tone}`">
    <slot />
  </span>
</template>
