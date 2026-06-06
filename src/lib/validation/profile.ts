import { z } from 'zod'
import { imagePathSchema } from './storage'

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Namn krävs')
  .max(60, 'Namn får vara högst 60 tecken')

/**
 * Telefonnumret sparas som användaren skrev det (vi behåller mellanslag,
 * bindestreck etc. så det går att läsa), men måste innehålla minst 6 siffror
 * och får inte vara orimligt långt. För `tel:`-länken normaliseras det
 * separat — se `digitsForTel()`.
 */
export const phoneSchema = z
  .string()
  .trim()
  .max(30, 'Telefonnumret är för långt')
  .refine((s) => (s.match(/\d/g) ?? []).length >= 6, {
    message: 'Telefonnumret ser inte rätt ut',
  })

export const upsertProfileInput = z.object({
  displayName: displayNameSchema,
  avatarPath: imagePathSchema.nullable().optional(),
  phone: phoneSchema.nullable().optional(),
})

export type UpsertProfileInput = z.infer<typeof upsertProfileInput>

/**
 * Strippar allt utom siffror och ett ledande `+`, så `tel:`-länken fungerar
 * pålitligt på iOS/Android oavsett hur användaren formaterat numret.
 */
export function digitsForTel(phone: string): string {
  const trimmed = phone.trim()
  const plus = trimmed.startsWith('+') ? '+' : ''
  const digits = trimmed.replace(/\D/g, '')
  return `${plus}${digits}`
}
