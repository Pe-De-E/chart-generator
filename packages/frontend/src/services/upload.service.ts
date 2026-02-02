import { api } from './api'
import type { UserImage } from '@chart-generator/shared'

class UploadService {
  /**
   * Upload an image file
   */
  async uploadImage(file: File): Promise<UserImage> {
    const formData = new FormData()
    formData.append('image', file)

    // Use fetch directly to avoid axios Content-Type issues
    const baseUrl = api.defaults.baseURL || ''
    const token = sessionStorage.getItem('accessToken')

    const response = await fetch(`${baseUrl}/uploads/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(error.error || `Upload failed with status ${response.status}`)
    }

    const result = await response.json()
    return result.data
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
