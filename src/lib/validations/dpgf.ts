import { z } from 'zod'

export const createLotSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  number: z.number().int().positive().optional(),
})

export const updateLotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().nonnegative().optional(),
})

export const createPostSchema = z.object({
  title: z.string().min(1, "L'intitulé est requis").max(200),
  unit: z.string().min(1, "L'unité est requise").max(20),
  qtyArchi: z.number().positive().nullable().optional(),
  unitPriceArchi: z.number().nonnegative().nullable().optional(),
  isOptional: z.boolean().optional(),
  commentArchi: z.string().max(500).nullable().optional(),
  sublotId: z.string().nullable().optional(),
  libraryRefId: z.string().nullable().optional(),
})

export const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  unit: z.string().min(1).max(20).optional(),
  qtyArchi: z.number().positive().nullable().optional(),
  unitPriceArchi: z.number().nonnegative().nullable().optional(),
  isOptional: z.boolean().optional(),
  commentArchi: z.string().max(500).nullable().optional(),
  position: z.number().int().nonnegative().optional(),
})

export const updateDPGFStatusSchema = z.object({
  status: z.enum(['DRAFT', 'AO_SENT', 'CLOSED', 'ARCHIVED']),
})

export const reorderLotsSchema = z.array(
  z.object({
    lotId: z.string(),
    position: z.number().int().nonnegative(),
  })
)

export const createSubLotSchema = z.object({
  number: z.string().min(1, 'Numéro requis').max(20),
  name:   z.string().min(1, 'Nom requis').max(200),
})

export const updateSubLotSchema = createSubLotSchema.partial()
