-- == Création de la table posts ==

CREATE TABLE IF NOT EXISTS posts (

    -- ID Unique (c'est UUID qui est auto-généré)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- La clé étrangère (Référence à l'utilisateur)
    user_id UUID NOT NULL,
    
    
    -- Plateforme du réseau social, CHECK est utilisé pour mentionner les valeurs autorisées
    platform VARCHAR(50) NOT NULL 
       CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok')), 

    -- Texte de la publication
    text TEXT NOT NULL,  
    
    -- Images (stockées en JSON)
    images JSONB DEFAULT '[]'::jsonb,  
    
    -- Vidéo (stockée en JSON)
    video JSONB DEFAULT NULL,  

    -- Tags (tags pour la recherche)
    tags TEXT[] DEFAULT ARRAY[]::TEXT[], 

    -- Notes privée de l'utilisateur
    notes TEXT DEFAULT '',  

    -- Date originale de publication sur le réseau social ( c'est optionnel)
    original_date TIMESTAMP WITH TIME ZONE, 
    
    -- Date de création dans SafePost ( c'est automatique)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 

    -- Date de dernière modification (automatique)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);  


-- ===== Ici, je vais documenter la base de donnée =====
COMMENT ON TABLE posts IS 'Publications sauvegardées depuis les réseaux sociaux';
COMMENT ON COLUMN posts.id IS 'Identifiant unique UUID';
COMMENT ON COLUMN posts.user_id IS 'Référence à l''utilisateur propriétaire';
COMMENT ON COLUMN posts.platform IS 'Plateforme: facebook, instagram, twitter, linkedin, tiktok';
COMMENT ON COLUMN posts.text IS 'Texte de la publication';
COMMENT ON COLUMN posts.images IS 'Array d''objets images en JSONB';
COMMENT ON COLUMN posts.video IS 'Objet vidéo en JSONB';
COMMENT ON COLUMN posts.tags IS 'Tags pour recherche';
COMMENT ON COLUMN posts.notes IS 'Notes privées de l''utilisateur';
COMMENT ON COLUMN posts.original_date IS 'Date originale sur le réseau social';
COMMENT ON COLUMN posts.created_at IS 'Date de création dans SafePost';
COMMENT ON COLUMN posts.updated_at IS 'Date de dernière modification';


-- === Index pour performance === --

-- Index sur la clé étrangère : user_id (pour des recherches rapide des posts d'un user)
CREATE INDEX IF NOT EXISTS idx_posts_user_id 
ON posts(user_id);

-- Index composé: user_id + platform (filtre par platform)
CREATE INDEX IF NOT EXISTS idx_posts_user_platform 
ON posts(user_id, platform);

-- Index composé: user_id + created_at (tri chronologique bien sûr)
CREATE INDEX IF NOT EXISTS idx_posts_user_created 
ON posts(user_id, created_at DESC);

-- == Index full-text pour rechercher dans le texte == --

-- Je vais installer l'extension pg-trgm (ça facilite la recherche)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index GIN pour recherche textuelle (iLike performant)
CREATE INDEX IF NOT EXISTS idx_posts_text_search 
ON posts USING gin(text gin_trgm_ops);

-- Idex GIN également pour recherche dans tags 
CREATE INDEX IF NOT EXISTS idx_posts_tags 
ON posts USING gin(tags);

-- ===== LA CLÉS ÉTRANGÈRES ===== --  
ALTER TABLE posts 
ADD CONSTRAINT fk_posts_user 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- == FUNCTION TRIGGER POUR UPDATED_AT ==

-- Créer la fonction trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();