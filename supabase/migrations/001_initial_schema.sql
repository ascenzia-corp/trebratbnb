-- ============================================
-- Trébrat — Supabase Migration: Initial Schema
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  role TEXT DEFAULT 'agent_terrain' CHECK (role IN ('proprietaire', 'agent_terrain')),
  agent_key TEXT CHECK (agent_key IN ('marie', 'manu', 'alienor')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reservations
CREATE TABLE reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyageur TEXT NOT NULL,
  telephone TEXT,
  nb_personnes INTEGER DEFAULT 1,
  date_checkin TIMESTAMPTZ NOT NULL,
  date_checkout TIMESTAMPTZ NOT NULL,
  statut_sejour TEXT DEFAULT 'a_venir'
    CHECK (statut_sejour IN ('a_venir', 'en_cours', 'termine', 'annule')),
  commentaires TEXT,
  google_event_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tâches
CREATE TABLE taches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  type_tache TEXT NOT NULL
    CHECK (type_tache IN ('lits_a_faire', 'lits_a_defaire', 'menage', 'edl_entree', 'edl_sortie')),
  moment TEXT NOT NULL
    CHECK (moment IN ('checkin', 'checkout')),
  a_faire BOOLEAN DEFAULT FALSE,
  statut TEXT DEFAULT 'a_faire'
    CHECK (statut IN ('a_faire', 'fait')),
  assignee_a TEXT DEFAULT 'non_assignee'
    CHECK (assignee_a IN ('manu', 'alienor', 'non_assignee')),
  date_echeance DATE,
  date_realisation TIMESTAMPTZ,
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- États des lieux
CREATE TABLE etats_des_lieux (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  piece TEXT NOT NULL
    CHECK (piece IN (
      'jardin', 'terrasse', 'cuisine', 'sejour', 'billard',
      'entree', 'wc_bas', 'sous_sol', 'escalier_palier_1',
      'chambre_kaki', 'salle_de_bains', 'suite_parentale',
      'chambre_filles', 'escalier_palier_2', 'salle_de_bains_2',
      'chambre_grise', 'chambre_marron', 'chambre_bleue'
    )),
  moment TEXT NOT NULL
    CHECK (moment IN ('entree', 'sortie')),
  etat TEXT DEFAULT 'ras'
    CHECK (etat IN ('ras', 'a_signaler', 'probleme')),
  commentaire TEXT,
  probleme_signale BOOLEAN DEFAULT FALSE,
  description_probleme TEXT,
  realise_par TEXT
    CHECK (realise_par IN ('manu', 'alienor')),
  date_constat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Photos des états des lieux
CREATE TABLE etats_des_lieux_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  edl_id UUID REFERENCES etats_des_lieux(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Achats
CREATE TABLE achats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  article TEXT NOT NULL,
  statut TEXT DEFAULT 'a_acheter'
    CHECK (statut IN ('a_acheter', 'achete', 'non_necessaire')),
  prix DECIMAL(10,2),
  demande_par TEXT
    CHECK (demande_par IN ('marie', 'manu', 'alienor')),
  date_achat DATE,
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Justificatifs achats
CREATE TABLE achats_justificatifs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  achat_id UUID REFERENCES achats(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON taches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON etats_des_lieux FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON achats FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE taches ENABLE ROW LEVEL SECURITY;
ALTER TABLE etats_des_lieux ENABLE ROW LEVEL SECURITY;
ALTER TABLE etats_des_lieux_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE achats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achats_justificatifs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can do everything" ON profiles FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON reservations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON taches FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON etats_des_lieux FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON etats_des_lieux_photos FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON achats FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON achats_justificatifs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE taches;
ALTER PUBLICATION supabase_realtime ADD TABLE etats_des_lieux;
ALTER PUBLICATION supabase_realtime ADD TABLE achats;

-- ============================================
-- Storage buckets (run via Supabase dashboard or API)
-- ============================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('edl-photos', 'edl-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('achats-justificatifs', 'achats-justificatifs', true);
-- CREATE POLICY "Authenticated uploads" ON storage.objects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_reservations_checkin ON reservations(date_checkin);
CREATE INDEX idx_reservations_statut ON reservations(statut_sejour);
CREATE INDEX idx_taches_reservation ON taches(reservation_id);
CREATE INDEX idx_taches_echeance ON taches(date_echeance);
CREATE INDEX idx_edl_reservation ON etats_des_lieux(reservation_id);
CREATE INDEX idx_edl_photos_edl ON etats_des_lieux_photos(edl_id);
CREATE INDEX idx_achats_reservation ON achats(reservation_id);
CREATE INDEX idx_achats_justificatifs_achat ON achats_justificatifs(achat_id);
