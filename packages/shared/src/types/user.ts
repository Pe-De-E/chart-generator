export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  emailVerified: boolean
  isAdmin: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface UpdateUserRequest {
  firstName?: string
  lastName?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
