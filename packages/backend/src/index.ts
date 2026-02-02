import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from './config/env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { registerRoutes } from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'
import { requestLogMiddleware, onResponseLog } from './middleware/requestLog.middleware.js'
import { AuthService } from './services/auth.service.js'

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    transport:
      env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
})

// Register plugins
await fastify.register(helmet, {
  contentSecurityPolicy: env.NODE_ENV === 'production',
})

await fastify.register(cors, {
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
})

await fastify.register(cookie, {
  secret: env.REFRESH_TOKEN_SECRET,
})

await fastify.register(rateLimit, {
  max: env.RATE_LIMIT_MAX,
  timeWindow: env.RATE_LIMIT_WINDOW,
})

// Multipart for file uploads
await fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
})

// Static file serving for uploaded images
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../uploads'),
  prefix: '/uploads/',
  decorateReply: false,
})

// Request logging hooks
fastify.addHook('onRequest', requestLogMiddleware)
fastify.addHook('onResponse', onResponseLog)

// Register routes
await registerRoutes(fastify)

// Error handlers
fastify.setErrorHandler(errorHandler)
fastify.setNotFoundHandler(notFoundHandler)

// Start server
const start = async () => {
  try {
    // In development, clear all refresh tokens on startup
    // This ensures users must re-login after backend restart
    if (env.NODE_ENV === 'development') {
      fastify.log.info('Development mode: Clearing all refresh tokens...')
      await AuthService.clearAllRefreshTokens()
      fastify.log.info('All refresh tokens cleared')
    }

    await fastify.listen({
      port: env.PORT,
      host: env.HOST,
    })

    fastify.log.info(`
┌─────────────────────────────────────────────┐
│                                             │
│   🚀 Chart Generator API Server Ready!     │
│                                             │
│   Environment: ${env.NODE_ENV.padEnd(28)} │
│   Port: ${env.PORT.toString().padEnd(35)} │
│   URL: http://${env.HOST}:${env.PORT}                │
│                                             │
└─────────────────────────────────────────────┘
    `)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

start()

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM']
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`)
    await fastify.close()
    process.exit(0)
  })
})
