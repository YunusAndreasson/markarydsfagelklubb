import { describe, expect, it } from 'vitest'
import { createUploadUrlInput, imagePathSchema, MAX_UPLOAD_BYTES } from './storage'

// Real v4 UUIDs (zod v4 enforces the version + variant bits).
const USER = '7f3c9a14-9a64-4f8e-9c3b-2a5b1e1f4c10'
const DRAFT = 'a3b6e1c4-9d2f-4a1b-8c7e-5f9a0b1c2d3e'

describe('imagePathSchema', () => {
  it.each([
    `${USER}/avatar.jpg`,
    `${USER}/avatar.png`,
    `${USER}/avatar.webp`,
    `${USER}/avatar.heic`,
    `${USER}/observations/${DRAFT}.jpg`,
  ])('accepts %s', (p) => {
    expect(imagePathSchema.safeParse(p).success).toBe(true)
  })

  it.each([
    'not-a-uuid/avatar.jpg',
    `${USER}/avatar.gif`,
    `${USER}/observations/${DRAFT}.exe`,
    `${USER}/../other-user/avatar.jpg`,
    `${USER}/random/${DRAFT}.jpg`,
    `${USER}/observations/not-a-uuid.jpg`,
  ])('rejects %s', (p) => {
    expect(imagePathSchema.safeParse(p).success).toBe(false)
  })
})

describe('createUploadUrlInput', () => {
  it('accepts a valid observation upload request', () => {
    const r = createUploadUrlInput.safeParse({
      purpose: 'observation',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      draftId: DRAFT,
    })
    expect(r.success).toBe(true)
  })

  it('rejects oversize uploads', () => {
    const r = createUploadUrlInput.safeParse({
      purpose: 'avatar',
      mimeType: 'image/jpeg',
      sizeBytes: MAX_UPLOAD_BYTES + 1,
    })
    expect(r.success).toBe(false)
  })

  it('rejects unsupported mime', () => {
    const r = createUploadUrlInput.safeParse({
      purpose: 'avatar',
      mimeType: 'image/gif',
      sizeBytes: 1024,
    })
    expect(r.success).toBe(false)
  })
})
