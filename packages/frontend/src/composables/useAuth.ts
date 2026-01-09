import { ref, computed, type Ref } from 'vue'
import { authService } from '../services/auth.service'
import { userService } from '../services/user.service'
import type { User, LoginRequest, SignupRequest } from '@chart-generator/shared'

// Global state (shared across all instances of the composable)
const currentUser: Ref<User | null> = ref(null)
const isLoading = ref(false)
const error: Ref<string | null> = ref(null)
const isInitialized = ref(false)

export function useAuth() {
  const isAuthenticated = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.isAdmin === true)

  /**
   * Initialize auth state by fetching current user if token exists
   */
  const init = async () => {
    if (isInitialized.value) return

    const token = sessionStorage.getItem('accessToken')
    if (!token) {
      isInitialized.value = true
      return
    }

    try {
      await fetchCurrentUser()
    } catch (err) {
      // Token is invalid, clear it
      sessionStorage.removeItem('accessToken')
      currentUser.value = null
    } finally {
      isInitialized.value = true
    }
  }

  /**
   * Signup a new user
   */
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

  /**
   * Login a user
   */
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

  /**
   * Logout the current user
   */
  const logout = async () => {
    isLoading.value = true
    error.value = null

    try {
      await authService.logout()
    } catch (err) {
      // Ignore logout errors, still clear local state
    } finally {
      currentUser.value = null
      sessionStorage.removeItem('accessToken')
      isLoading.value = false
    }
  }

  /**
   * Fetch the current user from the API
   */
  const fetchCurrentUser = async () => {
    try {
      const user = await userService.getCurrentUser()
      currentUser.value = user
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Failed to fetch user'
      throw err
    }
  }

  /**
   * Update user profile
   */
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
    // State
    currentUser: computed(() => currentUser.value),
    isAuthenticated,
    isAdmin,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    isInitialized: computed(() => isInitialized.value),

    // Methods
    init,
    signup,
    login,
    logout,
    fetchCurrentUser,
    updateProfile,
  }
}
