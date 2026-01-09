import apiClient from './api'

export const adminService = {
  async getDashboardOverview() {
    const response = await apiClient.get('/admin/dashboard')
    return response.data
  },

  async getUsers(params?: { page?: number; pageSize?: number; search?: string }) {
    const response = await apiClient.get('/admin/users', { params })
    return response.data
  },

  async getUserStats() {
    const response = await apiClient.get('/admin/users/stats')
    return response.data
  },

  async getPayments(params?: { page?: number; pageSize?: number; status?: string }) {
    const response = await apiClient.get('/admin/payments', { params })
    return response.data
  },

  async getPaymentStats() {
    const response = await apiClient.get('/admin/payments/stats')
    return response.data
  },

  async getRequestLogs(params?: { page?: number; pageSize?: number; statusCode?: number; method?: string }) {
    const response = await apiClient.get('/admin/requests', { params })
    return response.data
  },

  async getRequestStats() {
    const response = await apiClient.get('/admin/requests/stats')
    return response.data
  },

  async getErrorLogs(params?: { page?: number; pageSize?: number; resolved?: boolean; severity?: string }) {
    const response = await apiClient.get('/admin/errors', { params })
    return response.data
  },

  async resolveError(errorId: string) {
    const response = await apiClient.patch(`/admin/errors/${errorId}/resolve`)
    return response.data
  },

  async getErrorStats() {
    const response = await apiClient.get('/admin/errors/stats')
    return response.data
  },
}
