import { sql } from '@vercel/postgres';

export { sql };

export type TypeErp =
  | 'J' | 'L' | 'M' | 'N' | 'O' | 'P' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y'
  | 'PA' | 'CTS' | 'SG' | 'PS' | 'GA' | 'OA' | 'EF' | 'REF';
export type Categorie = 4 | 5;
export type TypeEquipement =
  | 'extincteur'
  | 'ssi'
  | 'desenfumage'
  | 'ria'
  | 'sprinkler'
  | 'installation_technique'
  | 'alarme'
  | 'eclairage_securite'
  | 'porte_coupe_feu'
  | 'installation_electrique';

export interface Etablissement {
  id: number;
  client_id: number;
  nom: string;
  type_erp: TypeErp;
  categorie: Categorie;
  capacite_accueil: number | null;
  adresse: string | null;
  created_at: string;
}

export interface Equipement {
  id: number;
  etablissement_id: number;
  type_equipement: TypeEquipement;
  libelle: string | null;
  present: boolean;
  created_at: string;
}

export const LIBELLES_EQUIPEMENT: Record<TypeEquipement, string> = {
  extincteur: 'Extincteur',
  ssi: 'Système de Sécurité Incendie (SSI)',
  desenfumage: 'Désenfumage',
  ria: 'RIA (Robinet d\'Incendie Armé)',
  sprinkler: 'Sprinkler',
  installation_technique: 'Installation technique (chauffage/ventilation)',
  alarme: 'Alarme incendie',
  eclairage_securite: 'Éclairage de sécurité (BAES)',
  porte_coupe_feu: 'Porte coupe-feu',
  installation_electrique: 'Installation électrique',
};

export const LIBELLES_SOUS_TYPE_EXTINCTEUR: Record<string, string> = {
  co2: 'CO2',
  eau_additif: 'Eau + additif',
  poudre: 'Poudre',
};

export const LIBELLES_SOUS_TYPE_SSI: Record<string, string> = {
  A: 'Catégorie A',
  B: 'Catégorie B',
  C: 'Catégorie C',
  D: 'Catégorie D',
  E: 'Catégorie E',
};

export const LIBELLES_SOUS_TYPE_ALARME: Record<string, string> = {
  type_1: 'Type 1',
  type_2a: 'Type 2a',
  type_2b: 'Type 2b',
  type_3: 'Type 3',
  type_4: 'Type 4',
};

// Renvoie le libellé du sous-type en fonction du type d'équipement parent,
// puisque la colonne sous_type est partagée entre extincteurs (CO2/eau/poudre),
// SSI (catégories A-E) et alarmes (types 1 à 4) sans contrainte SQL dédiée.
export function libelleSousType(typeEquipement: string, sousType: string | null): string | null {
  if (!sousType) return null;
  if (typeEquipement === 'extincteur') return LIBELLES_SOUS_TYPE_EXTINCTEUR[sousType] || sousType;
  if (typeEquipement === 'ssi') return LIBELLES_SOUS_TYPE_SSI[sousType] || sousType;
  if (typeEquipement === 'alarme') return LIBELLES_SOUS_TYPE_ALARME[sousType] || sousType;
  return sousType;
}

export const LIBELLES_TYPE_ERP: Record<TypeErp, string> = {
  J: "J — Structures d'accueil pour personnes âgées et handicapées",
  L: "L — Salles d'auditions, conférences, réunions, spectacles, multimédia",
  M: 'M — Magasins de vente, centres commerciaux',
  N: 'N — Restaurants et débits de boissons',
  O: 'O — Hôtels et pensions de famille',
  P: 'P — Salles de danse et salles de jeux',
  R: "R — Établissements d'enseignement, colonies de vacances",
  S: 'S — Bibliothèques, centres de documentation',
  T: "T — Salles d'expositions",
  U: 'U — Établissements de soins',
  V: 'V — Établissements de culte',
  W: 'W — Administrations, banques, bureaux',
  X: 'X — Établissements sportifs couverts',
  Y: 'Y — Musées',
  PA: 'PA — Établissements de plein air',
  CTS: 'CTS — Chapiteaux, tentes et structures',
  SG: 'SG — Structures gonflables',
  PS: 'PS — Parcs de stationnement couverts',
  GA: 'GA — Gares accessibles au public',
  OA: "OA — Hôtels-restaurants d'altitude",
  EF: 'EF — Établissements flottants',
  REF: 'REF — Refuges de montagne',
};
