import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'
import { prisma } from '../config/database.js'

const EXCLUDED_PATHS = ['/health']

export function requestLogMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  request.startTime = Date.now()
  done()
}

export async function onResponseLog(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (EXCLUDED_PATHS.some(path => request.url.startsWith(path))) {
    return
  }

  const responseTime = Date.now() - (request.startTime || Date.now())
  const user = request.user

  try {
    await prisma.requestLog.create({
      data: {
        method: request.method,
        path: request.url.split('?')[0],
        statusCode: reply.statusCode,
        userId: user?.userId || null,
        userEmail: user?.email || null,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        responseTime,
      },
    })
  } catch (error) {
    request.log.error('Failed to log request:', error)
  }
}
