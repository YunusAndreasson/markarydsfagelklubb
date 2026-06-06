import { z } from 'zod'
import { latitudeSchema, longitudeSchema } from './location'
import { imagePathSchema } from './storage'

/**
 * Aktiviteter som visas i rapporteringsformuläret som en enda chip-lista.
 * Ordningen styr chip-ordningen användaren ser. Lägg nya längst ner — gamla
 * rader i databasen kan ha värden från LEGACY_ACTIVITIES; de tillåts av
 * activitySchema och renderas via i18n så historisk data inte tappas.
 */
export const ACTIVITIES = [
  'stationär',
  'förbiflygande',
  'födosökande',
  'spelSång',
  'rastande',
  'häckningsbiotop',
  'lockläte',
  'övrigaLäten',
  'häckande',
] as const
export type Activity = (typeof ACTIVITIES)[number]

/** Tidigare aktivitetsnycklar — tillåts vid läsning så äldre observationer
 * fortfarande validerar och visas, men visas inte i picker:n. */
export const LEGACY_ACTIVITIES = ['sträckande', 'spelande'] as const
export type LegacyActivity = (typeof LEGACY_ACTIVITIES)[number]

export const activitySchema = z.enum([...ACTIVITIES, ...LEGACY_ACTIVITIES])

const baseObservationFields = {
  speciesId: z.number().int().positive('Välj en art'),
  count: z
    .number()
    .int()
    .min(1, 'Antal måste vara minst 1')
    .max(100000, 'Antal verkar orimligt högt'),
  observedAt: z.coerce
    .date()
    .refine((d) => d.getTime() <= Date.now() + 60_000, {
      message: 'Tiden får inte vara i framtiden',
    })
    .refine((d) => d.getTime() > Date.parse('2000-01-01'), {
      message: 'Datum verkar för långt bakåt',
    }),
  locationId: z.number().int().positive().nullable().optional(),
  latitude: latitudeSchema.nullable().optional(),
  longitude: longitudeSchema.nullable().optional(),
  comment: z
    .string()
    .trim()
    .max(2000, 'Kommentar får vara högst 2000 tecken')
    .optional()
    .transform((v) => (v ? v : null)),
  imagePath: imagePathSchema.nullable().optional(),
  // Aktivitet är obligatorisk — ett medvetet val, inget tyst förval.
  activity: activitySchema,
  alertRequested: z.boolean().optional().default(false),
}

const refineLocation = (
  data: {
    locationId?: number | null
    latitude?: number | null
    longitude?: number | null
  },
  ctx: z.RefinementCtx,
) => {
  // Förbjud "halva koordinater".
  if (data.latitude != null && data.longitude == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ofullständiga koordinater — longitud saknas.',
      path: ['longitude'],
    })
    return
  }
  if (data.longitude != null && data.latitude == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ofullständiga koordinater — latitud saknas.',
      path: ['latitude'],
    })
    return
  }
  const hasLocation = data.locationId != null
  const hasCoords = data.latitude != null && data.longitude != null
  // Plats är obligatorisk: exakt en av lokal/koordinater måste anges.
  if (!hasLocation && !hasCoords) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ange var observationen gjordes.',
      path: ['locationId'],
    })
    return
  }
  if (hasLocation && hasCoords) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Välj antingen en lokal eller egna koordinater, inte båda.',
      path: ['locationId'],
    })
  }
}

export const createObservationInput = z.object(baseObservationFields).superRefine(refineLocation)

export const updateObservationInput = z
  .object({ id: z.string().uuid(), ...baseObservationFields })
  .superRefine(refineLocation)

export type CreateObservationInput = z.infer<typeof createObservationInput>
export type UpdateObservationInput = z.infer<typeof updateObservationInput>
