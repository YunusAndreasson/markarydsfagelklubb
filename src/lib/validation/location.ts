import { z } from 'zod'

export const latitudeSchema = z
  .number()
  .gte(-90, 'Latitud måste vara mellan -90 och 90')
  .lte(90, 'Latitud måste vara mellan -90 och 90')

export const longitudeSchema = z
  .number()
  .gte(-180, 'Longitud måste vara mellan -180 och 180')
  .lte(180, 'Longitud måste vara mellan -180 och 180')

export const createLocationInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Namn måste vara minst 2 tecken')
    .max(80, 'Namn får vara högst 80 tecken'),
  description: z
    .string()
    .trim()
    .max(500, 'Beskrivning får vara högst 500 tecken')
    .optional()
    .transform((v) => (v ? v : null)),
  latitude: latitudeSchema.optional().nullable(),
  longitude: longitudeSchema.optional().nullable(),
})

export type CreateLocationInput = z.infer<typeof createLocationInput>
