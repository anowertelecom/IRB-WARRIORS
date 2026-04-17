-- Supabase Full SQL Schema for IRB Warriors

-- 1. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id SERIAL PRIMARY KEY,
    club_name TEXT NOT NULL DEFAULT 'IRB Warriors',
    established TEXT,
    location TEXT,
    phone TEXT,
    whatsapp TEXT,
    facebook TEXT,
    logo TEXT,
    admission_fee NUMERIC DEFAULT 0,
    monthly_fee NUMERIC DEFAULT 0
);

-- 2. Committee Table
CREATE TABLE IF NOT EXISTS public.committee (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    photo TEXT,
    phone TEXT
);

-- 3. Players Table
CREATE TABLE IF NOT EXISTS public.players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    father_name TEXT,
    dob TEXT,
    blood_group TEXT,
    address TEXT,
    role TEXT NOT NULL,
    batting_style TEXT,
    bowling_style TEXT,
    jersey_size TEXT,
    jersey_number TEXT,
    photo TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    monthly_fee NUMERIC DEFAULT 0,
    stats JSONB DEFAULT '{"matches": 0, "runs": 0, "wickets": 0, "avg": 0, "sr": 0, "bestInnings": "N/A"}'::jsonb
);

-- Alter table just in case it was created without address initially
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS address TEXT;

-- 4. Admissions Table
CREATE TABLE IF NOT EXISTS public.admissions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    father_name TEXT,
    dob TEXT,
    blood_group TEXT,
    address TEXT,
    phone TEXT,
    photo TEXT,
    role TEXT NOT NULL,
    batting_style TEXT,
    bowling_style TEXT,
    jersey_size TEXT,
    jersey_number TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT DEFAULT 'Unpaid',
    registration_date TEXT
);

-- 5. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id SERIAL PRIMARY KEY,
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    date TEXT,
    time TEXT,
    venue TEXT,
    type TEXT,
    overs INTEGER,
    status TEXT DEFAULT 'Upcoming',
    result TEXT,
    score JSONB,
    playing_xi JSONB
);

-- 6. Finance Table
CREATE TABLE IF NOT EXISTS public.finance (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT,
    description TEXT,
    date TEXT,
    member_id INTEGER
);

-- 7. Notices Table
CREATE TABLE IF NOT EXISTS public.notices (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    date TEXT,
    priority TEXT DEFAULT 'Normal'
);

-- 8. Gallery Table
CREATE TABLE IF NOT EXISTS public.gallery (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail TEXT,
    caption TEXT
);

-- 9. Events Table
CREATE TABLE IF NOT EXISTS public.events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT,
    location TEXT,
    description TEXT
);

-- 10. Hosted Tournaments Table
CREATE TABLE IF NOT EXISTS public.hosted_tournaments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    entry_fee NUMERIC,
    prize_pool TEXT,
    max_teams INTEGER,
    status TEXT DEFAULT 'Upcoming',
    type TEXT DEFAULT 'Public',
    is_published BOOLEAN DEFAULT FALSE,
    rules TEXT,
    registrations JSONB DEFAULT '[]'::jsonb,
    sponsors JSONB DEFAULT '[]'::jsonb,
    fixtures JSONB DEFAULT '[]'::jsonb
);

-- 11. External Tournaments Table
CREATE TABLE IF NOT EXISTS public.external_tournaments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    organizer TEXT,
    location TEXT,
    start_date TEXT,
    budget NUMERIC,
    expenses JSONB DEFAULT '[]'::jsonb,
    squad JSONB DEFAULT '[]'::jsonb,
    matches JSONB DEFAULT '[]'::jsonb,
    current_stage TEXT,
    status TEXT DEFAULT 'Upcoming',
    result TEXT
);

-- 12. Profiles (For Auth roles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'staff'
);

-- Ensure settings row exists
INSERT INTO public.settings (club_name)
SELECT 'IRB Warriors'
WHERE NOT EXISTS (SELECT 1 FROM public.settings);
