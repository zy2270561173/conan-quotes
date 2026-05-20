<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <el-icon class="login-icon"><UserFilled /></el-icon>
        <h2>名侦探柯南</h2>
        <p>名言管理系统</p>
      </div>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            <el-icon v-if="!loading"><Top /></el-icon>
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-footer">柯南名言系统 v1.0</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, UserFilled, Top, SwitchButton } from '@element-plus/icons-vue'
import { login } from '../api'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true
    await login(form)
    localStorage.setItem('isLoggedIn', 'true')
    router.push('/dashboard')
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '登录失败，请检查网络')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f1117 0%, #1a1f28 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #181b23;
  border-radius: 16px;
  border: 1px solid #252a35;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
}

.login-header {
  background: linear-gradient(135deg, #e99312 0%, #c77a0a 100%);
  padding: 36px 30px 28px;
  text-align: center;
}

.login-icon {
  font-size: 3rem;
  color: #fff;
  margin-bottom: 12px;
}

.login-header h2 {
  color: #fff;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: 1px;
}

.login-header p {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.85rem;
  margin-top: 6px;
}

.login-form {
  padding: 32px 30px 20px;
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 1rem;
  background: linear-gradient(135deg, #e99312 0%, #c77a0a 100%) !important;
  border: none !important;
}

.login-btn:hover {
  opacity: 0.9;
}

.login-footer {
  text-align: center;
  padding: 16px;
  font-size: 0.75rem;
  color: #8892a0;
  border-top: 1px solid #252a35;
}
</style>
