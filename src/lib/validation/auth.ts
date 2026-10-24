import { z } from 'zod'

export const emailInput = z.object({
  // Normalise first, then validate: a top-level `z.email()` runs its format
  // check before any chained `.trim()`/`.toLowerCase()`, so it goes in a pipe.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Ogiltig e-postadress').max(254, 'E-postadressen är för lång')),
})

export type EmailInput = z.infer<typeof emailInput>
