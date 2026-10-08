import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    department: optionalText(80),
    year: z.coerce.number().int().min(1).max(6).nullable().optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{6,14}$/, 'Enter a valid phone number')
      .or(z.literal(''))
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional(),
    bio: optionalText(300),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
