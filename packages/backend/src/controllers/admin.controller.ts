import { FastifyRequest, FastifyReply } from 'fastify'
import { AdminService } from '../services/admin.service.js'

export class AdminController {
  static async getDashboardOverview(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const overview = await AdminService.getDashboardOverview()
      return reply.status(200).send(overview)
    } catch (error: any) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 } })
    }
  }

  static async getUsers(
    request: FastifyRequest<{ Querystring: { page?: string; pageSize?: string; search?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { page = '1', pageSize = '20', search } = request.query
      const result = await AdminService.getUsers({ page: parseInt(page), pageSize: parseInt(pageSize), search })
      return reply.status(200).send(result)
    } catch (error: any) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 } })
    }
  }

  static async getUserStats(_request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.status(200).send(await AdminService.getUserStats())
    } catch (error: any) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 } })
    }
  }

  static async getPayments(
    request: FastifyRequest<{ Querystring: { page?: string; pageSize?: string; status?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { page = '1', pageSize = '20', status } = request.query
      const result = await AdminService.getPayments({ page: parseInt(page), pageSize: parseInt(pageSize), status })
      return reply.status(200).send(result)
    } catch (error: any) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 } })
    }
  }

  static async getPaymentStats(_request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.status(200).send(await AdminService.getPaymentStats())
    } catch (error: any) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 } })
    }
  }

  static async getRequestLogs(
    request: FastifyRequest<{ Querystring: { page?: string; pageSize?: string; statusCode?: string; method?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { page = '1', pageSize = '50', statusCode, method } = request.query
      const result = await AdminService.getRequestLogs({
        page: parseInt(page), pageSize: parseInt(pageSize),
        statusCode: statusCode ? parseInt(statusCode) : undefined, method,
      })
      return reply.status(200).send(result)
    } catch (error: any) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 } })
    }
  }

  static async getRequestStats(_request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.status(200).send(await AdminService.getRequestStats())
    } catch (error: any) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 } })
    }
  }

  static async getErrorLogs(
    request: FastifyRequest<{ Querystring: { page?: string; pageSize?: string; resolved?: string; severity?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { page = '1', pageSize = '50', resolved, severity } = request.query
      const result = await AdminService.getErrorLogs({
        page: parseInt(page), pageSize: parseInt(pageSize),
        resolved: resolved !== undefined ? resolved === 'true' : undefined, severity,
      })
      return reply.status(200).send(result)
    } catch (error: any) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 } })
    }
  }

  static async resolveError(request: FastifyRequest<{ Params: { errorId: string } }>, reply: FastifyReply) {
    try {
      const { errorId } = request.params
      const { userId } = (request as any).user
      const result = await AdminService.resolveError(errorId, userId)
      return reply.status(200).send(result)
    } catch (error: any) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 } })
    }
  }

  static async getErrorStats(_request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.status(200).send(await AdminService.getErrorStats())
    } catch (error: any) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message, statusCode: 500 } })
    }
  }
}
