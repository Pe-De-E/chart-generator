import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authService } from '../services/auth.service'
import { userService } from '../services/user.service'
import type { User, LoginRequest, SignupRequest } from '@chart-generator/shared'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)

  const isAuthenticated = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.isAdmin === true)

  const init = async () => {
    if (isInitialized.value) return

    const token = sessionStorage.getItem('accessToken')
    if (!token) {
      isInitialized.value = true
      return
    }

    try {
      await fetchCurrentUser()
    } catch {
      sessionStorage.removeItem('accessToken')
      currentUser.value = null
    } finally {
      isInitialized.value = true
    }
  }

  const signup = async (data: SignupRequest) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await authService.signup(data)
      currentUser.value = response.user
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Signup failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const login = async (data: LoginRequest) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await authService.login(data)
      currentUser.value = response.user
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoading.value = true
    error.value = null

    try {
      await authService.logout()
    } catch {
      // Ignore logout errors, still clear local state
    } finally {
      currentUser.value = null
      sessionStorage.removeItem('accessToken')
      isLoading.value = false
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const user = await userService.getCurrentUser()
      currentUser.value = user
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Failed to fetch user'
      throw err
    }
  }

  const updateProfile = async (data: { firstName?: string; lastName?: string }) => {
    isLoading.value = true
    error.value = null

    try {
      const user = await userService.updateProfile(data)
      currentUser.value = user
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Failed to update profile'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Listen for logout events (from API client when token refresh fails)
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:logout', () => {
      currentUser.value = null
      sessionStorage.removeItem('accessToken')
    })
  }

  return {
    currentUser,
    isAuthenticated,
    isAdmin,
    isLoading,
    error,
    isInitialized,
    init,
    signup,
    login,
    logout,
    fetchCurrentUser,
    updateProfile,
  }
})
