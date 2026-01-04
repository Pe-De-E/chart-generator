import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export interface JwtPayload {
  userId: string
  email: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export class JwtService {
  /**
   * Generate an access token
   */
  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
    })
  }

  /**
   * Generate a refresh token
   */
  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
    })
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(payload: JwtPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    }
  }

  /**
   * Verify an access token
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as JwtPayload
    } catch (error) {
      throw new Error('Invalid or expired access token')
    }
  }

  /**
   * Verify a refresh token
   */
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as JwtPayload
    } catch (error) {
      throw new Error('Invalid or expired refresh token')
    }
  }

  /**
   * Decode a token without verifying (for debugging)
   */
  static decode(token: string): JwtPayload | null {
    const decoded = jwt.decode(token)
    return decoded as JwtPayload | null
  }
}
