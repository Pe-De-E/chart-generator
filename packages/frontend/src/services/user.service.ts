import apiClient from './api'
import type { User, UpdateUserRequest, ChangePasswordRequest } from '@chart-generator/shared'

export const userService = {
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<{ user: User }>('/users/me')
    return response.data.user
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.patch<{ user: User }>('/users/me', data)
    return response.data.user
  },

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.patch('/users/me/password', data)
  },

  /**
   * Delete account
   */
  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me')
  },
}
