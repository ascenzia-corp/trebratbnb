export type StatutSejour = 'a_venir' | 'en_cours' | 'termine' | 'annule';
export type TypeTache = 'lits_a_faire' | 'lits_a_defaire' | 'menage' | 'edl_entree' | 'edl_sortie';
export type MomentTache = 'checkin' | 'checkout';
export type StatutTache = 'a_faire' | 'fait';
export type Assignee = 'manu' | 'alienor' | 'non_assignee';
export type MomentEdl = 'entree' | 'sortie';
export type EtatEdl = 'ras' | 'a_signaler' | 'probleme';
export type StatutAchat = 'a_acheter' | 'achete' | 'non_necessaire';
export type Demandeur = 'marie' | 'manu' | 'alienor';
export type UserRole = 'proprietaire' | 'agent_terrain';

export type Piece =
  | 'jardin' | 'terrasse' | 'cuisine' | 'sejour' | 'billard'
  | 'entree' | 'wc_bas' | 'sous_sol' | 'escalier_palier_1'
  | 'chambre_kaki' | 'salle_de_bains' | 'suite_parentale'
  | 'chambre_filles' | 'escalier_palier_2' | 'salle_de_bains_2'
  | 'chambre_grise' | 'chambre_marron' | 'chambre_bleue';

export interface Reservation {
  id: string;
  voyageur: string;
  telephone: string | null;
  nb_personnes: number;
  date_checkin: string;
  date_checkout: string;
  statut_sejour: StatutSejour;
  commentaires: string | null;
  google_event_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReservationInput {
  voyageur: string;
  telephone?: string;
  nb_personnes?: number;
  date_checkin: string;
  date_checkout: string;
  commentaires?: string;
}

export interface Tache {
  id: string;
  reservation_id: string;
  titre: string;
  type_tache: TypeTache;
  moment: MomentTache;
  a_faire: boolean;
  statut: StatutTache;
  assignee_a: Assignee;
  date_echeance: string | null;
  date_realisation: string | null;
  commentaire: string | null;
  created_at: string;
  updated_at: string;
  reservation?: Reservation;
}

export interface TacheFilters {
  assignee_a?: Assignee | 'toutes';
  moment?: MomentTache | 'tous';
  a_faire?: boolean;
  statut?: StatutTache;
  reservation_id?: string;
}

export interface EtatDesLieux {
  id: string;
  reservation_id: string;
  piece: Piece;
  moment: MomentEdl;
  etat: EtatEdl;
  commentaire: string | null;
  probleme_signale: boolean;
  description_probleme: string | null;
  realise_par: 'manu' | 'alienor' | null;
  date_constat: string | null;
  created_at: string;
  updated_at: string;
  reservation?: Reservation;
  photos?: EdlPhoto[];
}

export interface EdlPhoto {
  id: string;
  edl_id: string;
  photo_url: string;
  storage_path: string;
  created_at: string;
}

export interface Achat {
  id: string;
  reservation_id: string | null;
  article: string;
  statut: StatutAchat;
  prix: number | null;
  demande_par: Demandeur | null;
  date_achat: string | null;
  commentaire: string | null;
  created_at: string;
  updated_at: string;
  reservation?: Reservation;
  justificatifs?: AchatJustificatif[];
}

export interface CreateAchatInput {
  article: string;
  reservation_id?: string;
  prix?: number;
  demande_par?: Demandeur;
  commentaire?: string;
}

export interface AchatJustificatif {
  id: string;
  achat_id: string;
  photo_url: string;
  storage_path: string;
  created_at: string;
}

export interface AchatFilters {
  statut?: StatutAchat | 'tous';
  reservation_id?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  agent_key?: Assignee | Demandeur;
}
