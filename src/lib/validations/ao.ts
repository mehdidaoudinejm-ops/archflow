import { z } from 'zod'

export const createAOSchema = z.object({
  dpgfId: z.string().min(1, 'DPGF requis'),
  name: z.string().min(1, 'Nom de l\'AO requis').max(150),
  lotIds: z.array(z.string()).min(1, 'Sélectionnez au moins un lot'),
  deadline: z.string().min(1, 'Date limite requise'), // ISO string
  instructions: z.string().max(2000).nullable().optional(),
  allowCustomQty: z.boolean().optional().default(true),
  isPaid: z.boolean().optional().default(false),
  paymentAmount: z.number().nonnegative().nullable().optional(),
})

export const updateAOSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  deadline: z.string().optional(),
  instructions: z.string().max(2000).nullable().optional(),
  allowCustomQty: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  paymentAmount: z.number().nonnegative().nullable().optional(),
  status: z.enum(['DRAFT', 'SENT', 'IN_PROGRESS', 'CLOSED', 'ARCHIVED']).optional(),
})

export const inviteCompanySchema = z.object({
  email: z.string().email('Email invalide'),
})

export type CreateAOInput = z.infer<typeof createAOSchema>
export type UpdateAOInput = z.infer<typeof updateAOSchema>
export type InviteCompanyInput = z.infer<typeof inviteCompanySchema>
