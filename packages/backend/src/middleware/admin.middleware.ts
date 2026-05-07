import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../config/database.js'

/**
 * Admin authorization middleware
 * Must be used AFTER authMiddleware
 * Checks if the authenticated user has isAdmin = true
 */
export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = request.user

    if (!user?.userId) {
      return reply.status(401).send({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentifizierung erforderlich',
          statusCode: 401,
        },
      })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { isAdmin: true },
    })

    if (!dbUser || !dbUser.isAdmin) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Admin-Berechtigung erforderlich',
          statusCode: 403,
        },
      })
    }
  } catch (error) {
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Fehler bei der Admin-Überprüfung',
        statusCode: 500,
      },
    })
  }
}
