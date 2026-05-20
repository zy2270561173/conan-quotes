<template>
  <div class="redirect-container">
    <p>正在跳转到管理后台...</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  router.push('/dashboard')
})
</script>

<style scoped>
.redirect-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #0f1117;
  color: #e0e0e0;
  font-size: 1.2rem;
}
</style>
