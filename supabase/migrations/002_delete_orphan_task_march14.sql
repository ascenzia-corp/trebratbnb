-- Delete orphan tasks from March 14 not linked to any valid reservation
DELETE FROM taches
WHERE date_echeance = '2026-03-14'
  AND (reservation_id IS NULL
       OR reservation_id NOT IN (SELECT id FROM reservations));
