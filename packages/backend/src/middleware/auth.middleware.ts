import { FastifyRequest, FastifyReply } from 'fastify'
import { JwtService } from '../services/jwt.service.js'

/**
 * Authentication middleware
 * Verifies JWT access token and attaches user info to request
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          statusCode: 401,
        },
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify token
    const payload = JwtService.verifyAccessToken(token)

    // Attach user info to request
    ;(request as any).user = {
      userId: payload.userId,
      email: payload.email,
    }
  } catch (error) {
    return reply.status(401).send({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
        statusCode: 401,
      },
    })
  }
}
