import { prisma } from '../config/database.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Uploads directory relative to backend package
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/images')

// Constraints
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_IMAGES_PER_USER = 10
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface UserImage {
  id: string
  userId: string
  filename: string
  mimetype: string
  size: number
  path: string
  url: string
  createdAt: string
}

export interface UploadResult {
  success: boolean
  image?: UserImage
  error?: string
}

export class UploadService {
  /**
   * Ensure the user's upload directory exists
   */
  private async ensureUserDir(userId: string): Promise<string> {
    const userDir = path.join(UPLOADS_DIR, userId)
    await fs.mkdir(userDir, { recursive: true })
    return userDir
  }

  /**
   * Get file extension from mimetype
   */
  private getExtension(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    }
    return map[mimetype] || '.jpg'
  }

  /**
   * Upload a new image
   */
  async uploadImage(
    userId: string,
    file: {
      filename: string
      mimetype: string
      data: Buffer
    }
  ): Promise<UploadResult> {
    // Validate mimetype
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return {
        success: false,
        error: `Ungültiger Dateityp. Erlaubt: ${ALLOWED_MIMETYPES.join(', ')}`,
      }
    }

    // Validate file size
    if (file.data.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `Datei zu groß. Maximum: ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      }
    }

    // Check user's image count
    const imageCount = await prisma.userImage.count({
      where: { userId },
    })

    if (imageCount >= MAX_IMAGES_PER_USER) {
      return {
        success: false,
        error: `Maximum erreicht (${MAX_IMAGES_PER_USER} Bilder). Bitte löschen Sie zuerst ein Bild.`,
      }
    }

    // Create database entry first to get the ID
    const image = await prisma.userImage.create({
      data: {
        userId,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.data.length,
        path: '', // Will be updated after saving file
      },
    })

    // Create file path
    const userDir = await this.ensureUserDir(userId)
    const ext = this.getExtension(file.mimetype)
    const filePath = path.join(userDir, `${image.id}${ext}`)
    const relativePath = `/uploads/images/${userId}/${image.id}${ext}`

    // Save file to disk
    await fs.writeFile(filePath, file.data)

    // Update database with file path
    const updatedImage = await prisma.userImage.update({
      where: { id: image.id },
      data: { path: relativePath },
    })

    return {
      success: true,
      image: this.mapToUserImage(updatedImage),
    }
  }

  /**
   * Get all images for a user
   */
  async getUserImages(userId: string): Promise<UserImage[]> {
    const images = await prisma.userImage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return images.map((img) => this.mapToUserImage(img))
  }

  /**
   * Get a single image by ID
   */
  async getImageById(imageId: string, userId: string): Promise<UserImage | null> {
    const image = await prisma.userImage.findFirst({
      where: { id: imageId, userId },
    })

    if (!image) {
      return null
    }

    return this.mapToUserImage(image)
  }

  /**
   * Delete an image
   */
  async deleteImage(imageId: string, userId: string): Promise<boolean> {
    const image = await prisma.userImage.findFirst({
      where: { id: imageId, userId },
    })

    if (!image) {
      return false
    }

    // Delete file from disk
    try {
      const fullPath = path.join(__dirname, '../..', image.path)
      await fs.unlink(fullPath)
    } catch (err) {
      // File might not exist, continue with DB deletion
      console.warn(`Could not delete file: ${image.path}`, err)
    }

    // Delete from database
    await prisma.userImage.delete({
      where: { id: imageId },
    })

    return true
  }

  /**
   * Map database record to UserImage interface
   */
  private mapToUserImage(image: any): UserImage {
    return {
      id: image.id,
      userId: image.userId,
      filename: image.filename,
      mimetype: image.mimetype,
      size: image.size,
      path: image.path,
      url: image.path, // Same as path for static serving
      createdAt: image.createdAt.toISOString(),
    }
  }
}

export const uploadService = new UploadService()
