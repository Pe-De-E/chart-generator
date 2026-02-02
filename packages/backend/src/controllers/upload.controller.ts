import type { FastifyRequest, FastifyReply } from 'fastify'
import { uploadService } from '../services/upload.service.js'

export class UploadController {
  /**
   * Upload a new image
   * POST /api/v1/uploads/image
   */
  async uploadImage(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.userId

    // Get the uploaded file from multipart
    const file = await request.file()

    if (!file) {
      return reply.code(400).send({
        success: false,
        error: 'Keine Datei hochgeladen',
      })
    }

    // Read file buffer
    const buffer = await file.toBuffer()

    const result = await uploadService.uploadImage(userId, {
      filename: file.filename,
      mimetype: file.mimetype,
      data: buffer,
    })

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: result.error,
      })
    }

    return reply.code(201).send({
      success: true,
      data: result.image,
    })
  }

  /**
   * Get all images for the current user
   * GET /api/v1/uploads/images
   */
  async getUserImages(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.userId

    const images = await uploadService.getUserImages(userId)

    return reply.send({
      success: true,
      data: images,
    })
  }

  /**
   * Get a single image by ID
   * GET /api/v1/uploads/image/:id
   */
  async getImageById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId
    const imageId = request.params.id

    const image = await uploadService.getImageById(imageId, userId)

    if (!image) {
      return reply.code(404).send({
        success: false,
        error: 'Bild nicht gefunden',
      })
    }

    return reply.send({
      success: true,
      data: image,
    })
  }

  /**
   * Delete an image
   * DELETE /api/v1/uploads/image/:id
   */
  async deleteImage(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.userId
    const imageId = request.params.id

    const deleted = await uploadService.deleteImage(imageId, userId)

    if (!deleted) {
      return reply.code(404).send({
        success: false,
        error: 'Bild nicht gefunden oder Zugriff verweigert',
      })
    }

    return reply.code(204).send()
  }
}

export const uploadController = new UploadController()
