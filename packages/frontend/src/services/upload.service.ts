import { api } from './api'
import type { UserImage } from '@chart-generator/shared'

/**
 * Compress an image client-side using the Canvas API.
 * Scales down to maxWidth (preserving aspect ratio) and re-encodes as JPEG.
 */
function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip if already small enough (< 1 MB)
    if (file.size < 1024 * 1024) {
      resolve(file)
      return
    }

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // No resize needed if already within limits
      if (img.width <= maxWidth) {
        // Still re-encode as JPEG for compression
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Canvas compression failed')); return }
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
          },
          'image/jpeg',
          quality
        )
        return
      }

      // Scale down preserving aspect ratio
      const ratio = maxWidth / img.width
      const newWidth = maxWidth
      const newHeight = Math.round(img.height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = newWidth
      canvas.height = newHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas compression failed')); return }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for compression'))
    }

    img.src = url
  })
}

class UploadService {
  /**
   * Upload an image file (auto-compresses large images before upload)
   */
  async uploadImage(file: File): Promise<UserImage> {
    const compressed = await compressImage(file)

    const formData = new FormData()
    formData.append('image', compressed)

    // axios will handle Content-Type automatically for FormData (see api.ts interceptor)
    const response = await api.post<{ success: true; data: UserImage }>(
      '/uploads/image',
      formData
    )
    return response.data.data
  }

  /**
   * Get all images for the current user
   */
  async getUserImages(): Promise<UserImage[]> {
    const response = await api.get<{ success: true; data: UserImage[] }>(
      '/uploads/images'
    )
    return response.data.data
  }

  /**
   * Get a single image by ID
   */
  async getImageById(id: string): Promise<UserImage> {
    const response = await api.get<{ success: true; data: UserImage }>(
      `/uploads/image/${id}`
    )
    return response.data.data
  }

  /**
   * Delete an image
   */
  async deleteImage(id: string): Promise<void> {
    await api.delete(`/uploads/image/${id}`)
  }

  /**
   * Get the full URL for an image
   */
  getImageUrl(image: UserImage): string {
    // The backend serves static files from /uploads/
    // We need to construct the full URL based on the API base URL
    const baseUrl = api.defaults.baseURL || ''
    // Remove /api/v1 from the base URL and add the image path
    const serverUrl = baseUrl.replace('/api/v1', '')
    return `${serverUrl}${image.path}`
  }
}

export const uploadService = new UploadService()
