import { prisma } from '../config/database.js'
import { Prisma, TicketType, TicketStatus } from '@prisma/client'

export class TicketService {
  // Create a new ticket (authenticated users)
  static async createTicket(data: {
    userId: string
    subject: string
    message: string
    type: TicketType
  }) {
    return prisma.ticket.create({
      data: {
        userId: data.userId,
        subject: data.subject,
        message: data.message,
        type: data.type,
      },
    })
  }

  // Get tickets for a specific user
  static async getUserTickets(userId: string, options: { page: number; pageSize: number }) {
    const { page, pageSize } = options
    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where: { userId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ticket.count({ where: { userId } }),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  // Admin: Get all tickets with pagination and filters
  static async getTickets(options: {
    page: number
    pageSize: number
    status?: TicketStatus
    type?: TicketType
  }) {
    const { page, pageSize, status, type } = options
    const skip = (page - 1) * pageSize
    const where: Prisma.TicketWhereInput = {
      ...(status && { status }),
      ...(type && { type }),
    }

    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
      prisma.ticket.count({ where }),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  // Admin: Update ticket status
  static async updateTicketStatus(
    ticketId: string,
    data: {
      status: TicketStatus
      adminNotes?: string
      resolvedBy?: string
    }
  ) {
    const updateData: Prisma.TicketUpdateInput = {
      status: data.status,
      ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes }),
    }

    if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
      updateData.resolvedAt = new Date()
      updateData.resolvedBy = data.resolvedBy
    }

    return prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    })
  }

  // Admin: Get ticket stats for dashboard
  static async getTicketStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [total, open, inProgress, resolved, todayTickets] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
      prisma.ticket.count({ where: { createdAt: { gte: today } } }),
    ])

    return { total, open, inProgress, resolved, todayTickets }
  }
}
