import { FastifyRequest, FastifyReply } from 'fastify'
import { UserService } from '../services/user.service.js'
import type { AuthenticatedRequest } from '../types/fastify.js'
import type { UpdateUserRequest, ChangePasswordRequest } from '@chart-generator/shared'

export class UserController {
  /**
   * GET /api/v1/users/me
   */
  static async getCurrentUser(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const { userId } = (request as AuthenticatedRequest).user

      const user = await UserService.getById(userId)

      if (!user) {
        return reply.status(404).send({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            statusCode: 404,
          },
        })
      }

      return reply.status(200).send({ user })
    } catch (error: any) {
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to get user',
          statusCode: 500,
        },
      })
    }
  }

  /**
   * PATCH /api/v1/users/me
   */
  static async updateProfile(
    request: FastifyRequest<{ Body: UpdateUserRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { userId } = (request as AuthenticatedRequest).user

      const user = await UserService.updateProfile(userId, request.body)

      return reply.status(200).send({ user })
    } catch (error: any) {
      return reply.status(500).send({
        error: {
          code: 'UPDATE_FAILED',
          message: error.message || 'Failed to update profile',
          statusCode: 500,
        },
      })
    }
  }

  /**
   * PATCH /api/v1/users/me/password
   */
  static async changePassword(
    request: FastifyRequest<{ Body: ChangePasswordRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { userId } = (request as AuthenticatedRequest).user

      await UserService.changePassword(userId, request.body)

      return reply.status(200).send({
        message: 'Password changed successfully',
      })
    } catch (error: any) {
      return reply.status(400).send({
        error: {
          code: 'PASSWORD_CHANGE_FAILED',
          message: error.message || 'Failed to change password',
          statusCode: 400,
        },
      })
    }
  }

  /**
   * DELETE /api/v1/users/me
   */
  static async deleteAccount(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const { userId } = (request as AuthenticatedRequest).user

      await UserService.deleteAccount(userId)

      // Clear refresh token cookie
      reply.clearCookie('refreshToken', {
        path: '/',
      })

      return reply.status(200).send({
        message: 'Account deleted successfully',
      })
    } catch (error: any) {
      return reply.status(500).send({
        error: {
          code: 'DELETE_FAILED',
          message: error.message || 'Failed to delete account',
          statusCode: 500,
        },
      })
    }
  }
}
