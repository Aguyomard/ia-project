/**
 * Entité Document du domaine
 */
export interface Document {
  id: number;
  content: string;
  embedding: number[] | null;
  createdAt?: Date;
}

/**
 * Document avec sa distance de similarité (pour les résultats de recherche)
 */
export interface DocumentWithDistance extends Document {
  /** Distance cosinus (plus petit = plus similaire) */
  distance: number;
}

