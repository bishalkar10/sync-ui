<script setup lang="ts">
import VideoCard from './VideoCard.vue'
import type { ParticipantInfo } from '../composables/useVideoCall.ts'
import { computed, ref } from 'vue'

const props = defineProps<{
  participants: Map<string, ParticipantInfo>
}>()

const mainRef = ref<HTMLElement | null>(null)
defineExpose({ mainRef })

const participantList = computed(() => Array.from(props?.participants?.entries()))
</script>

<template>
  <main ref="mainRef">
    <VideoCard v-for="[sid, info] in participantList" :key="sid" :participant="info.participant" />
  </main>
</template>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

main {
  flex: 1;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(25rem, 1fr));
  background-color: #e8e8e8;
  overflow: hidden;
}
</style>
