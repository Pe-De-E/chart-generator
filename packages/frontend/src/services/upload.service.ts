import { api } from './api'
import type { UserImage } from '@chart-generator/shared'

class UploadService {
  /**
   * Upload an image file
   */
  async uploadImage(file: File): Promise<UserImage> {
    const formData = new FormData()
    formData.append('image', file)

    const response = await api.post<{ success: true; data: UserImage }>(
      '/uploads/image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
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
