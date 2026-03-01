import { z } from 'zod'

export const createLibrarySchema = z.object({
  title:    z.string().min(1, 'Intitulé requis').max(200),
  unit:     z.string().min(1, 'Unité requise').max(20),
  avgPrice: z.number().nonnegative().nullable().optional(),
  trade:    z.string().max(50).nullable().optional(),
})

export const saveToLibrarySchema = z.object({
  trade: z.string().max(50).nullable().optional(),
})
