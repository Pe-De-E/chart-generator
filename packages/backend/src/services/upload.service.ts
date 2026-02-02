import { prisma } from '../config/database.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Uploads directory relative to backend package
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/images')

// Constraints
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB upload limit
const MAX_IMAGES_PER_USER = 10
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp']

// Image processing settings
const MAX_IMAGE_WIDTH = 1920  // Max width for stored images
const JPEG_QUALITY = 80       // Quality for JPEG compression

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

    // Process image with sharp: resize and compress
    const processedImage = await sharp(file.data)
      .resize(MAX_IMAGE_WIDTH, null, {
        withoutEnlargement: true,  // Don't upscale small images
        fit: 'inside',
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()

    // Create database entry
    const image = await prisma.userImage.create({
      data: {
        userId,
        filename: file.filename,
        mimetype: 'image/jpeg',  // Always store as JPEG
        size: processedImage.length,
        path: '', // Will be updated after saving file
      },
    })

    // Create file path (always .jpg after processing)
    const userDir = await this.ensureUserDir(userId)
    const filePath = path.join(userDir, `${image.id}.jpg`)
    const relativePath = `/uploads/images/${userId}/${image.id}.jpg`

    // Save processed file to disk
    await fs.writeFile(filePath, processedImage)

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
