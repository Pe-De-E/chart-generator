import { describe, it, expect, vi } from 'vitest'

vi.mock('../config/env.js', () => ({
  env: {
    ACCESS_TOKEN_SECRET: 'test-access-secret-with-at-least-32-characters-x',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret-with-at-least-32-characters-x',
    ACCESS_TOKEN_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
  },
}))

import { JwtService } from './jwt.service.js'

describe('JwtService', () => {
  const payload = { userId: 'user-123', email: 'test@example.com' }

  describe('generateTokenPair()', () => {
    it('returns a non-empty access token and refresh token', () => {
      const { accessToken, refreshToken } = JwtService.generateTokenPair(payload)
      expect(accessToken).toBeTruthy()
      expect(refreshToken).toBeTruthy()
    })

    it('access token and refresh token are distinct', () => {
      const { accessToken, refreshToken } = JwtService.generateTokenPair(payload)
      expect(accessToken).not.toBe(refreshToken)
    })
  })

  describe('verifyAccessToken()', () => {
    it('returns the correct payload for a valid token', () => {
      const token = JwtService.generateAccessToken(payload)
      const decoded = JwtService.verifyAccessToken(token)
      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.email).toBe(payload.email)
    })

    it('throws for a tampered token', () => {
      const token = JwtService.generateAccessToken(payload)
      expect(() => JwtService.verifyAccessToken(token + 'tampered')).toThrow(
        'Invalid or expired access token'
      )
    })

    it('throws when a refresh token is used as an access token', () => {
      // Refresh tokens are signed with a different secret
      const refreshToken = JwtService.generateRefreshToken(payload)
      expect(() => JwtService.verifyAccessToken(refreshToken)).toThrow(
        'Invalid or expired access token'
      )
    })

    it('throws for a completely invalid string', () => {
      expect(() => JwtService.verifyAccessToken('not-a-jwt')).toThrow(
        'Invalid or expired access token'
      )
    })
  })

  describe('verifyRefreshToken()', () => {
    it('returns the correct payload for a valid token', () => {
      const token = JwtService.generateRefreshToken(payload)
      const decoded = JwtService.verifyRefreshToken(token)
      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.email).toBe(payload.email)
    })

    it('throws for a tampered token', () => {
      const token = JwtService.generateRefreshToken(payload)
      expect(() => JwtService.verifyRefreshToken(token + 'tampered')).toThrow(
        'Invalid or expired refresh token'
      )
    })

    it('throws when an access token is used as a refresh token', () => {
      const accessToken = JwtService.generateAccessToken(payload)
      expect(() => JwtService.verifyRefreshToken(accessToken)).toThrow(
        'Invalid or expired refresh token'
      )
    })
  })

  describe('decode()', () => {
    it('decodes a valid token without verifying the signature', () => {
      const token = JwtService.generateAccessToken(payload)
      const decoded = JwtService.decode(token)
      expect(decoded?.userId).toBe(payload.userId)
      expect(decoded?.email).toBe(payload.email)
    })

    it('returns null for a completely invalid token string', () => {
      const decoded = JwtService.decode('not.a.token')
      expect(decoded).toBeNull()
    })
  })
})
