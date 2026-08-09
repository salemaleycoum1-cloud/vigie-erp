-- Vigie ERP — Schéma de base de données
-- Suivi automatisé des vérifications réglementaires incendie pour ERP type M/N, catégories 4-5

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telephone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS etablissements (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type_erp TEXT NOT NULL CHECK (type_erp IN ('M', 'N')),
  categorie INTEGER NOT NULL CHECK (categorie IN (4, 5)),
  capacite_accueil INTEGER,
  adresse TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de référence : types de contrôle et leur périodicité réglementaire
-- Pré-remplie au déploiement, ne dépend pas du client ni de l'établissement
CREATE TABLE IF NOT EXISTS types_controle (
  id SERIAL PRIMARY KEY,
  equipement_type TEXT NOT NULL,
  nom_controle TEXT NOT NULL,
  periodicite_mois INTEGER NOT NULL,
  executant TEXT NOT NULL CHECK (executant IN ('interne', 'technicien_qualifie')),
  reference_reglementaire TEXT
);

INSERT INTO types_controle (equipement_type, nom_controle, periodicite_mois, executant, reference_reglementaire) VALUES
  ('extincteur', 'Contrôle visuel (emplacement, pression, scellé, corrosion)', 3, 'interne', 'MS 38'),
  ('extincteur', 'Vérification complète NF S 61-919', 12, 'technicien_qualifie', 'MS 38'),
  ('extincteur', 'Épreuve hydraulique + reconditionnement', 120, 'technicien_qualifie', 'MS 38'),
  ('ssi', 'Détection, alarme, mise en sécurité — essais fonctionnels', 12, 'technicien_qualifie', 'MS 68 à MS 73'),
  ('desenfumage', 'Ouvrants, volets, moteurs, trappes, asservissements', 12, 'technicien_qualifie', 'MS 68 à MS 73'),
  ('ria', 'Vérification RIA', 12, 'technicien_qualifie', 'MS 14 à MS 17'),
  ('sprinkler', 'Vérification + maintenance APSAD', 12, 'technicien_qualifie', 'Référentiel APSAD'),
  ('installation_technique', 'Chauffage, ventilation, clapets coupe-feu, étanchéité réseaux', 12, 'technicien_qualifie', 'CH 58')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS equipements (
  id SERIAL PRIMARY KEY,
  etablissement_id INTEGER REFERENCES etablissements(id) ON DELETE CASCADE,
  type_equipement TEXT NOT NULL CHECK (type_equipement IN (
    'extincteur', 'ssi', 'desenfumage', 'ria', 'sprinkler', 'installation_technique'
  )),
  libelle TEXT, -- ex "Extincteur CO2 - Hall d'entrée"
  present BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sous-type de l'agent extincteur (pertinent uniquement quand type_equipement = 'extincteur')
-- ALTER idempotent : s'applique aussi si la table existe déjà d'un déploiement précédent
ALTER TABLE equipements ADD COLUMN IF NOT EXISTS sous_type TEXT;

CREATE TABLE IF NOT EXISTS controles_realises (
  id SERIAL PRIMARY KEY,
  equipement_id INTEGER REFERENCES equipements(id) ON DELETE CASCADE,
  type_controle_id INTEGER REFERENCES types_controle(id),
  date_realisation DATE NOT NULL,
  organisme_agree TEXT,
  document_pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vue calculée : dernière échéance connue par (équipement, type de contrôle)
-- DISTINCT ON garde uniquement le contrôle le plus récent pour chaque paire équipement/type de contrôle,
-- pour éviter d'accumuler les anciennes échéances au fil des contrôles marqués comme faits.
CREATE OR REPLACE VIEW echeances AS
SELECT DISTINCT ON (cr.equipement_id, cr.type_controle_id)
  cr.id AS controle_realise_id,
  e.id AS etablissement_id,
  e.nom AS etablissement_nom,
  e.client_id,
  eq.id AS equipement_id,
  eq.libelle AS equipement_libelle,
  eq.type_equipement,
  tc.nom_controle,
  tc.periodicite_mois,
  tc.executant,
  cr.date_realisation,
  (cr.date_realisation + (tc.periodicite_mois || ' months')::interval)::date AS prochaine_echeance,
  eq.sous_type,
  tc.id AS type_controle_id
FROM controles_realises cr
JOIN equipements eq ON cr.equipement_id = eq.id
JOIN etablissements e ON eq.etablissement_id = e.id
JOIN types_controle tc ON cr.type_controle_id = tc.id
ORDER BY cr.equipement_id, cr.type_controle_id, cr.date_realisation DESC;

-- Migration idempotente : dédoublonne types_controle (les ré-exécutions de ce schéma
-- avant l'ajout de la contrainte d'unicité ont pu créer des doublons) et empêche
-- toute nouvelle duplication future.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'types_controle_type_nom_key'
  ) THEN
    -- Réoriente les contrôles déjà enregistrés vers la ligne "canonique" (id le plus bas)
    UPDATE controles_realises cr
    SET type_controle_id = canon.min_id
    FROM types_controle tc
    JOIN (
      SELECT equipement_type, nom_controle, MIN(id) AS min_id
      FROM types_controle
      GROUP BY equipement_type, nom_controle
    ) canon ON canon.equipement_type = tc.equipement_type AND canon.nom_controle = tc.nom_controle
    WHERE cr.type_controle_id = tc.id AND tc.id <> canon.min_id;

    -- Supprime les doublons, ne garde que la ligne avec l'id le plus bas
    DELETE FROM types_controle t
    WHERE EXISTS (
      SELECT 1 FROM types_controle t2
      WHERE t2.equipement_type = t.equipement_type
        AND t2.nom_controle = t.nom_controle
        AND t2.id < t.id
    );

    -- Empêche toute nouvelle duplication à l'avenir
    ALTER TABLE types_controle
      ADD CONSTRAINT types_controle_type_nom_key UNIQUE (equipement_type, nom_controle);
  END IF;
END $$;

-- Migration idempotente : ajoute les nouveaux types d'équipement (alarme, éclairage de
-- sécurité, porte coupe-feu, installation électrique) négligés dans le périmètre initial.
-- On recrée la contrainte CHECK pour inclure les nouvelles valeurs (idempotent : DROP IF EXISTS
-- avant ADD, donc sûr à ré-exécuter).
ALTER TABLE equipements DROP CONSTRAINT IF EXISTS equipements_type_equipement_check;
ALTER TABLE equipements ADD CONSTRAINT equipements_type_equipement_check CHECK (type_equipement IN (
  'extincteur', 'ssi', 'desenfumage', 'ria', 'sprinkler', 'installation_technique',
  'alarme', 'eclairage_securite', 'porte_coupe_feu', 'installation_electrique'
));

INSERT INTO types_controle (equipement_type, nom_controle, periodicite_mois, executant, reference_reglementaire) VALUES
  ('alarme', 'Essais fonctionnels du système d''alarme incendie', 12, 'technicien_qualifie', 'MS 68 à MS 73'),
  ('eclairage_securite', 'Test mensuel du bon fonctionnement (allumage, autonomie visuelle)', 1, 'interne', 'Arrêté du 14 décembre 2011 — article EC 14 — NF C71-830'),
  ('eclairage_securite', 'Vérification semestrielle de l''autonomie de la batterie', 6, 'technicien_qualifie', 'NF C71-830'),
  ('porte_coupe_feu', 'Vérification du fonctionnement (fermeture automatique, étanchéité, joints)', 12, 'technicien_qualifie', 'MS 69 — Arrêté du 25 juin 1980'),
  ('installation_electrique', 'Vérification périodique de l''installation électrique', 12, 'technicien_qualifie', 'Arrêté du 26 décembre 2011 — R.4226-16 — EL 19')
ON CONFLICT DO NOTHING;

-- ============================================================
-- BLOC FORMATION DU PERSONNEL — entité séparée des équipements,
-- car rattachée à une personne, pas à un équipement physique.
-- ============================================================

CREATE TABLE IF NOT EXISTS personnel (
  id SERIAL PRIMARY KEY,
  etablissement_id INTEGER REFERENCES etablissements(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  fonction TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de référence : types de formation, périodicité, et statut réel
-- (obligatoire au sens strict de la loi, ou recommandé) — pré-remplie, ne dépend
-- pas de l'établissement.
CREATE TABLE IF NOT EXISTS types_formation (
  id SERIAL PRIMARY KEY,
  nom_formation TEXT NOT NULL,
  periodicite_mois INTEGER NOT NULL,
  statut TEXT NOT NULL CHECK (statut IN ('obligatoire', 'recommande')),
  reference_reglementaire TEXT,
  UNIQUE (nom_formation)
);

INSERT INTO types_formation (nom_formation, periodicite_mois, statut, reference_reglementaire) VALUES
  ('SSIAP 1', 36, 'obligatoire', 'Arrêté du 2 mai 2005'),
  ('SSIAP 2', 36, 'obligatoire', 'Arrêté du 2 mai 2005'),
  ('SSIAP 3', 36, 'obligatoire', 'Arrêté du 2 mai 2005'),
  ('SST', 24, 'obligatoire', 'R4224-15 (ateliers dangereux / chantiers ≥20 salariés) — sinon recommandation INRS'),
  ('Équipier 1ère intervention / évacuation', 12, 'obligatoire', 'R4227-39 — exercice semestriel obligatoire (>50 pers. ou matières inflammables)'),
  ('Gestes et postures', 36, 'recommande', NULL),
  ('Habilitation électrique H0V B0', 36, 'recommande', 'Norme NF C18-510'),
  ('Carte professionnelle APS (CNAPS)', 60, 'obligatoire', 'Code de la sécurité intérieure L612-20/R612-22 — carte pro valable 5 ans, renouvellement via stage MAC APS')
ON CONFLICT (nom_formation) DO NOTHING;

CREATE TABLE IF NOT EXISTS formations_realisees (
  id SERIAL PRIMARY KEY,
  personnel_id INTEGER REFERENCES personnel(id) ON DELETE CASCADE,
  type_formation_id INTEGER REFERENCES types_formation(id),
  date_realisation DATE NOT NULL,
  organisme_agree TEXT,
  document_pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vue calculée : dernière échéance de formation par (personnel, type de formation),
-- même logique de déduplication que la vue échéances équipements.
CREATE OR REPLACE VIEW echeances_personnel AS
SELECT DISTINCT ON (fr.personnel_id, fr.type_formation_id)
  fr.id AS formation_realisee_id,
  p.id AS personnel_id,
  p.nom AS personnel_nom,
  p.fonction,
  p.etablissement_id,
  tf.id AS type_formation_id,
  tf.nom_formation,
  tf.periodicite_mois,
  tf.statut,
  fr.date_realisation,
  (fr.date_realisation + (tf.periodicite_mois || ' months')::interval)::date AS prochaine_echeance
FROM formations_realisees fr
JOIN personnel p ON fr.personnel_id = p.id
JOIN types_formation tf ON fr.type_formation_id = tf.id
ORDER BY fr.personnel_id, fr.type_formation_id, fr.date_realisation DESC;

CREATE INDEX IF NOT EXISTS idx_formations_date ON formations_realisees(date_realisation);
CREATE INDEX IF NOT EXISTS idx_personnel_etablissement ON personnel(etablissement_id);

-- Contact client de l'établissement, pour les alertes email (en plus de l'admin)
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS contact_nom TEXT;

-- Couverture formation agrégée par établissement — distincte du suivi nominatif
-- détaillé (table personnel/formations_realisees). Sert de vue rapide / argument
-- commercial ("couverture incendie"), PAS de seuil réglementaire.
-- Deux compteurs séparés car la logique de recalcul d'échéance diffère :
-- SST se recycle à 24 mois, formation incendie/extincteurs à une cadence qui
-- dépend du type et de la catégorie ERP (à vérifier au cas par cas, MS 51).
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS effectif_total INTEGER;
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS effectif_forme_sst INTEGER;
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS date_dernier_recyclage_sst DATE;
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS effectif_forme_incendie INTEGER;
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS date_dernier_recyclage_incendie DATE;
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS cadence_incendie_mois INTEGER DEFAULT 12;

-- ============================================================
-- BLOC ALERTES — suivi des alertes déjà envoyées pour éviter les doublons.
-- Une table séparée par cible (équipement / personnel) plutôt qu'une colonne
-- nullable partagée, car l'unicité SQL ne fonctionne pas de façon fiable
-- avec des colonnes NULL dans une contrainte UNIQUE.
-- ============================================================

CREATE TABLE IF NOT EXISTS alertes_envoyees_equipement (
  id SERIAL PRIMARY KEY,
  equipement_id INTEGER REFERENCES equipements(id) ON DELETE CASCADE,
  type_controle_id INTEGER REFERENCES types_controle(id),
  prochaine_echeance DATE NOT NULL,
  seuil TEXT NOT NULL CHECK (seuil IN ('j30', 'j7', 'depasse')),
  envoye_le TIMESTAMP DEFAULT NOW(),
  UNIQUE (equipement_id, type_controle_id, prochaine_echeance, seuil)
);

CREATE TABLE IF NOT EXISTS alertes_envoyees_personnel (
  id SERIAL PRIMARY KEY,
  personnel_id INTEGER REFERENCES personnel(id) ON DELETE CASCADE,
  type_formation_id INTEGER REFERENCES types_formation(id),
  prochaine_echeance DATE NOT NULL,
  seuil TEXT NOT NULL CHECK (seuil IN ('j30', 'j7', 'depasse')),
  envoye_le TIMESTAMP DEFAULT NOW(),
  UNIQUE (personnel_id, type_formation_id, prochaine_echeance, seuil)
);

-- Index utiles pour les requêtes de rappel quotidiennes
CREATE INDEX IF NOT EXISTS idx_controles_date ON controles_realises(date_realisation);
CREATE INDEX IF NOT EXISTS idx_equipements_etablissement ON equipements(etablissement_id);

-- Marque l'établissement de démonstration utilisé en rendez-vous commercial,
-- pour ne jamais le confondre avec un vrai établissement client et pouvoir
-- le réinitialiser sans toucher aux autres données.
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS est_demo BOOLEAN DEFAULT false;

-- ============================================================
-- BLOC AUTHENTIFICATION — deux rôles : admin (accès total) et client
-- (accès restreint à ses propres établissements, via clients.id). Le statut
-- gouverne le verrouillage en écriture après la période d'essai : un client
-- en 'essai' ou 'actif' peut modifier ; un client 'expire' ne peut que lire.
-- ============================================================

CREATE TABLE IF NOT EXISTS comptes (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  mot_de_passe_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'essai' CHECK (statut IN ('essai', 'actif', 'expire')),
  date_debut_essai TIMESTAMP DEFAULT NOW(),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comptes_email ON comptes(email);
CREATE INDEX IF NOT EXISTS idx_comptes_client ON comptes(client_id);

-- Migration idempotente : élargit type_erp de M/N seuls à l'ensemble des types
-- d'ERP réglementaires (arrêté du 25 juin 1980 — types principaux et types
-- spéciaux). DROP IF EXISTS avant ADD, donc sûr à ré-exécuter.
ALTER TABLE etablissements DROP CONSTRAINT IF EXISTS etablissements_type_erp_check;
ALTER TABLE etablissements ADD CONSTRAINT etablissements_type_erp_check CHECK (type_erp IN (
  'J', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y',
  'PA', 'CTS', 'SG', 'PS', 'GA', 'OA', 'EF', 'REF'
));
