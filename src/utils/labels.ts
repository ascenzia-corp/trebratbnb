import type { StatutSejour, TypeTache, MomentTache, Assignee, Piece, EtatEdl, StatutAchat, Demandeur } from '../types';

export const STATUT_SEJOUR_LABELS: Record<StatutSejour, { label: string; color: string; bg: string }> = {
  a_venir: { label: 'À venir', color: 'text-blue-500', bg: 'bg-blue-50' },
  en_cours: { label: 'En cours', color: 'text-green-500', bg: 'bg-green-50' },
  termine: { label: 'Terminé', color: 'text-gray-400', bg: 'bg-gray-100' },
  annule: { label: 'Annulé', color: 'text-red-600', bg: 'bg-red-50' },
};

export const TYPE_TACHE_LABELS: Record<TypeTache, string> = {
  lits_a_faire: '🛏️ Lits à faire',
  lits_a_defaire: '🛏️ Lits à défaire',
  menage: '🧹 Ménage',
  edl_entree: '📋 État des lieux entrée',
  edl_sortie: '📋 État des lieux sortie',
};

export const MOMENT_TACHE_LABELS: Record<MomentTache, { label: string; color: string; bg: string }> = {
  checkin: { label: 'Check-in', color: 'text-green-500', bg: 'bg-green-50' },
  checkout: { label: 'Check-out', color: 'text-orange-500', bg: 'bg-orange-50' },
};

export const ASSIGNEE_LABELS: Record<Assignee, { label: string; color: string; bg: string }> = {
  manu: { label: 'Manu', color: 'text-blue-500', bg: 'bg-blue-50' },
  alienor: { label: 'Aliénor', color: 'text-purple-500', bg: 'bg-purple-50' },
  non_assignee: { label: 'Non assignée', color: 'text-gray-400', bg: 'bg-gray-100' },
};

export const PIECES_ORDERED: Piece[] = [
  'jardin', 'terrasse', 'cuisine', 'sejour', 'billard',
  'entree', 'wc_bas', 'sous_sol', 'escalier_palier_1',
  'chambre_kaki', 'salle_de_bains', 'suite_parentale',
  'chambre_filles', 'escalier_palier_2', 'salle_de_bains_2',
  'chambre_grise', 'chambre_marron', 'chambre_bleue',
];

export const PIECE_LABELS: Record<Piece, string> = {
  jardin: '🌳 Jardin',
  terrasse: '☀️ Terrasse',
  cuisine: '🍳 Cuisine',
  sejour: '🛋️ Séjour',
  billard: '🎱 Billard',
  entree: '🚪 Entrée',
  wc_bas: '🚽 WC bas',
  sous_sol: '📦 Sous-sol',
  escalier_palier_1: '🪜 Escalier Palier 1',
  chambre_kaki: '🟤 Chambre Kaki',
  salle_de_bains: '🚿 Salle de bains',
  suite_parentale: '👑 Suite Parentale',
  chambre_filles: '🎀 Chambre filles',
  escalier_palier_2: '🪜 Escalier Palier 2',
  salle_de_bains_2: '🚿 Salle de bains 2',
  chambre_grise: '🩶 Chambre grise',
  chambre_marron: '🟫 Chambre marron',
  chambre_bleue: '🔵 Chambre Bleue',
};

export const ETAT_EDL_LABELS: Record<EtatEdl, { label: string; color: string; bg: string }> = {
  ras: { label: '✅ RAS', color: 'text-green-500', bg: 'bg-green-50' },
  a_signaler: { label: '⚠️ À signaler', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  probleme: { label: '🔴 Problème', color: 'text-red-500', bg: 'bg-red-50' },
};

export const STATUT_ACHAT_LABELS: Record<StatutAchat, { label: string; color: string; bg: string }> = {
  a_acheter: { label: 'À acheter', color: 'text-orange-500', bg: 'bg-orange-50' },
  achete: { label: 'Acheté', color: 'text-green-500', bg: 'bg-green-50' },
  non_necessaire: { label: 'Non nécessaire', color: 'text-gray-400', bg: 'bg-gray-100' },
};

export const DEMANDEUR_LABELS: Record<Demandeur, { label: string; color: string; bg: string }> = {
  marie: { label: 'Marie', color: 'text-pink-500', bg: 'bg-pink-50' },
  manu: { label: 'Manu', color: 'text-blue-500', bg: 'bg-blue-50' },
  alienor: { label: 'Aliénor', color: 'text-purple-500', bg: 'bg-purple-50' },
};
