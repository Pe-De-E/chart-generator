import apiClient from './api'
import type { User, LoginRequest, SignupRequest } from '@chart-generator/shared'

export interface AuthResponse {
  user: User
  accessToken: string
}

export const authService = {
  /**
   * Sign up a new user
   */
  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/signup', data)
    sessionStorage.setItem('accessToken', response.data.accessToken)
    return response.data
  },

  /**
   * Login a user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data)
    sessionStorage.setItem('accessToken', response.data.accessToken)
    return response.data
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
    sessionStorage.removeItem('accessToken')
  },

  /**
   * Refresh the access token
   */
  async refresh(): Promise<{ accessToken: string }> {
    const response = await apiClient.post<{ accessToken: string }>('/auth/refresh')
    sessionStorage.setItem('accessToken', response.data.accessToken)
    return response.data
  },
}
