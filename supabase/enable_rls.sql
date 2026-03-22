-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Row Level Security on all public tables
--
-- Strategy: RLS enabled, no policies → deny all for PostgREST (anon/authenticated)
-- Prisma uses service_role which bypasses RLS natively → no code change needed
--
-- Run this in the Supabase SQL Editor (one-shot, idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

-- Shell
ALTER TABLE public."Agency"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Project"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProjectPermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ActivityLog"       ENABLE ROW LEVEL SECURITY;

-- DPGF
ALTER TABLE public."DPGF"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DPGFVersion"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Lot"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SubLot"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Post"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Library"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LibraryItem"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AIImport"         ENABLE ROW LEVEL SECURITY;

-- AO
ALTER TABLE public."AO"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AOCompany"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AOScoringConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Offer"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OfferPost"       ENABLE ROW LEVEL SECURITY;

-- DCE / Documents
ALTER TABLE public."Document"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DocumentRead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminDoc"     ENABLE ROW LEVEL SECURITY;

-- Q&A
ALTER TABLE public."QA"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QAAnswer" ENABLE ROW LEVEL SECURITY;

-- Admin / misc
ALTER TABLE public."WaitlistEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Announcement"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Contact"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminEmail"    ENABLE ROW LEVEL SECURITY;

-- Prisma internals (bloque l'accès en lecture au schéma de migrations)
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
