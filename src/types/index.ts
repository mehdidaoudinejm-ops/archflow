import type {
  Agency,
  User,
  Project,
  DPGF,
  Lot,
  SubLot,
  Post,
  AO,
  AOCompany,
  Offer,
  OfferPost,
  Document,
  QA,
  QAAnswer,
} from '@prisma/client'

// ── Re-exports Prisma ──────────────────────────────────
export type {
  Agency,
  User,
  Project,
  DPGF,
  Lot,
  SubLot,
  Post,
  AO,
  AOCompany,
  Offer,
  OfferPost,
  Document,
  QA,
  QAAnswer,
}

// ── Types composés ────────────────────────────────────

export type UserWithAgency = User & {
  agency: Agency | null
}

export type ProjectWithDPGFs = Project & {
  dpgfs: DPGF[]
}

export type LotWithChildren = Lot & {
  sublots: SubLotWithPosts[]
  posts: Post[]
}

export type SubLotWithPosts = SubLot & {
  posts: Post[]
}

export type AOWithCompanies = AO & {
  aoCompanies: AOCompany[]
}

export type OfferWithPosts = Offer & {
  offerPosts: OfferPost[]
}

export type QAWithAnswer = QA & {
  answer: QAAnswer | null
}

export type DPGFWithLots = DPGF & {
  lots: LotWithChildren[]
}

// ── Mutation input types ──────────────────────────────

export interface CreatePostInput {
  title: string
  unit: string
  qtyArchi?: number | null
  unitPriceArchi?: number | null
  isOptional?: boolean
  commentArchi?: string | null
  sublotId?: string | null
  libraryRefId?: string | null
}

// ── API Response types ────────────────────────────────

export interface ApiError {
  error: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
