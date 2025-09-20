// Types DOM partagés par tous les types d'items
export interface DomStateType {
  selected: boolean;
  display: 'block' | 'none';
}

// Entry types
export interface DBEntryType {
  id: string;
  entree: string;
  genre: string;
  categorie_id?: string;
  definition: string;
}

export interface CachedEntryType {
  itemType: 'entry';
  entree_min: string;
  entree_min_ra: string;
  categorie_formated?: string;
  genre_formated?: string;
  definition_formated?: string;
}

export interface EntryType {
  id: string;  // ID at root level for easy access
  dbData: DBEntryType;
  cachedData: CachedEntryType;
  domState: DomStateType;
}

// Oeuvre types
export interface DBOeuvreType {
  id: string;
  titre_affiche: string;
  titre_original?: string;
  titre_francais?: string;
  annee?: number;
  auteurs?: string;
  notes?: string;
  resume?: string;
}

export interface CachedOeuvreType {
  itemType: 'oeuvre';
  resume_formated?: string;
  titre_affiche_formated?: string;
  titre_francais_formated?: string;
  titres: string[];                // Tous les titres combinés pour recherche
  titresLookUp: string[];          // Versions minuscules des titres (pour filtrage)
  auteurs_formated?: string;
}

export interface OeuvreType {
  id: string;  // ID at root level for easy access
  dbData: DBOeuvreType;
  cachedData: CachedOeuvreType;
  domState: DomStateType;
}

// Exemple types
export interface DBExempleType {
  oeuvre_id: string;
  indice: number;
  entry_id: string;
  content: string;
  notes?: string;
}

export interface CachedExempleType {
  id: string;
  itemType: 'exemple';
  content_formated: string;
  content_min: string;             // Version minuscules pour recherche
  content_min_ra: string;          // Version rationalisée (sans accents)
  oeuvre_titre: string;            // Titre de l'oeuvre
  entree_formated: string;
  titresLookUp: string[];          // pour le filtrage par titre d'oeuvre
  entry4filter: string;            // version optimisée pour le filtrage
}

export interface ExempleType {
  id: string; 
  dbData: DBExempleType;
  cachedData: CachedExempleType;
  domState: DomStateType;
}

// Union types for any item
export type AnyItemType = EntryType | OeuvreType | ExempleType;
export type AnyDbType = DBEntryType | DBOeuvreType | DBExempleType;