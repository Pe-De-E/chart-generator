import { FastifyRequest, FastifyReply } from 'fastify'
import { ZodSchema, ZodError } from 'zod'

/**
 * Validation middleware factory
 * Creates a middleware that validates request body against a Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body)
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }))

        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            statusCode: 400,
            details: errors,
          },
        })
      }

      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          statusCode: 400,
        },
      })
    }
  }
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query)
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }))

        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            statusCode: 400,
            details: errors,
          },
        })
      }

      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          statusCode: 400,
        },
      })
    }
  }
}

/**
 * Validate route parameters
 */
export function validateParams(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params)
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }))

        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid route parameters',
            statusCode: 400,
            details: errors,
          },
        })
      }

      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid route parameters',
          statusCode: 400,
        },
      })
    }
  }
}
