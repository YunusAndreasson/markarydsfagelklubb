import { z } from 'zod'

export const emailInput = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Ogiltig e-postadress')
    .max(254, 'E-postadressen är för lång'),
})

export type EmailInput = z.infer<typeof emailInput>
