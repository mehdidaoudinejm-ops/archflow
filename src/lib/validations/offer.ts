import { z } from 'zod'

export const offerPostSchema = z.object({
  postId: z.string().min(1),
  unitPrice: z.number().nonnegative().nullable().optional(),
  qtyCompany: z.number().positive().nullable().optional(),
  qtyMotive: z.string().max(500).nullable().optional(),
  comment: z.string().max(500).nullable().optional(),
  isVariant: z.boolean().optional(),
  variantDescription: z.string().max(500).nullable().optional(),
})

export const saveOfferSchema = z.object({
  posts: z.array(offerPostSchema),
  lotVatRates: z.record(z.string(), z.number().min(0).max(100)).optional(),
})

export const adminDocSchema = z.object({
  type: z.enum(['kbis', 'decennale', 'rcpro', 'rib', 'urssaf']),
  fileUrl: z.string().min(1, 'URL fichier requise'),
})

export type OfferPostInput = z.infer<typeof offerPostSchema>
export type SaveOfferInput = z.infer<typeof saveOfferSchema>
export type AdminDocInput = z.infer<typeof adminDocSchema>
