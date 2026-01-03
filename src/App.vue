<script setup lang="ts">
import Toaster from '@/components/Toaster.vue'
</script>

<template>
  <Toaster />
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
