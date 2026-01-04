export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface ApiError {
  code: string
  message: string
  statusCode: number
  details?: unknown
}

export interface AuthResponse {
  user: import('./user').User
  accessToken: string
  refreshToken?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
