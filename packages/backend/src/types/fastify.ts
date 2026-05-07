import type { FastifyRequest } from 'fastify'

// Augment FastifyRequest so middleware can attach these properties
// without requiring (request as any) casts throughout the codebase.
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string
      email: string
    }
    startTime?: number
  }
}

// Use this type in handlers that are guaranteed to run after authMiddleware.
export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string
    email: string
  }
}
