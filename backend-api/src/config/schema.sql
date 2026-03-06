CREATE TABLE IF NOT EXISTS users (
  
  -- Colonne ID (clé primaire)
  id SERIAL PRIMARY KEY,

    -- Colonne EMAIL (unique et obligatoire)
  email VARCHAR(255) UNIQUE NOT NULL,
  
    -- Colonne PASSWORD (obligatoire)
  password VARCHAR(255) NOT NULL,
  
    -- Colonne NAME (optionnelle)
  name VARCHAR(255),
  
    -- Colonne DATE DE CRÉATION
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Colonne DATE DE MODIFICATION
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

    -- Index sur la colonne email pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Créer une fonction qui met à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger qui s'active avant chaque UPDATE
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users          -- Avant de modifier la table users
FOR EACH ROW                    -- Pour chaque ligne modifiée
EXECUTE FUNCTION update_updated_at_column();
-- Exécuter la fonction définie plus haut