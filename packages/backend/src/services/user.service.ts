import { User } from '@prisma/client'
import { prisma } from '../config/database.js'
import { PasswordService } from './password.service.js'
import type { UpdateUserRequest, ChangePasswordRequest } from '@chart-generator/shared'

export class UserService {
  /**
   * Get user by ID
   */
  static async getById(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return null
    }

    const { passwordHash: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  /**
   * Get user by email
   */
  static async getByEmail(email: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return null
    }

    const { passwordHash: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    data: UpdateUserRequest
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
      },
    })

    const { passwordHash: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    data: ChangePasswordRequest
  ): Promise<void> {
    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Verify current password
    const isPasswordValid = await PasswordService.verify(
      data.currentPassword,
      user.passwordHash
    )

    if (!isPasswordValid) {
      throw new Error('Current password is incorrect')
    }

    // Validate new password
    const passwordValidation = PasswordService.validate(data.newPassword)
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '))
    }

    // Hash new password
    const newPasswordHash = await PasswordService.hash(data.newPassword)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    })
  }

  /**
   * Delete user account
   */
  static async deleteAccount(userId: string): Promise<void> {
    await prisma.user.delete({
      where: { id: userId },
    })
  }

  /**
   * Get user statistics
   */
  static async getStatistics(userId: string) {
    const [chartCount, latestChart] = await Promise.all([
      prisma.chart.count({
        where: { userId },
      }),
      prisma.chart.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return {
      chartCount,
      latestChart,
    }
  }
}
