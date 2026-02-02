import { z } from 'zod'

// Image ID parameter validation
export const imageIdSchema = z.object({
  id: z.string().uuid('Ungültige Bild-ID'),
})

// Allowed mimetypes (for documentation/reference)
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

// Max file size in bytes (upload limit, images are compressed before storage)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB

// Max images per user
export const MAX_IMAGES_PER_USER = 10
