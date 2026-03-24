-- ===== CRÉATION TABLE FOLLOWERS =====
CREATE TABLE IF NOT EXISTS followers (
    -- ID unique (UUID auto-généré)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Référence au créateur (influenceur)
    -- Clé étrangère vers la table users
    creator_id UUID NOT NULL,
    
    -- Email du follower (abonné)
    email VARCHAR(255) NOT NULL,
    
    -- Nom du follower (optionnel)
    name VARCHAR(100),
    
    -- Plateformes qui intéressent le follower
    -- Ex: ['tiktok', 'instagram']
    platforms TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Statut de vérification email
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Token de vérification email (expire 24h)
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP WITH TIME ZONE,
    
    -- Token unique pour se désabonner
    unsubscribe_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Nombre d'alertes reçues
    alerts_received INTEGER DEFAULT 0,
    
    -- Date dernière alerte reçue
    last_alert_date TIMESTAMP WITH TIME ZONE,
    
    -- Dates système
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte unique: un email ne peut s'abonner qu'une fois par créateur
    CONSTRAINT unique_follower_per_creator UNIQUE(creator_id, email)
);

-- ===== COMMENTAIRES =====
COMMENT ON TABLE followers IS 'Liste de secours des abonnés pour alertes';
COMMENT ON COLUMN followers.creator_id IS 'UUID du créateur (influenceur)';
COMMENT ON COLUMN followers.email IS 'Email de l''abonné';
COMMENT ON COLUMN followers.platforms IS 'Plateformes suivies par l''abonné';
COMMENT ON COLUMN followers.is_verified IS 'Email vérifié ou non';
COMMENT ON COLUMN followers.unsubscribe_token IS 'Token pour se désabonner';

-- ===== INDEX POUR PERFORMANCES =====

-- Index sur creator_id (recherche rapide des followers d'un créateur)
CREATE INDEX IF NOT EXISTS idx_followers_creator_id 
ON followers(creator_id);

-- Index sur email (recherche par email)
CREATE INDEX IF NOT EXISTS idx_followers_email 
ON followers(email);

-- Index composé: creator_id + is_verified (pour alertes)
CREATE INDEX IF NOT EXISTS idx_followers_creator_verified 
ON followers(creator_id, is_verified);

-- Index sur verification_token (vérification email)
CREATE INDEX IF NOT EXISTS idx_followers_verification_token 
ON followers(verification_token);

-- Index sur unsubscribe_token (désinscription)
CREATE INDEX IF NOT EXISTS idx_followers_unsubscribe_token 
ON followers(unsubscribe_token);

-- Index GIN pour recherche dans platforms
CREATE INDEX IF NOT EXISTS idx_followers_platforms 
ON followers USING gin(platforms);

-- ===== TRIGGER POUR UPDATED_AT =====
-- Met à jour automatiquement updated_at
DROP TRIGGER IF EXISTS update_followers_updated_at ON followers;
CREATE TRIGGER update_followers_updated_at
    BEFORE UPDATE ON followers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

