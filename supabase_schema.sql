-- ============================================================================
-- SMART SPLIT BILL - COMPLETE SUPABASE CLOUD DATABASE SCHEMA
-- Compatible with PostgreSQL / Supabase SQL Editor
-- Run this in your existing Supabase Project: SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. LEADS & CONTACTS TABLE (Also acts as primary cross-device cloud persistence)
CREATE TABLE IF NOT EXISTS public.leads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    note TEXT,
    source TEXT DEFAULT 'registration',
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for fast lookup by phone and email
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

-- 2. USERS TABLE (Account Authentication & Profiles)
CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT PRIMARY KEY,
    email TEXT,
    phone TEXT,
    full_name TEXT NOT NULL,
    upi_id TEXT,
    password TEXT,
    bio TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'user',
    currency TEXT DEFAULT 'INR',
    country TEXT DEFAULT 'India',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 3. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    currency TEXT DEFAULT 'INR',
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE
);

-- 4. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id BIGINT REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id BIGINT,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BILLS TABLE
CREATE TABLE IF NOT EXISTS public.bills (
    id BIGINT PRIMARY KEY,
    group_id BIGINT REFERENCES public.groups(id) ON DELETE CASCADE,
    paid_by BIGINT,
    title TEXT NOT NULL,
    description TEXT,
    total_amount NUMERIC(12, 2) NOT NULL,
    category TEXT DEFAULT 'Other',
    split_type TEXT DEFAULT 'equal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BILL SPLITS TABLE
CREATE TABLE IF NOT EXISTS public.bill_splits (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id BIGINT REFERENCES public.bills(id) ON DELETE CASCADE,
    user_id BIGINT,
    owed_amount NUMERIC(12, 2) NOT NULL,
    percentage NUMERIC(5, 2),
    shares INTEGER DEFAULT 1,
    is_settled BOOLEAN DEFAULT FALSE
);

-- 7. PAYMENTS & SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id BIGINT PRIMARY KEY,
    group_id BIGINT REFERENCES public.groups(id) ON DELETE CASCADE,
    payer_id BIGINT,
    payee_id BIGINT,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT DEFAULT 'UPI',
    transaction_ref TEXT,
    status TEXT DEFAULT 'Paid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables instant read/write permissions for web app and mobile access
-- ============================================================================

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public access leads" ON public.leads;
DROP POLICY IF EXISTS "Public access users" ON public.users;
DROP POLICY IF EXISTS "Public access groups" ON public.groups;
DROP POLICY IF EXISTS "Public access group_members" ON public.group_members;
DROP POLICY IF EXISTS "Public access bills" ON public.bills;
DROP POLICY IF EXISTS "Public access bill_splits" ON public.bill_splits;
DROP POLICY IF EXISTS "Public access payments" ON public.payments;

-- Create open RLS policies for anonymous and authenticated web app users
CREATE POLICY "Public access leads" ON public.leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access groups" ON public.groups FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access group_members" ON public.group_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access bills" ON public.bills FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access bill_splits" ON public.bill_splits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access payments" ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Grant privileges to anon, authenticated and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
