import { User, RefreshToken } from '@prisma/client'
import { prisma } from '../config/database.js'
import { PasswordService } from './password.service.js'
import { JwtService } from './jwt.service.js'
import type { SignupRequest, LoginRequest } from '@chart-generator/shared'

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>
  accessToken: string
  refreshToken: string
}

export class AuthService {
  /**
   * Register a new user
   */
  static async signup(data: SignupRequest): Promise<AuthResponse> {
    // Validate password
    const passwordValidation = PasswordService.validate(data.password)
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '))
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Hash password
    const passwordHash = await PasswordService.hash(data.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    })

    // Generate tokens
    const { accessToken, refreshToken } = JwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
    })

    // Store refresh token
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    })

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    }
  }

  /**
   * Login a user
   */
  static async login(data: LoginRequest): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    })

    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Verify password
    const isPasswordValid = await PasswordService.verify(data.password, user.passwordHash)

    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate tokens
    const { accessToken, refreshToken } = JwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
    })

    // Store refresh token
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    })

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    }
  }

  /**
   * Logout a user (invalidate refresh token)
   */
  static async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    })
  }

  /**
   * Refresh access token using refresh token
   */
  static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token
    const payload = JwtService.verifyRefreshToken(refreshToken)

    // Find refresh token in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!storedToken) {
      throw new Error('Invalid refresh token')
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      })
      throw new Error('Refresh token expired')
    }

    // Generate new tokens (token rotation)
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = JwtService.generateTokenPair({
      userId: payload.userId,
      email: payload.email,
    })

    // Delete old refresh token and create new one
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    await prisma.$transaction([
      prisma.refreshToken.delete({
        where: { id: storedToken.id },
      }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: storedToken.userId,
          expiresAt,
        },
      }),
    ])

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  }

  /**
   * Clean up expired refresh tokens
   */
  static async cleanupExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  }

  /**
   * Clear all refresh tokens (useful for development/testing)
   */
  static async clearAllRefreshTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({})
  }
}
