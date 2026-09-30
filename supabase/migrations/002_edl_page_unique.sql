-- ============================================
-- Trébrat — Migration 002 : état des lieux sur une seule page
-- ============================================
-- À exécuter une fois dans Supabase → SQL Editor. Sans risque à relancer.
--
-- 1. Tâches libres ("racheter une ampoule") créées depuis l'état des lieux
-- 2. Marie peut aussi réaliser un état des lieux
-- 3. Retours des locataires + remarques générales, par état des lieux
-- 4. Une seule ligne par pièce et par moment (fusion des doublons éventuels)
-- 5. Création des pièces manquantes (entrée ET sortie) des réservations existantes

-- 1. Nouveau type de tâche : 'autre'
ALTER TABLE taches DROP CONSTRAINT IF EXISTS taches_type_tache_check;
ALTER TABLE taches ADD CONSTRAINT taches_type_tache_check
  CHECK (type_tache IN ('lits_a_faire', 'lits_a_defaire', 'menage', 'edl_entree', 'edl_sortie', 'autre'));

-- 2. Marie peut réaliser un état des lieux
ALTER TABLE etats_des_lieux DROP CONSTRAINT IF EXISTS etats_des_lieux_realise_par_check;
ALTER TABLE etats_des_lieux ADD CONSTRAINT etats_des_lieux_realise_par_check
  CHECK (realise_par IN ('marie', 'manu', 'alienor'));

-- 3. Notes par état des lieux (une ligne par réservation et par moment)
CREATE TABLE IF NOT EXISTS edl_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  moment TEXT NOT NULL CHECK (moment IN ('entree', 'sortie')),
  retours_locataires TEXT,
  remarques TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (reservation_id, moment)
);

DROP TRIGGER IF EXISTS set_updated_at ON edl_notes;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON edl_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE edl_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can do everything" ON edl_notes;
CREATE POLICY "Authenticated users can do everything" ON edl_notes
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE edl_notes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Une seule ligne par pièce et par moment.
--    D'éventuels doublons sont fusionnés d'abord : on garde la ligne déjà
--    remplie (sinon la plus récente) et on lui rattache les photos des autres.
WITH ranked AS (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY reservation_id, piece, moment
           ORDER BY (realise_par IS NOT NULL) DESC, updated_at DESC, created_at
         ) AS keep_id
  FROM etats_des_lieux
)
UPDATE etats_des_lieux_photos p
SET edl_id = r.keep_id
FROM ranked r
WHERE p.edl_id = r.id AND r.id <> r.keep_id;

WITH ranked AS (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY reservation_id, piece, moment
           ORDER BY (realise_par IS NOT NULL) DESC, updated_at DESC, created_at
         ) AS keep_id
  FROM etats_des_lieux
)
DELETE FROM etats_des_lieux e
USING ranked r
WHERE e.id = r.id AND r.id <> r.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS etats_des_lieux_une_piece_par_moment
  ON etats_des_lieux (reservation_id, piece, moment);

-- 5. Pièces manquantes : chaque réservation doit avoir ses 18 pièces en entrée et en sortie
INSERT INTO etats_des_lieux (reservation_id, piece, moment, etat, probleme_signale)
SELECT r.id, p.piece, m.moment, 'ras', false
FROM reservations r
CROSS JOIN (VALUES
  ('jardin'), ('terrasse'), ('cuisine'), ('sejour'), ('billard'),
  ('entree'), ('wc_bas'), ('sous_sol'), ('escalier_palier_1'),
  ('chambre_kaki'), ('salle_de_bains'), ('suite_parentale'),
  ('chambre_filles'), ('escalier_palier_2'), ('salle_de_bains_2'),
  ('chambre_grise'), ('chambre_marron'), ('chambre_bleue')
) AS p(piece)
CROSS JOIN (VALUES ('entree'), ('sortie')) AS m(moment)
ON CONFLICT (reservation_id, piece, moment) DO NOTHING;
