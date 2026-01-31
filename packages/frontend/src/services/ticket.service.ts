import apiClient from './api'

export interface CreateTicketData {
  subject: string
  message: string
  type: 'BUG' | 'FEATURE' | 'QUESTION'
}

export interface Ticket {
  id: string
  userId: string
  subject: string
  message: string
  type: 'BUG' | 'FEATURE' | 'QUESTION'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  adminNotes: string | null
  resolvedAt: string | null
  resolvedBy: string | null
  createdAt: string
  updatedAt: string
  user?: {
    email: string
    firstName: string | null
    lastName: string | null
  }
}

export interface TicketListResponse {
  items: Ticket[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface TicketStats {
  total: number
  open: number
  inProgress: number
  resolved: number
  todayTickets: number
}

export const ticketService = {
  async createTicket(data: CreateTicketData) {
    const response = await apiClient.post('/tickets', data)
    return response.data
  },

  async getMyTickets(params?: { page?: number; pageSize?: number }): Promise<TicketListResponse> {
    const response = await apiClient.get('/tickets/my', { params })
    return response.data
  },

  // Admin methods
  async getTickets(params?: {
    page?: number
    pageSize?: number
    status?: string
    type?: string
  }): Promise<TicketListResponse> {
    const response = await apiClient.get('/tickets', { params })
    return response.data
  },

  async updateTicketStatus(ticketId: string, data: { status: string; adminNotes?: string }) {
    const response = await apiClient.patch(`/tickets/${ticketId}/status`, data)
    return response.data
  },

  async getTicketStats(): Promise<TicketStats> {
    const response = await apiClient.get('/tickets/stats')
    return response.data
  },
}
