import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import bcrypt from 'bcrypt'

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../config/database.js', () => ({ prisma: mockPrisma }))

vi.mock('../config/env.js', () => ({
  env: {
    BCRYPT_ROUNDS: 4, // Fast rounds for tests
    ACCESS_TOKEN_SECRET: 'test-access-secret-with-at-least-32-characters-x',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret-with-at-least-32-characters-x',
    ACCESS_TOKEN_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
  },
}))

import { AuthService } from './auth.service.js'
import { JwtService } from './jwt.service.js'

const baseUser = {
  id: 'user-123',
  email: 'test@example.com',
  passwordHash: 'placeholder',
  firstName: 'Test',
  lastName: 'User',
  emailVerified: false,
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries)
    )
  })

  describe('signup()', () => {
    it('throws for a password that fails validation', async () => {
      await expect(
        AuthService.signup({ email: 'a@b.com', password: 'weak', firstName: 'A', lastName: 'B' })
      ).rejects.toThrow()
    })

    it('throws if the email is already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser)

      await expect(
        AuthService.signup({
          email: 'test@example.com',
          password: 'SecurePass1',
          firstName: 'A',
          lastName: 'B',
        })
      ).rejects.toThrow('User with this email already exists')
    })

    it('creates a user and returns tokens for valid data', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)
      mockPrisma.user.create.mockResolvedValueOnce({ ...baseUser, email: 'new@example.com' })
      mockPrisma.refreshToken.create.mockResolvedValueOnce({})

      const result = await AuthService.signup({
        email: 'new@example.com',
        password: 'SecurePass1',
        firstName: 'New',
        lastName: 'User',
      })

      expect(result.user.email).toBe('new@example.com')
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      expect(result.user).not.toHaveProperty('passwordHash')
    })

    it('stores the email as lowercase', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)
      mockPrisma.user.create.mockResolvedValueOnce(baseUser)
      mockPrisma.refreshToken.create.mockResolvedValueOnce({})

      await AuthService.signup({
        email: 'TEST@EXAMPLE.COM',
        password: 'SecurePass1',
        firstName: 'A',
        lastName: 'B',
      })

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
    })
  })

  describe('login()', () => {
    let validPasswordHash: string

    beforeAll(async () => {
      validPasswordHash = await bcrypt.hash('CorrectPassword1', 4)
    })

    it('throws if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)

      await expect(
        AuthService.login({ email: 'nobody@example.com', password: 'Password1' })
      ).rejects.toThrow('Invalid email or password')
    })

    it('throws for the wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...baseUser,
        passwordHash: validPasswordHash,
      })

      await expect(
        AuthService.login({ email: 'test@example.com', password: 'WrongPassword1' })
      ).rejects.toThrow('Invalid email or password')
    })

    it('returns tokens for correct credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...baseUser,
        passwordHash: validPasswordHash,
      })
      mockPrisma.user.update.mockResolvedValueOnce({})
      mockPrisma.refreshToken.create.mockResolvedValueOnce({})

      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'CorrectPassword1',
      })

      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      expect(result.user).not.toHaveProperty('passwordHash')
    })
  })

  describe('logout()', () => {
    it('deletes the provided refresh token', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValueOnce({ count: 1 })

      await AuthService.logout('some-refresh-token')

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-refresh-token' },
      })
    })
  })

  describe('refresh()', () => {
    it('throws if the token is not found in the database', async () => {
      const token = JwtService.generateRefreshToken({ userId: 'user-123', email: 'test@example.com' })
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(null)

      await expect(AuthService.refresh(token)).rejects.toThrow('Invalid refresh token')
    })

    it('throws and cleans up if the token is expired', async () => {
      const token = JwtService.generateRefreshToken({ userId: 'user-123', email: 'test@example.com' })
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'token-id',
        token,
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000), // 1 second in the past
        user: baseUser,
      })
      mockPrisma.refreshToken.delete.mockResolvedValueOnce({})

      await expect(AuthService.refresh(token)).rejects.toThrow('Refresh token expired')
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalled()
    })

    it('returns new tokens and rotates the refresh token', async () => {
      const token = JwtService.generateRefreshToken({ userId: 'user-123', email: 'test@example.com' })
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'token-id',
        token,
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days ahead
        user: baseUser,
      })
      mockPrisma.refreshToken.delete.mockResolvedValueOnce({})
      mockPrisma.refreshToken.create.mockResolvedValueOnce({})

      const result = await AuthService.refresh(token)

      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      // Verify the old token was deleted and a new one stored (token rotation)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'token-id' } })
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled()
    })
  })

  describe('cleanupExpiredTokens()', () => {
    it('deletes tokens with a past expiry date', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValueOnce({ count: 3 })

      await AuthService.cleanupExpiredTokens()

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      })
    })
  })
})
