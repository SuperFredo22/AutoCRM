-- ============================================================
-- AutoCRM — Schéma complet Supabase
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Table user_profiles (extension de auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name    text NOT NULL DEFAULT '',
  color   text NOT NULL DEFAULT '#3B82F6',
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 2. Table vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL CHECK (type IN ('achat', 'mandat')),
  brand         text NOT NULL,
  model         text NOT NULL,
  year          integer,
  mileage       integer,
  seller_price  numeric,
  listing_price numeric,
  status        text NOT NULL DEFAULT 'sourcing'
                  CHECK (status IN ('sourcing','contact','accord','preparation','vente','vendu')),
  assigned_to   text,          -- uuid or 'both'
  notes         text,
  photos        text[],
  source        text,
  sold_at       timestamp WITH TIME ZONE,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamp WITH TIME ZONE DEFAULT now(),
  updated_at    timestamp WITH TIME ZONE DEFAULT now()
);

-- 3. Table contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL CHECK (type IN ('vendeur', 'acheteur')),
  name         text NOT NULL,
  phone        text,
  email        text,
  vehicle_id   uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'nouveau'
                 CHECK (status IN ('nouveau','contacte','rencontre','accord','perdu')),
  assigned_to  text,
  next_action  text,
  next_date    date,
  notes        text,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamp WITH TIME ZONE DEFAULT now(),
  updated_at   timestamp WITH TIME ZONE DEFAULT now()
);

-- 4. Table availability_slots
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date       date NOT NULL,
  start_time time NOT NULL,
  end_time   time NOT NULL,
  type       text NOT NULL CHECK (type IN ('dispo', 'indispo')),
  notes      text,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 5. Table appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  date        date NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  vehicle_id  uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  contact_id  uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  need_both   boolean DEFAULT false,
  assigned_to text,
  location    text,
  notes       text,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamp WITH TIME ZONE DEFAULT now()
);

-- 6. Table activity_log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('vehicle', 'contact')),
  entity_id   uuid NOT NULL,
  user_id     uuid REFERENCES auth.users(id),
  action      text NOT NULL,
  metadata    jsonb,
  created_at  timestamp WITH TIME ZONE DEFAULT now()
);

-- ============================================================
-- Trigger : auto-créer le profil quand un user s'inscrit
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.user_profiles;
  INSERT INTO public.user_profiles (id, name, color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE WHEN user_count = 0 THEN '#3B82F6' ELSE '#F59E0B' END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Trigger : updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log     ENABLE ROW LEVEL SECURITY;

-- user_profiles : lecture globale, écriture sur soi-même
CREATE POLICY "Profiles readable by authenticated" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- vehicles : tous les authentifiés voient tout
CREATE POLICY "All authenticated can read vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert vehicles" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Authenticated can update vehicles" ON public.vehicles
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Creator can delete vehicle" ON public.vehicles
  FOR DELETE TO authenticated USING (created_by = auth.uid());

-- contacts
CREATE POLICY "All authenticated can read contacts" ON public.contacts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert contacts" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Authenticated can update contacts" ON public.contacts
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Creator can delete contact" ON public.contacts
  FOR DELETE TO authenticated USING (created_by = auth.uid());

-- availability_slots
CREATE POLICY "All authenticated can read slots" ON public.availability_slots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own slots" ON public.availability_slots
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- appointments
CREATE POLICY "All authenticated can read appointments" ON public.appointments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert appointments" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Authenticated can update appointments" ON public.appointments
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Creator can delete appointment" ON public.appointments
  FOR DELETE TO authenticated USING (created_by = auth.uid());

-- activity_log : lecture globale, insert par authentifiés
CREATE POLICY "All authenticated can read activity" ON public.activity_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert activity" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Supabase Realtime — activer les publications
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- ============================================================
-- Storage : bucket pour photos véhicules
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload vehicle photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-photos');
CREATE POLICY "Public can view vehicle photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicle-photos');
CREATE POLICY "Creator can delete vehicle photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
