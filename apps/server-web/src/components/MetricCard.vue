<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  note?: string
}>()
</script>

<template>
  <article class="metric-card">
    <p class="metric-card__label">{{ label }}</p>
    <strong class="metric-card__value">{{ value }}</strong>
    <p v-if="note" class="metric-card__note">{{ note }}</p>
  </article>
</template>
