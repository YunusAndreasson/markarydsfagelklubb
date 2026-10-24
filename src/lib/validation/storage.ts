import { z } from 'zod'

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 // 8 MiB
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const
export type AllowedMime = (typeof ALLOWED_MIME)[number]

export const STORAGE_BUCKET = 'user-uploads'

export const MIME_TO_EXT: Record<AllowedMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
}

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const EXT_RE = 'jpg|jpeg|png|webp|heic'

export const imagePathSchema = z
  .string()
  .max(256)
  .regex(
    new RegExp(`^${UUID_RE}/(observations/${UUID_RE}|avatar)\\.(${EXT_RE})$`),
    'Ogiltig bildsökväg',
  )

export const createUploadUrlInput = z.object({
  purpose: z.enum(['observation', 'avatar']),
  mimeType: z.enum(ALLOWED_MIME),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  draftId: z.uuid().optional(),
})

export const deleteUploadInput = z.object({ path: imagePathSchema })
export const getSignedUrlInput = z.object({ path: imagePathSchema })

export type CreateUploadUrlInput = z.infer<typeof createUploadUrlInput>
