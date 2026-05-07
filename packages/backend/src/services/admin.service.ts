import { prisma } from '../config/database.js'
import { Prisma, PaymentStatus } from '@prisma/client'

export class AdminService {
  // ===== DASHBOARD =====
  static async getDashboardOverview() {
    const [userStats, paymentStats, requestStats, errorStats] = await Promise.all([
      this.getUserStats(),
      this.getPaymentStats(),
      this.getRequestStats(),
      this.getErrorStats(),
    ])
    return { users: userStats, payments: paymentStats, requests: requestStats, errors: errorStats }
  }

  // ===== USERS =====
  static async getUsers(options: { page: number; pageSize: number; search?: string }) {
    const { page, pageSize, search } = options
    const skip = (page - 1) * pageSize
    const where: Prisma.UserWhereInput = search
      ? { OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ]}
      : {}

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          emailVerified: true, isAdmin: true, createdAt: true, lastLoginAt: true,
          _count: { select: { charts: true, payments: true } },
        },
      }),
      prisma.user.count({ where }),
    ])
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  static async getUserStats() {
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const [total, verified, admins, newThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
    ])
    return { total, verified, admins, newThisMonth }
  }

  // ===== PAYMENTS =====
  static async getPayments(options: { page: number; pageSize: number; status?: string }) {
    const { page, pageSize, status } = options
    const skip = (page - 1) * pageSize
    const where: Prisma.PaymentWhereInput = status ? { status: status as PaymentStatus } : {}

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
      prisma.payment.count({ where }),
    ])
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  static async getPaymentStats() {
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const [totalRevenue, monthlyRevenue, pendingCount, completedCount] = await Promise.all([
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED', completedAt: { gte: thisMonth } }, _sum: { amount: true } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
    ])
    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      pendingCount, completedCount,
    }
  }

  // ===== REQUEST LOGS =====
  static async getRequestLogs(options: { page: number; pageSize: number; statusCode?: number; method?: string }) {
    const { page, pageSize, statusCode, method } = options
    const skip = (page - 1) * pageSize
    const where: Prisma.RequestLogWhereInput = {
      ...(statusCode && { statusCode }),
      ...(method && { method }),
    }

    const [items, total] = await Promise.all([
      prisma.requestLog.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.requestLog.count({ where }),
    ])
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  static async getRequestStats() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const [totalRequests, todayRequests, errorRequests, avgResponseTime] = await Promise.all([
      prisma.requestLog.count(),
      prisma.requestLog.count({ where: { createdAt: { gte: today } } }),
      prisma.requestLog.count({ where: { statusCode: { gte: 400 } } }),
      prisma.requestLog.aggregate({ _avg: { responseTime: true } }),
    ])
    return { totalRequests, todayRequests, errorRequests, avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0) }
  }

  // ===== ERROR LOGS =====
  static async getErrorLogs(options: { page: number; pageSize: number; resolved?: boolean; severity?: string }) {
    const { page, pageSize, resolved, severity } = options
    const skip = (page - 1) * pageSize
    const where: Prisma.ErrorLogWhereInput = {
      ...(resolved !== undefined && { resolved }),
      ...(severity && { severity }),
    }

    const [items, total] = await Promise.all([
      prisma.errorLog.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.errorLog.count({ where }),
    ])
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  static async resolveError(errorId: string, adminUserId: string) {
    return prisma.errorLog.update({
      where: { id: errorId },
      data: { resolved: true, resolvedAt: new Date(), resolvedBy: adminUserId },
    })
  }

  static async getErrorStats() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const [total, unresolved, todayErrors, criticalCount] = await Promise.all([
      prisma.errorLog.count(),
      prisma.errorLog.count({ where: { resolved: false } }),
      prisma.errorLog.count({ where: { createdAt: { gte: today } } }),
      prisma.errorLog.count({ where: { severity: 'critical', resolved: false } }),
    ])
    return { total, unresolved, todayErrors, criticalCount }
  }
}
