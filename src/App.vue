<script setup lang="ts">
import AppToaster from '@/components/AppToaster.vue'
</script>

<template>
  <AppToaster />
  <router-view></router-view>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

input {
  padding: 0.5rem 1rem;
  font-family: Arial, Helvetica, sans-serif;
}
</style>
