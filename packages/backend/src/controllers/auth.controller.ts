import { FastifyRequest, FastifyReply } from 'fastify'
import { AuthService } from '../services/auth.service.js'
import type { SignupRequest, LoginRequest } from '@chart-generator/shared'

export class AuthController {
  /**
   * POST /api/v1/auth/signup
   */
  static async signup(
    request: FastifyRequest<{ Body: SignupRequest }>,
    reply: FastifyReply
  ) {
    try {
      const result = await AuthService.signup(request.body)

      // Set refresh token as httpOnly cookie
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        path: '/',
      })

      return reply.status(201).send({
        user: result.user,
        accessToken: result.accessToken,
      })
    } catch (error: any) {
      return reply.status(400).send({
        error: {
          code: 'SIGNUP_FAILED',
          message: error.message || 'Signup failed',
          statusCode: 400,
        },
      })
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  static async login(
    request: FastifyRequest<{ Body: LoginRequest }>,
    reply: FastifyReply
  ) {
    try {
      const result = await AuthService.login(request.body)

      // Set refresh token as httpOnly cookie
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      })

      return reply.status(200).send({
        user: result.user,
        accessToken: result.accessToken,
      })
    } catch (error: any) {
      return reply.status(401).send({
        error: {
          code: 'LOGIN_FAILED',
          message: error.message || 'Login failed',
          statusCode: 401,
        },
      })
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  static async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const refreshToken = request.cookies.refreshToken

      if (refreshToken) {
        await AuthService.logout(refreshToken)
      }

      // Clear refresh token cookie
      reply.clearCookie('refreshToken', {
        path: '/',
      })

      return reply.status(200).send({
        message: 'Logged out successfully',
      })
    } catch (error: any) {
      return reply.status(500).send({
        error: {
          code: 'LOGOUT_FAILED',
          message: error.message || 'Logout failed',
          statusCode: 500,
        },
      })
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  static async refresh(request: FastifyRequest, reply: FastifyReply) {
    try {
      const refreshToken = request.cookies.refreshToken

      if (!refreshToken) {
        return reply.status(401).send({
          error: {
            code: 'NO_REFRESH_TOKEN',
            message: 'Deine Sitzung ist abgelaufen, daher wurdest du automatisch abgemeldet.',
            statusCode: 401,
          },
        })
      }

      const result = await AuthService.refresh(refreshToken)

      // Set new refresh token as httpOnly cookie
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      })

      return reply.status(200).send({
        accessToken: result.accessToken,
      })
    } catch (error: any) {
      return reply.status(401).send({
        error: {
          code: 'REFRESH_FAILED',
          message: 'Deine Sitzung ist abgelaufen, daher wurdest du automatisch abgemeldet.',
          statusCode: 401,
        },
      })
    }
  }
}
