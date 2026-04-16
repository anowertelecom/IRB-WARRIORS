-- SQL to create tables for IRB Warriors App in Supabase

-- 1. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  club_name TEXT DEFAULT 'IRB Warriors',
  established TEXT DEFAULT '2026',
  location TEXT DEFAULT 'Abdul Rob Bazar, Islam Gonj, Kamal Nagar, Lakshmipur',
  phone TEXT DEFAULT '+880 1892-128292',
  whatsapp TEXT DEFAULT '+880 1892-128292',
  facebook TEXT DEFAULT 'https://www.facebook.com/share/1DzscJ3sCS/',
  logo TEXT DEFAULT '/logo.png',
  admission_fee NUMERIC DEFAULT 0,
  monthly_fee NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. Committee Table
CREATE TABLE IF NOT EXISTS committee (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  photo TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Players Table
CREATE TABLE IF NOT EXISTS players (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
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
  status TEXT DEFAULT 'Active',
  monthly_fee NUMERIC DEFAULT 0,
  stats JSONB DEFAULT '{"matches": 0, "runs": 0, "wickets": 0, "avg": 0, "sr": 0, "bestInnings": "N/A"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  venue TEXT NOT NULL,
  type TEXT NOT NULL,
  overs INTEGER NOT NULL,
  status TEXT DEFAULT 'Upcoming',
  score JSONB,
  result TEXT,
  playing_xi BIGINT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Admissions Table
CREATE TABLE IF NOT EXISTS admissions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  father_name TEXT,
  dob TEXT,
  blood_group TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  photo TEXT,
  role TEXT NOT NULL,
  batting_style TEXT,
  bowling_style TEXT,
  jersey_size TEXT,
  jersey_number TEXT,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'Unpaid',
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Finance Table
CREATE TABLE IF NOT EXISTS finance (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type TEXT NOT NULL, -- 'Income' or 'Expense'
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  member_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Notices Table
CREATE TABLE IF NOT EXISTS notices (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  priority TEXT DEFAULT 'Normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Gallery Table
CREATE TABLE IF NOT EXISTS gallery (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type TEXT NOT NULL, -- 'Photo' or 'Video'
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Events Table
CREATE TABLE IF NOT EXISTS events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  location TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Hosted Tournaments Table
CREATE TABLE IF NOT EXISTS hosted_tournaments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  venue TEXT NOT NULL,
  entry_fee NUMERIC,
  prize_pool TEXT,
  max_teams INTEGER,
  status TEXT DEFAULT 'Upcoming',
  type TEXT DEFAULT 'Public',
  is_published BOOLEAN DEFAULT FALSE,
  registrations JSONB DEFAULT '[]'::jsonb,
  sponsors JSONB DEFAULT '[]'::jsonb,
  fixtures JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. External Tournaments Table
CREATE TABLE IF NOT EXISTS external_tournaments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  organizer TEXT,
  venue TEXT,
  squad BIGINT[],
  matches JSONB DEFAULT '[]'::jsonb,
  expenses JSONB DEFAULT '[]'::jsonb,
  current_stage TEXT,
  status TEXT DEFAULT 'Upcoming',
  result TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosted_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_tournaments ENABLE ROW LEVEL SECURITY;

-- Create Policies (Public Read, Authenticated Write)
-- For simplicity in this demo, we'll allow public read and public write if no auth is set up yet,
-- but ideally, write should be restricted.

CREATE POLICY "Public Read" ON settings FOR SELECT USING (true);
CREATE POLICY "Public Read" ON committee FOR SELECT USING (true);
CREATE POLICY "Public Read" ON players FOR SELECT USING (true);
CREATE POLICY "Public Read" ON matches FOR SELECT USING (true);
CREATE POLICY "Public Read" ON admissions FOR SELECT USING (true);
CREATE POLICY "Public Read" ON finance FOR SELECT USING (true);
CREATE POLICY "Public Read" ON notices FOR SELECT USING (true);
CREATE POLICY "Public Read" ON gallery FOR SELECT USING (true);
CREATE POLICY "Public Read" ON events FOR SELECT USING (true);
CREATE POLICY "Public Read" ON hosted_tournaments FOR SELECT USING (true);
CREATE POLICY "Public Read" ON external_tournaments FOR SELECT USING (true);

-- Allow all for now (User should harden this later)
CREATE POLICY "Allow All" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON committee FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON admissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON finance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON notices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON gallery FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON hosted_tournaments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON external_tournaments FOR ALL USING (true) WITH CHECK (true);
