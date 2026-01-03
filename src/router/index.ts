import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/views/LandingPage.vue'
import CallPage from '@/views/CallPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'LandingPage',
      component: LandingPage,
    },
    {
      path: '/room/:roomName',
      name: 'CallPage',
      component: CallPage,
      props: true,
    },
  ],
})

export default router
