import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../config/database.js'

/**
 * Global error handler
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log error
  request.log.error(error)

  // Determine status code
  const statusCode = error.statusCode || 500

  // Determine error code
  let errorCode = 'INTERNAL_SERVER_ERROR'
  if (statusCode === 400) errorCode = 'BAD_REQUEST'
  if (statusCode === 401) errorCode = 'UNAUTHORIZED'
  if (statusCode === 403) errorCode = 'FORBIDDEN'
  if (statusCode === 404) errorCode = 'NOT_FOUND'
  if (statusCode === 409) errorCode = 'CONFLICT'
  if (statusCode === 429) errorCode = 'RATE_LIMIT_EXCEEDED'

  // Log 5xx errors to database
  if (statusCode >= 500) {
    const user = request.user
    try {
      await prisma.errorLog.create({
        data: {
          errorCode,
          errorMessage: error.message || 'An unexpected error occurred',
          stackTrace: process.env.NODE_ENV === 'development' ? error.stack : null,
          userId: user?.userId || null,
          userEmail: user?.email || null,
          path: request.url,
          method: request.method,
          severity: 'error',
        },
      })
    } catch (logError) {
      request.log.error('Failed to log error to database:', logError)
    }
  }

  // Send error response
  reply.status(statusCode).send({
    error: {
      code: errorCode,
      message: error.message || 'An unexpected error occurred',
      statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    },
  })
}

/**
 * 404 Not Found handler
 */
export async function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(404).send({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
    },
  })
}
